import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { createEngineClient } from "../src/client";
import { adsTxt, newsletterProxy, revalidate, rss, robots, secretMatches, sitemapPosts, validateNewsletter } from "../src/routes";
import type { SiteEnv } from "../src/config";

const env: SiteEnv = { engineUrl: "https://e.test", site: "pokemon", revalidateSecret: "s3cret-uzun", siteUrl: "https://ornek.com" };
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const SITE = { slug: "pokemon", name: "Ornek & Co", description: "d", locale: "tr-TR", domains: ["ornek.com"], frontendUrl: null, categories: [{ slug: "tcg", name: "Kart" }], authors: [], organization: { name: "Ornek", sameAs: [] }, analytics: {}, ads: {}, legal: { personaDisclosure: true }, newsletter: { enabled: true } };
const ART = { slug: "delta", title: "Delta <Reign>", meta: "m", type: "haber", category: { slug: "tcg", name: "Kart" }, author: { slug: "deniz", name: "Deniz" }, cover: null, publishedAt: "2026-09-24T10:00:00Z", updatedAt: "2026-09-24T11:00:00Z" };

function mockEngine() {
  return vi.fn(async (url: string, init?: RequestInit) => {
    if (url.endsWith("/newsletter/subscribe")) return json(200, { status: "pending", echoIp: new Headers(init?.headers).get("x-forwarded-for") });
    if (url.includes("/articles")) return json(200, { docs: [ART], totalDocs: 1, page: 1, totalPages: 1 });
    if (url.endsWith("/sitemap")) return json(200, { articles: [{ slug: "delta", category: "tcg", publishedAt: ART.publishedAt, updatedAt: ART.updatedAt }], categories: ["tcg"], authors: ["deniz"] });
    return json(200, SITE);
  });
}
const deps = (f = mockEngine()) => ({ env, client: createEngineClient({ engineUrl: env.engineUrl, site: env.site, fetch: f as unknown as typeof fetch }) });

describe("revalidate", () => {
  it("yanlış ya da eksik şifreye 401, doğruya 200 ve etiketleri anında sona erdirir", async () => {
    const tags: [string, unknown][] = []; const paths: string[] = [];
    const h = revalidate({ ...deps(), revalidateTag: ((t: string, p: unknown) => void tags.push([t, p])) as any, revalidatePath: ((p: string) => void paths.push(p)) as any });
    const req = (secret?: string) => new Request("https://ornek.com/api/revalidate", { method: "POST", headers: secret ? { "x-ne-secret": secret } : {}, body: JSON.stringify({ type: "article", slug: "delta", category: "tcg", status: "retracted" }) });
    expect((await h(req())).status).toBe(401);
    expect((await h(req("yanlis"))).status).toBe(401);
    expect(tags).toEqual([]);
    const ok = await h(req("s3cret-uzun"));
    expect(ok.status).toBe(200);
    expect(tags.map((t) => t[0])).toContain("ne:article:delta");
    expect(tags.every((t) => (t[1] as { expire: number }).expire === 0)).toBe(true);
    expect(paths).toEqual(["/", "/kategori/tcg", "/tcg/delta"]);
  });
  it("sırrı tanımlı olmayan site her isteği reddeder", () => {
    expect(secretMatches("x", undefined)).toBe(false);
    expect(secretMatches(null, "x")).toBe(false);
  });
});

