# Değişiklik günlüğü

## 0.1.4 (27 Eyl 2026)
- `PublicSite.verification` (google, bing): `rootMetadata` Search Console ve Bing Webmaster doğrulama meta etiketlerini basar. Engine `ne search:connect` kodu alır, doğrular, sahip ekler, sitemap gönderir; yeni sitede elle iş yok.

## 0.1.3 (27 Eyl 2026)
- Yazı gövdesindeki tablolar `.ne-table` kutusuna sarılır (`overflow-x: auto`, tablo en az 36rem, klavyeyle odaklanabilir). Mobilde geniş tablonun son sütunları kesiliyordu.

## 0.1.2 (27 Eyl 2026)
- `renderMarkdown` temizlemeyi `sanitize-html` ile yapar; `isomorphic-dompurify`/jsdom kaldırıldı. jsdom'un ESM-only alt bağımlılıkları Vercel'de yazı sayfasını her istekte 500'e düşürüyordu (#1). Çıktı aynı; `<script>`, `javascript:` linkleri, `on*` özellikleri, `iframe` atılır.
- `readingMinutes` bağımlılıksız `util/reading.ts`'te (`/markdown`'dan da dışa aktarılır). `SourceList` ve `FaqList` ayrı dosyada (`ArticleParts.tsx`); birini içe aktarmak Markdown kütüphanelerini yüklemez.
- Canlı denetim: `live:article-route`. Yayınlanmış yazı olmasa da olmayan bir yazı yolunun 404 (500 değil) döndüğünü kontrol eder.

## 0.1.1 (25 Eyl 2026)
- Bülten vekili ziyaretçi IP'sini `NE_REVALIDATE_SECRET` ile imzalı iletir (`x-ne-client-ip`, `x-ne-ts`, `x-ne-sig`). Engine bu IP ile hız sınırı uygular; imza olmadan bütün ziyaretçiler sitenin sunucu IP'sini paylaşıp 429 alıyordu.

## v0.1.0 · 25 Eylül 2026
- İlk sürüm: engine istemcisi, SEO/JSON-LD, feed rotaları, revalidate, bülten vekili ve formu, çerez onayı (Consent Mode v2), yasal sayfalar, 410 proxy, sözleşme denetleyicisi (statik + canlı), sahte engine.
