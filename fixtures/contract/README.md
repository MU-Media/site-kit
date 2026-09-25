# Sözleşme denetimi fixture'ları

- `compliant/`: sözleşmeye uyan minimal site ağacı. `checkStatic` GEÇMELİ.
- `broken/`: bilerek bozuk: `ads.txt` yok, `rss.xml` site-kit kullanmıyor, `proxy.ts` yok, `NewsletterForm` yok. `checkStatic` tam bu 4 sorunu bulmalı.

Bir denetim kuralı eklerken önce `broken/`'a onu ihlal eden bir örnek ekle (cairn: başarısız olurken görülmemiş koruma çalışıyor sayılmaz).
