import type { ReactNode } from "react";

/** Geri çekilmiş yazı (proxy 410'u kaçırdıysa sayfa içinde gösterim; robots noindex metadata'sını sayfa verir) */
export function GonePage({ className = "ne-status", children }: { className?: string; children?: ReactNode }) {
  return (
    <div className={className} data-ne-gone="">
      <h1>Bu yazı yayından kaldırıldı</h1>
      {children ?? <p>Aradığın yazı artık yayında değil. <a href="/">Ana sayfaya dön</a></p>}
    </div>
  );
}

/** /bulten/onaylandi ve /bulten/ayrildi sayfaları */
/** `expired`: engine süresi dolmuş onay bağlantısını ?durum=suresi-doldu ile buraya yollar */
export function NewsletterStatus({ kind, siteName, expired, className = "ne-status" }: { kind: "onaylandi" | "ayrildi"; siteName: string; expired?: boolean; className?: string }) {
  if (kind === "onaylandi" && expired) {
    return (
      <div className={className} data-ne-newsletter-status="suresi-doldu">
        <h1>Onay bağlantısının süresi dolmuş</h1>
        <p>Güvenlik için onay bağlantıları 7 gün geçerli. Sitedeki formdan yeniden kaydolursan sana yeni bir bağlantı gönderiyoruz.</p>
        <p><a href="/">Ana sayfaya dön</a></p>
      </div>
    );
  }
  return kind === "onaylandi" ? (
    <div className={className} data-ne-newsletter-status="onaylandi">
      <h1>Kaydın onaylandı</h1>
      <p>{siteName} bültenine hoş geldin. İlk bülten yakında e-postanda. İstediğin zaman her bültenin altındaki bağlantıyla ayrılabilirsin.</p>
      <p><a href="/">Ana sayfaya dön</a></p>
    </div>
  ) : (
    <div className={className} data-ne-newsletter-status="ayrildi">
      <h1>Bültenden ayrıldın</h1>
      <p>Artık {siteName} bülteni sana gönderilmeyecek. Fikrini değiştirirsen sitedeki formdan yeniden kaydolabilirsin.</p>
      <p><a href="/">Ana sayfaya dön</a></p>
    </div>
  );
}
