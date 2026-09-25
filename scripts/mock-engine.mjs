#!/usr/bin/env node
// Sahte engine: sözleşmedeki herkese açık API'yi örnek veriyle sunar. Tasarım oturumları engine olmadan çalışabilsin diye.
// Kullanım: node scripts/mock-engine.mjs [--port 4010] [--site pokemon]
//   Site: NE_ENGINE_URL=http://localhost:4010 NE_SITE_SLUG=pokemon
//   /api/public/sites/<site>/articles/geri-cekilen-yazi → 410 (proxy denemesi için)
import { createServer } from "node:http";

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const PORT = Number(arg("--port", 4010));
const SLUG = arg("--site", "pokemon");
const now = Date.now();
const iso = (h) => new Date(now - h * 3600_000).toISOString();
const img = (seed, w = 1600, h = 900) => ({ url: `https://picsum.photos/seed/${seed}/${w}/${h}`, width: w, height: h, alt: "Örnek kapak", sizes: { card: `https://picsum.photos/seed/${seed}/800/450`, og: `https://picsum.photos/seed/${seed}/1200/630` } });

const site = {
  slug: SLUG, name: "Örnek Yayın", description: "Bağımsız, Türkçe ve meraklı bir niş yayın.", locale: "tr-TR", domains: ["localhost"], frontendUrl: "http://localhost:3100",
  categories: [{ slug: "haberler", name: "Haberler" }, { slug: "rehber", name: "Rehberler" }, { slug: "yorum", name: "Yorum" }],
  authors: [{ slug: "deniz", name: "Deniz", bio: "Editoryal persona. Kartlar, oyunlar, topluluk.", persona: true }],
  organization: { name: "Örnek Yayın", sameAs: [] }, analytics: {}, ads: {},
  legal: { personaDisclosure: true }, contactEmail: "iletisim@ornek.test", newsletter: { enabled: true },
};
const body = `Bu, tasarım oturumları için **örnek** bir yazıdır. Gerçek içerik engine'den gelir.

## Ara başlık

Paragraflar, [bağlantılar](https://example.com) ve listeler:

- Birinci madde
- İkinci madde

> Alıntılar da desteklenir.

## İkinci bölüm

Uzun okuma deneyimini görmek için birkaç paragraf daha. Tipografi, satır uzunluğu ve boşluklar burada test edilir.`;
const mk = (i, cat, type, title) => ({
  slug: `ornek-yazi-${i}`, title, meta: `${title} hakkında kısa bir özet: meta açıklama ve kart metni olarak kullanılır.`, type,
  category: site.categories.find((c) => c.slug === cat), author: { slug: "deniz", name: "Deniz" }, cover: i % 4 === 3 ? null : img(`ne${i}`),
  publishedAt: iso(i * 5), updatedAt: iso(i * 5 - 1), bodyMarkdown: body,
  sources: [{ title: "Resmi duyuru", url: "https://example.com/duyuru" }, { title: "Uzman kaynak", url: "https://example.org/haber" }],
  faq: type === "rehber" ? [{ q: "Bu bir örnek soru mu?", a: "Evet, SSS bileşenini görmek için." }] : [],
});
const articles = [
  mk(1, "haberler", "haber", "Yeni set 6 Kasım'da geliyor, iki yarım Stadium kartıyla"),
  mk(2, "yorum", "kose", "Bizim mağazamız hâlâ kargo takip ekranı"),
  mk(3, "rehber", "rehber", "Kart grading nedir, göndermeye değer mi?"),
  mk(4, "haberler", "hype", "Sahte sanılan üç kart gerçek çıktı"),
  mk(5, "haberler", "haber", "Turnuva kayıtları açıldı: tarih, saat ve kurallar"),
  mk(6, "rehber", "rehber", "Booster box mı ETB mi? Hangi ürünü almalı"),
];
const summary = ({ bodyMarkdown, sources, faq, ...s }) => s;

const send = (res, status, data) => {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*", "Cache-Control": "public, s-maxage=60" });
  res.end(JSON.stringify(data));
};

createServer(async (req, res) => {
  const u = new URL(req.url, `http://localhost:${PORT}`);
  const base = `/api/public/sites/${SLUG}`;
  if (u.pathname === base) return send(res, 200, site);
  if (u.pathname === `${base}/articles`) {
    let list = articles;
    for (const k of ["category", "type"]) { const v = u.searchParams.get(k); if (v) list = list.filter((a) => (k === "category" ? a.category.slug : a[k]) === v); }
    const author = u.searchParams.get("author"); if (author) list = list.filter((a) => a.author?.slug === author);
    const limit = Number(u.searchParams.get("limit") ?? 20), page = Number(u.searchParams.get("page") ?? 1);
    return send(res, 200, { docs: list.slice((page - 1) * limit, page * limit).map(summary), totalDocs: list.length, page, totalPages: Math.ceil(list.length / limit) });
  }
  const m = u.pathname.match(new RegExp(`^${base}/articles/([^/]+)$`));
  if (m) {
    if (m[1] === "geri-cekilen-yazi") return send(res, 410, { status: "retracted" });
    const a = articles.find((x) => x.slug === decodeURIComponent(m[1]));
    return a ? send(res, 200, a) : send(res, 404, { error: "yok" });
  }
  if (u.pathname === `${base}/sitemap`) return send(res, 200, { articles: articles.map((a) => ({ slug: a.slug, category: a.category.slug, publishedAt: a.publishedAt, updatedAt: a.updatedAt })), categories: site.categories.map((c) => c.slug), authors: ["deniz"] });
  if (u.pathname === `${base}/newsletter/subscribe` && req.method === "POST") {
    let raw = ""; for await (const c of req) raw += c;
    const b = JSON.parse(raw || "{}");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(b.email ?? "") || b.consent !== true) return send(res, 400, { error: "Geçersiz kayıt." });
    console.log(`bülten kaydı: ${b.email} kaynak=${b.source ?? "-"} rıza="${(b.consentText ?? "").slice(0, 40)}…"`);
    return send(res, 200, { status: b.email.startsWith("var@") ? "already" : "pending" });
  }
  send(res, 404, { error: "bilinmeyen uç nokta", path: u.pathname });
}).listen(PORT, () => console.log(`sahte engine: http://localhost:${PORT}  (site: ${SLUG})`));
