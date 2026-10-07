import Script from "next/script";

/**
 * Çerezsiz ziyaret sayacı (v0.1.8): Umami, kendi sunucumuzda. Çerez ya da tarayıcı deposu kullanmaz, kişiyi tanımlayan
 * veri saklamaz (sayfa, yönlendiren site, ülke, cihaz türü toplu sayılır); bu yüzden çerez onayı beklemez. GA4 onay
 * verenlerin ayrıntısı için kalır. Script ve gönderim sitenin kendi alan adından: site next.config'inde
 * `/_s/:path*` → Umami sunucusu yönlendirmesi gerekir (playbook).
 */
export function CookielessStats({ websiteId, path = "/_s" }: { websiteId?: string; path?: string }) {
  if (!websiteId) return null;
  return <Script id="ne-stats" src={`${path}/script.js`} data-website-id={websiteId} data-do-not-track="false" strategy="afterInteractive" />;
}
