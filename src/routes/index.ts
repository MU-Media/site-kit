import { createHmac, timingSafeEqual } from "node:crypto";
import { revalidatePath, revalidateTag } from "next/cache";
import { createEngineClient, EMPTY_PAGE, EMPTY_SITEMAP, fallbackSite, orFallback, TAGS, type EngineClient } from "../client";
import { absUrl, siteEnv, type SiteEnv } from "../config";
import type { PublicSite, RevalidatePayload } from "../types";
import { lang, textResponse, xmlEscape, xmlResponse } from "../util/xml";

/**
 * Rota fabrikaları: sitenin rota dosyası tek satırdır.
 *   // src/app/rss.xml/route.ts
 *   export const GET = rss();
 * Bağımlılıklar test için enjekte edilebilir; varsayılan ortam değişkenleridir.
 */
export interface RouteDeps {
  env?: SiteEnv;
  client?: EngineClient;
}

function ctx(deps: RouteDeps = {}) {
  const env = deps.env ?? siteEnv();
  const client = deps.client ?? createEngineClient({ engineUrl: env.engineUrl, site: env.site });
  const site = () => orFallback(client.getSite(), fallbackSite(env.site));
  return { env, client, site, abs: (p: string) => absUrl(env.siteUrl, p) };
}

/** /sitemap.xml: yazılar + haber sitemap'i */
export const sitemapIndex = (deps?: RouteDeps) => async () => {
  const { abs } = ctx(deps);
  const maps = ["/sitemap-posts.xml", "/news-sitemap.xml"];
  return xmlResponse(`<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${maps.map((m) => `  <sitemap><loc>${abs(m)}</loc></sitemap>`).join("\n")}
</sitemapindex>`);
};

/** /sitemap-posts.xml: ana sayfa, kategoriler, yazarlar, yasal sayfalar, tüm yazılar */
export const sitemapPosts = (deps?: RouteDeps) => async () => {
  const { client, abs } = ctx(deps);
  const sm = await orFallback(client.getSitemap(), EMPTY_SITEMAP);
  const statics = ["/", ...sm.categories.map((c) => `/kategori/${c}`), ...sm.authors.map((a) => `/yazar/${a}`), "/hakkimizda", "/iletisim"];
  return xmlResponse(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${statics.map((u) => `  <url><loc>${xmlEscape(abs(u))}</loc></url>`).join("\n")}
${sm.articles.map((a) => `  <url><loc>${xmlEscape(abs(`/${a.category}/${a.slug}`))}</loc><lastmod>${a.updatedAt}</lastmod></url>`).join("\n")}
</urlset>`);
};

/** /news-sitemap.xml: Google News, son 48 saat, en fazla 1000 URL */
export const newsSitemap = (deps?: RouteDeps & { now?: () => number }) => async () => {
  const { client, site, abs } = ctx(deps);
  const [s, sm] = await Promise.all([site(), orFallback(client.getSitemap(), EMPTY_SITEMAP)]);
  const since = (deps?.now?.() ?? Date.now()) - 48 * 3600_000;
  const recent = sm.articles.filter((a) => Date.parse(a.publishedAt) >= since).slice(0, 1000);
  const page = recent.length ? await orFallback(client.listArticles({ limit: 100 }), EMPTY_PAGE) : EMPTY_PAGE;
  const titles = new Map(page.docs.map((d) => [d.slug, d.title]));
  return xmlResponse(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${recent
  .map(
    (a) => `  <url>
    <loc>${xmlEscape(abs(`/${a.category}/${a.slug}`))}</loc>
    <news:news>
      <news:publication><news:name>${xmlEscape(s.name)}</news:name><news:language>${lang(s.locale)}</news:language></news:publication>
      <news:publication_date>${a.publishedAt}</news:publication_date>
      <news:title>${xmlEscape(titles.get(a.slug) ?? a.slug)}</news:title>
    </news:news>
  </url>`,
  )
  .join("\n")}
</urlset>`);
};

