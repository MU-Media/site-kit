# @mu-media/site-kit

MU-Media sitelerinin ortak "boru tesisatı". Tasarım içermez; her sitenin kendi reposundaki tasarım bu paketin üstüne oturur.

engine içeriği üretir ve herkese açık bir API'yle sunar. site-kit o API'yi okur ve her sitede aynı olması gereken işleri yapar: SEO/GEO, feed'ler, çerez onayı, bülten, yayın bildirimi, 410. Sözleşmenin tek doğru kaynağı: `MU-Media/engine` → `docs/decisions/headless-contract.md`.

## Kurulum

```bash
pnpm add "@mu-media/site-kit@github:MU-Media/site-kit#v0.1.0"
```
`next.config.ts`: `transpilePackages: ["@mu-media/site-kit"]` (paket TypeScript kaynağı olarak gelir, derleme adımı yok).

## Ortam değişkenleri

| Değişken | Örnek | Ne |
|---|---|---|
| `NE_ENGINE_URL` | `https://engine.ornek.com` | engine tabanı |
| `NE_SITE_SLUG` | `pokemon` | engine'deki site kimliği |
| `NEXT_PUBLIC_SITE_URL` | `https://ornek.com` | kanonik adres |
| `NE_REVALIDATE_SECRET` | (engine `site:connect` üretir) | `/api/revalidate` şifresi |

## Dışa aktarılanlar (her biri tek satır örnek)

| Yol | Örnek |
|---|---|
| `/client` | `const page = await orFallback(engine().listArticles({ limit: 12 }), EMPTY_PAGE)` |
| `/config` | `const { siteUrl } = siteEnv()` |
| `/seo` | `export const generateMetadata = async () => articleMetadata(site, article)` · `<JsonLd data={articleLd(site, siteUrl, article)} />` |
| `/routes` | `export const GET = rss()` · `export const POST = revalidate()` · `export const POST = newsletterProxy()` |
| `/proxy` | `export const proxy = goneProxy()` (geri çekilen yazı → 410) |
| `/components` | `<ArticleBody markdown={a.bodyMarkdown} />` · `<NewsletterForm source="yazi-sonu" />` · `<ConsentProvider ga4={..}><ConsentBanner /></ConsentProvider>` · `<LegalPage kind="kvkk" site={site} />` |
| `/contract` | `REQUIRED_PAGES`, `REQUIRED_ROUTES` |
| `/markdown` | `renderMarkdown(md)` |
| `/styles.css` | `import "@mu-media/site-kit/styles.css"` (sadece işlevsel taban; görünüm sitenin) |

Rota fabrikaları: `sitemapIndex`, `sitemapPosts`, `newsSitemap`, `rss`, `robots`, `llmsTxt`, `adsTxt`, `revalidate`, `newsletterProxy`.

## Sözleşme denetimi

```bash
pnpm exec site-kit check                          # zorunlu sayfa/rota dosyaları ve işaretler
pnpm exec site-kit check --url http://localhost:3100   # + canlı denetim
pnpm exec site-kit routes                         # zorunlu listeyi göster
```
Denetleyicinin kendisi `fixtures/contract/` ile kalibre edilir: uyumlu ağaç geçmeli, bozuk ağaç tam olarak bilinen sorunları bulmalı. Yeni kural = önce onu ihlal eden fixture.

## Engine olmadan tasarım

```bash
node node_modules/@mu-media/site-kit/scripts/mock-engine.mjs --port 4010 --site ornek
NE_ENGINE_URL=http://localhost:4010 NE_SITE_SLUG=ornek NEXT_PUBLIC_SITE_URL=http://localhost:3100 pnpm dev
```
engine'e ulaşılamazsa sayfalar çökmez, boş durumla çizilir (`orFallback`, `siteOrFallback`).

## Sürümleme

- Semver etiketleri (`v0.1.0`). Siteler bir etikete sabitlenir, `main`'e değil.
- Geriye uyumsuz değişiklik = major sürüm + `CHANGELOG.md` kaydı + sözleşme belgesinin güncellenmesi.
- Bu repo açıktır: sır, içerik ya da müşteri verisi girmez.
