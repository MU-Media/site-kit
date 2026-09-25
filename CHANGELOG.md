# Değişiklik günlüğü

## 0.1.1 (25 Eyl 2026)
- Bülten vekili ziyaretçi IP'sini `NE_REVALIDATE_SECRET` ile imzalı iletir (`x-ne-client-ip`, `x-ne-ts`, `x-ne-sig`). Engine bu IP ile hız sınırı uygular; imza olmadan bütün ziyaretçiler sitenin sunucu IP'sini paylaşıp 429 alıyordu.

## v0.1.0 · 25 Eylül 2026
- İlk sürüm: engine istemcisi, SEO/JSON-LD, feed rotaları, revalidate, bülten vekili ve formu, çerez onayı (Consent Mode v2), yasal sayfalar, 410 proxy, sözleşme denetleyicisi (statik + canlı), sahte engine.