/** /rss.xml: son 50 yazı */
export const rss = (deps?: RouteDeps) => async () => {
  const { client, site, abs } = ctx(deps);
  const [s, page] = await Promise.all([site(), orFallback(client.listArticles({ limit: 50 }), EMPTY_PAGE)]);
  const host = new URL(abs("/")).hostname;
  return xmlResponse(
    `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${xmlEscape(s.name)}</title>
  <link>${abs("/")}</link>
  <description>${xmlEscape(s.description)}</description>
  <language>${lang(s.locale)}</language>
  <atom:link href="${abs("/rss.xml")}" rel="self" type="application/rss+xml"/>
${page.docs
  .map((a) => {
    const url = xmlEscape(abs(`/${a.category.slug}/${a.slug}`));
    return `  <item>
    <title>${xmlEscape(a.title)}</title>
    <link>${url}</link>
    <guid isPermaLink="true">${url}</guid>
    <description>${xmlEscape(a.meta)}</description>
    <category>${xmlEscape(a.category.name)}</category>
    ${a.author ? `<author>noreply@${host} (${xmlEscape(a.author.name)})</author>` : ""}
    <pubDate>${new Date(a.publishedAt).toUTCString()}</pubDate>
  </item>`;
  })
  .join("\n")}
</channel>
</rss>`,
    "application/rss+xml",
  );
};

/** Arama motorları ve yapay zekâ tarayıcıları açık (GEO) */
export const AI_BOTS = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot", "PerplexityBot", "Google-Extended", "Applebot-Extended"];

export const robots = (deps?: RouteDeps) => async () => {
  const { abs } = ctx(deps);
  return textResponse(
    ["User-agent: *", "Allow: /", "Disallow: /api/", "", ...AI_BOTS.flatMap((b) => [`User-agent: ${b}`, "Allow: /", ""]), `Sitemap: ${abs("/sitemap.xml")}`, ""].join("\n"),
  );
};

/** /llms.txt: sitenin kısa tanımı + kategori ve son yazı linkleri */
export const llmsTxt = (deps?: RouteDeps) => async () => {
  const { client, site, abs } = ctx(deps);
  const [s, page] = await Promise.all([site(), orFallback(client.listArticles({ limit: 30 }), EMPTY_PAGE)]);
  return textResponse(
    [
      `# ${s.name}`, "", `> ${s.description}`, "",
      "## Kategoriler", ...s.categories.map((c) => `- [${c.name}](${abs(`/kategori/${c.slug}`)})`), "",
      "## Son yazılar", ...page.docs.map((a) => `- [${a.title}](${abs(`/${a.category.slug}/${a.slug}`)}): ${a.meta}`), "",
    ].join("\n"),
  );
};

/** /ads.txt: AdSense yayıncı kimliği yoksa 404 */
export const adsTxt = (deps?: RouteDeps) => async () => {
  const { site } = ctx(deps);
  const pub = (await site()).ads?.adsensePublisherId;
  if (!pub) return textResponse("Not found", 404);
  return textResponse(`google.com, ${pub.replace(/^ca-/, "")}, DIRECT, f08c47fec0942fa0\n`);
};

// ---------------- revalidate ----------------

