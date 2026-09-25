// site-kit sözleşme denetimi (saf JS: site repolarında ek araç gerektirmez).
// Statik: zorunlu sayfa/rota dosyaları var mı, rota dosyaları site-kit'i mi kullanıyor, zorunlu işaretler var mı.
// Canlı (--url): her rotayı çağırır, durum/içerik türü/işaretleri kontrol eder.
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, sep } from "node:path";

export const CONTRACT = JSON.parse(readFileSync(new URL("./routes.json", import.meta.url), "utf8"));
const EXT = /\.(tsx|ts|jsx|js|mjs)$/;

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (name === "node_modules" || name.startsWith(".")) continue;
    if (statSync(p).isDirectory()) walk(p, out);
    else if (EXT.test(name)) out.push(p);
  }
  return out;
}

/** app/ altındaki dosya yolunu sözleşme yoluna çevirir: route group'lar atılır, dinamik segmentler [*] olur */
export function toRoutePath(appDir, file) {
  const segs = relative(appDir, file).split(sep);
  segs.pop();
  const clean = segs.filter((s) => !/^\(.*\)$/.test(s) && !s.startsWith("@")).map((s) => (/^\[.*\]$/.test(s) ? "[*]" : s));
  return "/" + clean.join("/");
}

export function findAppDir(root) {
  for (const d of ["src/app", "app"]) if (existsSync(join(root, d))) return join(root, d);
  return null;
}

/** @returns {{ ok: boolean, problems: {id: string, message: string}[], found: {pages: string[], routes: string[]} }} */
export function checkStatic(root) {
  const problems = [];
  const appDir = findAppDir(root);
  if (!appDir) return { ok: false, problems: [{ id: "app-dir", message: "src/app ya da app klasörü yok" }], found: { pages: [], routes: [] } };
  const files = walk(appDir);
  const pages = new Map(), routes = new Map();
  for (const f of files) {
    const base = f.split(sep).pop();
    if (/^page\./.test(base)) pages.set(toRoutePath(appDir, f), f);
    if (/^route\./.test(base)) routes.set(toRoutePath(appDir, f), f);
  }
  for (const p of CONTRACT.pages) if (!pages.has(p)) problems.push({ id: `page:${p}`, message: `zorunlu sayfa yok: ${p}` });
  for (const r of CONTRACT.routes) {
    const f = routes.get(r);
    if (!f) { problems.push({ id: `route:${r}`, message: `zorunlu rota yok: ${r} (route.ts)` }); continue; }
    if (!readFileSync(f, "utf8").includes("@mu-media/site-kit")) problems.push({ id: `kit:${r}`, message: `${r} site-kit'i kullanmıyor (sözleşme rotaları yeniden yazılmaz)` });
  }
  const srcRoot = existsSync(join(root, "src")) ? join(root, "src") : root;
  const all = walk(srcRoot).map((f) => [f, readFileSync(f, "utf8")]);
  for (const m of CONTRACT.markers) {
    if (m.file === "proxy") {
      const pf = ["src/proxy.ts", "src/proxy.js", "proxy.ts", "proxy.js"].map((x) => join(root, x)).find(existsSync);
      if (!pf || !readFileSync(pf, "utf8").includes(m.must)) problems.push({ id: m.id, message: `proxy.ts ${m.must} kullanmıyor: ${m.why}` });
    } else if (!all.some(([, c]) => c.includes(m.anywhere))) {
      problems.push({ id: m.id, message: `${m.anywhere} hiçbir yerde kullanılmıyor: ${m.why}` });
    }
  }
  return { ok: problems.length === 0, problems, found: { pages: [...pages.keys()].sort(), routes: [...routes.keys()].sort() } };
}

/** Canlı denetim. fetchImpl test için enjekte edilebilir. */
export async function checkLive(base, fetchImpl = fetch) {
  const problems = [];
  const u = (p) => new URL(p, base).toString();
  const get = async (p, init) => {
    try { const r = await fetchImpl(u(p), { redirect: "manual", ...init }); return { r, body: await r.text() }; }
    catch (e) { return { r: null, body: String(e) }; }
  };
  const expect = (id, cond, message) => { if (!cond) problems.push({ id, message }); };

  const home = await get("/");
  expect("live:/", home.r?.status === 200, `/ ${home.r?.status ?? "ulaşılamadı"}`);
  expect("live:consent-defaults", home.body.includes("ne-consent-defaults"), "ana sayfada Consent Mode varsayılan scripti yok");
  expect("live:newsletter", home.body.includes("data-ne-newsletter"), "ana sayfada bülten formu yok");

  for (const p of ["/hakkimizda", "/iletisim", "/gizlilik", "/kvkk", "/cerez-politikasi", "/bulten/onaylandi", "/bulten/ayrildi"]) {
    const { r } = await get(p);
    expect(`live:${p}`, r?.status === 200, `${p} ${r?.status ?? "ulaşılamadı"}`);
  }
  const xmlish = [["/sitemap.xml", /xml/], ["/sitemap-posts.xml", /xml/], ["/news-sitemap.xml", /xml/], ["/rss.xml", /xml/], ["/robots.txt", /text\/plain/], ["/llms.txt", /text\/plain/]];
  for (const [p, ct] of xmlish) {
    const { r } = await get(p);
    expect(`live:${p}`, r?.status === 200 && ct.test(r.headers.get("content-type") ?? ""), `${p} ${r?.status ?? "ulaşılamadı"} ${r?.headers.get("content-type") ?? ""}`);
  }
  const ads = await get("/ads.txt");
  expect("live:/ads.txt", ads.r?.status === 200 || ads.r?.status === 404, `/ads.txt ${ads.r?.status}`);

  const rev = await get("/api/revalidate", { method: "POST", headers: { "x-ne-secret": "yanlis-sifre", "content-type": "application/json" }, body: "{}" });
  expect("live:revalidate-401", rev.r?.status === 401, `/api/revalidate yanlış şifreye ${rev.r?.status} döndü (401 olmalı)`);
  const nl = await get("/api/newsletter", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "gecersiz" }) });
  expect("live:newsletter-400", nl.r?.status === 400, `/api/newsletter geçersiz gövdeye ${nl.r?.status} döndü (400 olmalı)`);

  // RSS'ten ilk yazıyı bul, JSON-LD ve bülten formunu kontrol et
  const rss = await get("/rss.xml");
  const link = rss.body.match(/<item>[\s\S]*?<link>([^<]+)<\/link>/)?.[1];
  if (link) {
    const path = new URL(link).pathname;
    const art = await get(path);
    expect("live:article", art.r?.status === 200, `yazı ${path} ${art.r?.status}`);
    expect("live:article-jsonld", /application\/ld\+json[\s\S]*"@graph"/.test(art.body), `yazıda JSON-LD @graph yok (${path})`);
    expect("live:article-newsletter", art.body.includes("data-ne-newsletter"), `yazıda bülten formu yok (${path})`);
  } else {
    problems.push({ id: "live:article-skip", message: "RSS'te yazı yok; yazı sayfası denetlenemedi (engine'de yayınlanmış yazı olmalı)", warn: true });
  }
  const hard = problems.filter((p) => !p.warn);
  return { ok: hard.length === 0, problems };
}