describe("bülten", () => {
  it("doğrulama: e-posta biçimi ve açık rıza zorunlu", () => {
    expect(validateNewsletter({ email: "a@b.co", consent: true })).toEqual({ ok: true, value: { email: "a@b.co", consent: true } });
    expect(validateNewsletter({ email: " A@B.CO ", consent: true, source: "/x" })).toMatchObject({ ok: true, value: { email: "a@b.co", source: "/x" } });
    expect(validateNewsletter({ email: "gecersiz", consent: true }).ok).toBe(false);
    expect(validateNewsletter({ email: "a@b.co" }).ok).toBe(false);
    expect(validateNewsletter(null).ok).toBe(false);
  });
  it("vekil: bal küpü engine'e gitmez; geçerli istek IP ile iletilir; 429 korunur", async () => {
    const f = mockEngine();
    const h = newsletterProxy(deps(f));
    const post = (body: unknown, ip = "1.2.3.4") => new Request("https://ornek.com/api/newsletter", { method: "POST", headers: { "x-forwarded-for": `${ip}, 10.0.0.1` }, body: JSON.stringify(body) });
    const bot = await h(post({ email: "a@b.co", consent: true, hp: "http://spam" }));
    expect(await bot.json()).toEqual({ status: "pending" });
    expect(f).not.toHaveBeenCalled();
    expect((await h(post({ email: "x" }))).status).toBe(400);
    const ok = await h(post({ email: "a@b.co", consent: true }));
    expect(await ok.json()).toEqual({ status: "pending" });
    const call = f.mock.calls.find((c) => String(c[0]).endsWith("/subscribe"))!;
    const sent = new Headers(call[1]!.headers);
    expect(sent.get("x-forwarded-for")).toBe("1.2.3.4");
    // ziyaretçi IP'si site sırrıyla imzalı gider (engine hız sınırı için)
    expect(sent.get("x-ne-client-ip")).toBe("1.2.3.4");
    const ts = sent.get("x-ne-ts")!;
    expect(sent.get("x-ne-sig")).toBe(createHmac("sha256", env.revalidateSecret!).update(`pokemon.1.2.3.4.${ts}`).digest("hex"));
    const limited = newsletterProxy(deps(vi.fn(async () => json(429, { error: "çok" })) as any));
    expect((await limited(post({ email: "a@b.co", consent: true }))).status).toBe(429);
  });
});

describe("feed'ler", () => {
  it("rss XML kaçışlı ve mutlak URL'li", async () => {
    const r = await rss(deps())();
    const body = await r.text();
    expect(r.headers.get("content-type")).toMatch(/rss\+xml/);
    expect(body).toContain("<title>Delta &lt;Reign&gt;</title>");
    expect(body).toContain("<link>https://ornek.com/tcg/delta</link>");
    expect(body).toContain("<title>Ornek &amp; Co</title>");
  });
  it("sitemap-posts statik sayfaları ve yazıları içerir", async () => {
    const body = await (await sitemapPosts(deps())()).text();
    expect(body).toContain("https://ornek.com/kategori/tcg");
    expect(body).toContain("https://ornek.com/yazar/deniz");
    expect(body).toContain("<loc>https://ornek.com/tcg/delta</loc><lastmod>2026-09-24T11:00:00Z</lastmod>");
  });
  it("robots yapay zekâ tarayıcılarına açık ve sitemap'i gösterir; ads.txt kimlik yoksa 404", async () => {
    const body = await (await robots(deps())()).text();
    expect(body).toContain("User-agent: ClaudeBot");
    expect(body).toContain("Sitemap: https://ornek.com/sitemap.xml");
    expect((await adsTxt(deps())()).status).toBe(404);
  });
});

describe("bülten sözleşme ayrıntıları", () => {
  it("rıza metni iletilir ve 1000 karakterle sınırlanır; 403 korunur", async () => {
    expect(validateNewsletter({ email: "a@b.co", consent: true, consentText: "x".repeat(2000) })).toMatchObject({ ok: true, value: { consentText: "x".repeat(1000) } });
    const f = vi.fn(async () => json(403, { error: "Bu sitede bülten kapalı." }));
    const h = newsletterProxy(deps(f as any));
    const r = await h(new Request("https://ornek.com/api/newsletter", { method: "POST", body: JSON.stringify({ email: "a@b.co", consent: true, consentText: "rıza" }) }));
    expect(r.status).toBe(403);
    expect(await r.json()).toEqual({ error: "Bu sitede bülten kapalı." });
    expect(JSON.parse(String((f.mock.calls[0] as any)[1].body)).consentText).toBe("rıza");
  });
});