export function secretMatches(given: string | null, expected: string | undefined): boolean {
  if (!expected || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * POST /api/revalidate (engine → site). Başlık x-ne-secret yanlışsa 401.
 * Geri çekilen yazının hemen 410 dönmesi için etiketler anında sona erdirilir (expire: 0).
 */
export const revalidate = (deps?: RouteDeps & { revalidateTag?: typeof revalidateTag; revalidatePath?: typeof revalidatePath }) =>
  async (req: Request) => {
    const { env } = ctx(deps);
    if (!secretMatches(req.headers.get("x-ne-secret"), env.revalidateSecret)) {
      return Response.json({ error: "yetkisiz" }, { status: 401 });
    }
    let body: Partial<RevalidatePayload>;
    try {
      body = (await req.json()) as Partial<RevalidatePayload>;
    } catch {
      return Response.json({ error: "geçersiz gövde" }, { status: 400 });
    }
    const rt = deps?.revalidateTag ?? revalidateTag;
    const rp = deps?.revalidatePath ?? revalidatePath;
    const now = { expire: 0 };
    rt(TAGS.articles, now);
    rt(TAGS.sitemap, now);
    rt(TAGS.site, now);
    if (body.slug) rt(TAGS.article(body.slug), now);
    rp("/");
    if (body.category) rp(`/kategori/${body.category}`);
    if (body.slug && body.category) rp(`/${body.category}/${body.slug}`);
    return Response.json({ revalidated: true, slug: body.slug ?? null });
  };

// ---------------- bülten vekili ----------------

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type NewsletterInput = { email: string; consent: true; source?: string; hp?: string; consentText?: string };

/** İstemci gövdesini doğrular; hata mesajı Türkçe */
export function validateNewsletter(body: unknown): { ok: true; value: NewsletterInput } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "Geçersiz istek." };
  const b = body as Record<string, unknown>;
  const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
  if (!EMAIL_RE.test(email) || email.length > 254) return { ok: false, error: "Geçerli bir e-posta adresi yaz." };
  if (b.consent !== true) return { ok: false, error: "Devam etmek için onay kutusunu işaretlemelisin." };
  const source = typeof b.source === "string" ? b.source.slice(0, 200) : undefined;
  const hp = typeof b.hp === "string" ? b.hp : undefined;
  // Formda gösterilen rıza metni engine'de rıza kaydıyla birlikte saklanır (KVKK ispat yükü)
  const consentText = typeof b.consentText === "string" ? b.consentText.trim().slice(0, 1000) : undefined;
  return { ok: true, value: { email, consent: true, ...(source ? { source } : {}), ...(hp ? { hp } : {}), ...(consentText ? { consentText } : {}) } };
}

export function clientIp(req: Request): string | undefined {
  const xff = req.headers.get("x-forwarded-for");
  return xff?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || undefined;
}

/**
 * Ziyaretçi IP'sini engine'e imzalı iletir. Engine'in gördüğü IP bu sitenin sunucusudur;
 * imza olmadan bütün ziyaretçiler aynı hız sınırını paylaşırdı (engine kod incelemesi #2).
 * İmza: HMAC-SHA256(NE_REVALIDATE_SECRET, "<site>.<ip>.<unix saniye>"), engine 5 dk içinde kabul eder.
 */
export function signedIpHeaders(site: string, ip: string, secret: string | undefined, nowS = Math.floor(Date.now() / 1000)): Record<string, string> {
  if (!secret) return { "x-forwarded-for": ip };
  const sig = createHmac("sha256", secret).update(`${site}.${ip}.${nowS}`).digest("hex");
  return { "x-forwarded-for": ip, "x-ne-client-ip": ip, "x-ne-ts": String(nowS), "x-ne-sig": sig };
}

/**
 * POST /api/newsletter: aynı kökenden form gönderimi → engine subscribe.
 * Bal küpü (hp) doluysa engine'e gitmeden sahte "pending" döner (bot).
 */
export const newsletterProxy = (deps?: RouteDeps) => async (req: Request) => {
  const { client, env } = ctx(deps);
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return Response.json({ error: "Geçersiz istek." }, { status: 400 });
  }
  const v = validateNewsletter(raw);
  if (!v.ok) return Response.json({ error: v.error }, { status: 400 });
  if (v.value.hp) return Response.json({ status: "pending" });
  const ip = clientIp(req);
  try {
    const { httpStatus, data } = await client.subscribe(v.value, ip ? signedIpHeaders(env.site, ip, env.revalidateSecret) : {});
    if (httpStatus === 429) return Response.json({ error: data.error ?? "Çok fazla deneme. Biraz sonra tekrar dene." }, { status: 429 });
    if (httpStatus === 403) return Response.json({ error: data.error ?? "Bu sitede bülten şu an kapalı." }, { status: 403 });
    if (httpStatus >= 400) return Response.json({ error: data.error ?? "Kayıt şu an alınamadı." }, { status: httpStatus >= 500 ? 502 : httpStatus });
    return Response.json({ status: data.status === "already" ? "already" : "pending" });
  } catch {
    return Response.json({ error: "Kayıt şu an alınamadı, biraz sonra tekrar dene." }, { status: 502 });
  }
};

export type { PublicSite };
