import { NextResponse, type NextRequest } from "next/server";
import { createEngineClient, fallbackSite, orFallback } from "./client";
import { siteEnv } from "./config";

/**
 * Geri çekilmiş yazı → 410 Gone. Next sayfaları 410 dönemediği için bu iş proxy'de yapılır.
 * Kullanım (src/proxy.ts):
 *   import { goneProxy } from "@mu-media/site-kit/proxy";
 *   export const proxy = goneProxy();
 *   export const config = { matcher: ["/((?!api|_next|kategori|yazar|bulten|favicon\\.ico).*)"] };
 * Sadece /<kategori>/<slug> biçimindeki yollar engine'e sorulur; yanıt 60 sn bellekte tutulur.
 * engine'e ulaşılamazsa istek sayfaya geçer (sayfa kendi 404/410 mantığını çalıştırır).
 */
const TTL_MS = 60_000;
const cache = new Map<string, { at: number; gone: boolean }>();
let siteName: { at: number; name: string } | undefined;

export const RESERVED_FIRST_SEGMENTS = new Set(["api", "_next", "kategori", "yazar", "bulten", "hakkimizda", "iletisim", "gizlilik", "kvkk", "cerez-politikasi"]);

export function isArticlePath(pathname: string): { category: string; slug: string } | null {
  const m = pathname.match(/^\/([^/.]+)\/([^/.]+)\/?$/);
  if (!m || RESERVED_FIRST_SEGMENTS.has(m[1]!)) return null;
  return { category: m[1]!, slug: m[2]! };
}

export const goneHtml = (name: string) =>
  `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="robots" content="noindex"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Yazı kaldırıldı · ${name.replace(/</g, "&lt;")}</title></head><body style="font-family:system-ui,sans-serif;max-width:640px;margin:64px auto;padding:0 16px;line-height:1.6"><h1>Bu yazı yayından kaldırıldı</h1><p>Aradığın yazı artık yayında değil.</p><p><a href="/">Ana sayfaya dön</a></p></body></html>`;

export function goneProxy() {
  return async function proxy(req: NextRequest) {
    const hit = isArticlePath(req.nextUrl.pathname);
    if (!hit) return NextResponse.next();
    let env;
    try { env = siteEnv(); } catch { return NextResponse.next(); }
    const now = Date.now();
    let entry = cache.get(hit.slug);
    if (!entry || now - entry.at > TTL_MS) {
      const client = createEngineClient({ engineUrl: env.engineUrl, site: env.site, timeoutMs: 3000 });
      const r = await orFallback(client.getArticle(hit.slug), { status: "missing" as const });
      entry = { at: now, gone: r.status === "gone" };
      cache.set(hit.slug, entry);
      if (cache.size > 5000) cache.clear();
    }
    if (!entry.gone) return NextResponse.next();
    if (!siteName || now - siteName.at > 5 * TTL_MS) {
      const s = await orFallback(createEngineClient({ engineUrl: env.engineUrl, site: env.site, timeoutMs: 3000 }).getSite(), fallbackSite(env.site));
      siteName = { at: now, name: s.name };
    }
    return new NextResponse(goneHtml(siteName.name), {
      status: 410,
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=0, s-maxage=60" },
    });
  };
}
