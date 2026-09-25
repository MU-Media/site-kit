import type { ReactNode } from "react";
import type { PublicSite } from "../types";
import { ConsentSettingsLink } from "./consent";

/**
 * Yasal sayfalar site bilgisinden üretilir (engine apps/web'den taşındı, bülten eklendi).
 * İyi niyetli bir başlangıçtır; canlıdan önce hukukçu incelemesi önerilir.
 * Eksik bilgi "[Güncellenecek]" olarak görünür (site engine'de legal.* alanlarını doldurmalı).
 */
export type LegalKind = "hakkimizda" | "iletisim" | "gizlilik" | "kvkk" | "cerez";

export const LEGAL_UPDATED = "25 Eylül 2026";
export const LEGAL_TITLES: Record<LegalKind, string> = {
  hakkimizda: "Hakkımızda",
  iletisim: "İletişim",
  gizlilik: "Gizlilik Politikası",
  kvkk: "KVKK Aydınlatma Metni",
  cerez: "Çerez Politikası",
};

const pending = (v?: string) => v?.trim() || "[Güncellenecek]";
const hasAnalytics = (s: PublicSite) => Boolean(s.analytics?.ga4MeasurementId);
const hasAds = (s: PublicSite) => Boolean(s.ads?.adsensePublisherId);
const hasNewsletter = (s: PublicSite) => s.newsletter?.enabled !== false;

function Contact({ site }: { site: PublicSite }) {
  return site.contactEmail ? <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a> : <span>[Güncellenecek]</span>;
}
const Updated = () => <p className="ne-disclosure">Son güncelleme: {LEGAL_UPDATED}</p>;

export function LegalPage({ kind, site, domain, className = "ne-legal" }: { kind: LegalKind; site: PublicSite; domain?: string; className?: string }) {
  const d = domain ?? site.domains[0] ?? "";
  const body: Record<LegalKind, () => ReactNode> = { hakkimizda, iletisim, gizlilik, kvkk, cerez };
  return (
    <article className={className}>
      <h1>{LEGAL_TITLES[kind]}</h1>
      {body[kind]()}
    </article>
  );

  function hakkimizda() {
    return (
      <>
        <p>{site.name}{site.description ? `, ${site.description}` : ""}</p>
        <p>Bağımsız bir yayınız. Hakkında yazdığımız markaların, şirketlerin ya da resmi kuruluşların yayını değiliz ve onlarla bir bağımız yok. Marka ve ürün adları sahiplerine aittir.</p>
        <h2>Nasıl çalışıyoruz</h2>
        <p>Yazılarımız yapay zekâ destekli bir editoryal süreçle hazırlanıyor. Dünyadaki resmi duyuruları, haber sitelerini ve topluluk kaynaklarını takip ediyoruz. Bir gelişmeyi yazmaya değer bulduğumuzda birden fazla kaynağı okuyup Türkçe, özgün bir yazı olarak sentezliyoruz. Çeviri yapmıyoruz, kaynakların metnini kopyalamıyoruz.</p>
        <p>Her yazı yayından önce olgu kontrolünden ve kalite kontrollerinden geçiyor, kullandığımız kaynaklar yazının sonunda listeleniyor. Yazılardaki yorumlar sitemizin görüşüdür; olgu ile yorumu ayırmaya özen gösteriyoruz.{site.legal?.personaDisclosure !== false ? " Yazar sayfalarımızdaki imzalar, bu süreçte kullandığımız editoryal personalardır." : ""}</p>
        <h2>Hata gördüysen</h2>
        <p>Yanlış bir bilgi, eksik bir kaynak ya da hak ihlali olduğunu düşündüğün bir içerik gördüysen bize yaz: <Contact site={site} />. Doğrulanan hataları düzeltir, gerekirse yazıyı yayından kaldırırız.</p>
      </>
    );
  }

  function iletisim() {
    return (
      <>
        <p>{site.name} ekibine e-postayla ulaşabilirsin: <Contact site={site} /></p>
        <h2>Ne için yazabilirsin?</h2>
        <ul>
          <li><b>Hata bildirimi:</b> Yazının bağlantısını ve düzeltilmesi gereken bilgiyi, varsa kaynağıyla birlikte gönder.</li>
          <li><b>Telif ve içerik talepleri:</b> Hak sahibi olduğun içeriği ve ilgili yazıyı belirt, en kısa sürede inceleriz.</li>
          <li><b>Kişisel veri başvuruları:</b> KVKK kapsamındaki haklarını kullanmak için <a href="/kvkk">KVKK Aydınlatma Metni</a>'ndeki yolu izleyebilirsin.</li>
          <li><b>İş birliği ve reklam:</b> Kısa bir tanıtımla yaz.</li>
        </ul>
      </>
    );
  }

  function gizlilik() {
    return (
      <>
        <Updated />
        <p>Bu politika, {d} adresindeki {site.name} sitesini ziyaret ettiğinde hangi bilgilerin işlendiğini anlatır. Sitede üyelik ya da yorum yok{hasNewsletter(site) ? "; tek form bülten kaydıdır" : ""}.</p>
        <h2>Hangi bilgiler işleniyor?</h2>
        <ul>
          <li><b>Teknik kayıtlar:</b> Siteyi sunan altyapı, güvenlik ve hata takibi için IP adresi, tarayıcı ve cihaz bilgisi, istek zamanı gibi sunucu kayıtlarını kısa süre tutar.</li>
          <li><b>Çerez tercihin:</b> Onay penceresinde yaptığın seçim bir çerezde saklanır.</li>
          {hasNewsletter(site) ? <li><b>Bülten (kayıt olursan):</b> E-posta adresin, açık rıza verdiğin zaman, kaydolduğun sayfa ve IP adresinin geri döndürülemez bir özeti (hash). Kayıt, e-postana gönderilen bağlantıyla onaylanınca tamamlanır; her bültendeki bağlantıyla tek tıkla ayrılabilirsin.</li> : null}
          {hasAnalytics(site) ? <li><b>Analitik (onay verirsen):</b> Google Analytics 4 ile hangi sayfaların okunduğunu anonimleştirilmiş ve toplu olarak ölçeriz.</li> : null}
          {hasAds(site) ? <li><b>Reklam (onay verirsen):</b> Google AdSense, reklam göstermek ve ölçmek için çerez kullanabilir.</li> : null}
          <li><b>Bize yazarsan:</b> E-posta adresin ve mesajın, sadece cevap vermek ve talebini sonuçlandırmak için kullanılır.</li>
        </ul>
        <h2>Üçüncü taraflar</h2>
        <p>
          Site, barındırma hizmeti sağlayıcısının (Vercel) altyapısında çalışır.{hasNewsletter(site) ? " Bülten e-postaları e-posta gönderim hizmeti Resend aracılığıyla gönderilir." : ""}
          {hasAnalytics(site) || hasAds(site) ? " Analitik ve reklam hizmetleri Google tarafından sağlanır; bu hizmetler ancak çerez onayı verirsen çalışır." : ""}
          {" "}Bu sağlayıcıların sunucuları yurt dışında olabilir. Ayrıntılar <a href="/kvkk">KVKK Aydınlatma Metni</a>'nde.
        </p>
        <h2>Tercihlerini değiştirmek</h2>
        <p>Sayfanın altındaki "Çerez ayarları" bağlantısıyla onayını istediğin zaman geri alabilir ya da değiştirebilirsin.</p>
        <h2>Veri sorumlusu ve iletişim</h2>
        <p>{pending(site.legal?.controllerName)}, {pending(site.legal?.address)}. E-posta: <Contact site={site} /></p>
      </>
    );
  }

  function kvkk() {
    const cookies = [hasAnalytics(site) ? "analitik" : null, hasAds(site) ? "reklam" : null].filter(Boolean).join(" ve ");
    const nl = hasNewsletter(site);
    return (
      <>
        <Updated />
        <p>6698 sayılı Kişisel Verilerin Korunması Kanunu'nun ("KVKK") 10. maddesi uyarınca, {d} adresindeki {site.name} sitesini ziyaret edenlerin kişisel verilerinin işlenmesine ilişkin bilgiler aşağıdadır.</p>
        <h2>1. Veri sorumlusu</h2>
        <p>{pending(site.legal?.controllerName)}<br />Adres: {pending(site.legal?.address)}<br />E-posta: <Contact site={site} /></p>
        <h2>2. İşlenen kişisel veriler</h2>
        <ul>
          <li>İşlem güvenliği verileri: IP adresi, tarayıcı ve cihaz bilgisi, ziyaret zamanı (sunucu kayıtları)</li>
          <li>Çerez tercihin</li>
          {nl ? <li>Bülten kaydı: e-posta adresi, açık rıza zamanı, kayıt sayfası, IP adresinin özeti (hash)</li> : null}
          {cookies ? <li>Onay vermen halinde {cookies} çerezleriyle toplanan çevrim içi tanımlayıcılar ve kullanım verileri</li> : null}
          <li>Bize yazman halinde iletişim verileri (e-posta adresi ve mesaj içeriği)</li>
        </ul>
        <h2>3. İşleme amaçları ve hukuki sebepler</h2>
        <ul>
          <li>Sitenin güvenli ve kesintisiz çalışması, kötüye kullanımın önlenmesi: veri sorumlusunun meşru menfaati (KVKK m.5/2-f).</li>
          <li>Talep ve başvurulara cevap verilmesi: bir hakkın tesisi, kullanılması veya korunması ve meşru menfaat (m.5/2-e, f).</li>
          {nl ? <li>Bülten gönderimi: açık rızan (m.5/1). Rızanı her bültendeki ayrılma bağlantısıyla istediğin an geri alabilirsin.</li> : null}
          {cookies ? <li>Ziyaretlerin ölçülmesi{hasAds(site) ? " ve reklam gösterilmesi" : ""}: açık rızan (m.5/1). Rıza vermezsen bu çerezler kullanılmaz.</li> : null}
        </ul>
        <h2>4. Aktarım</h2>
        <p>
          Veriler, hizmet aldığımız barındırma sağlayıcısına (Vercel){nl ? ", e-posta gönderim sağlayıcısına (Resend)" : ""}{cookies ? " ve onay vermen halinde Google'a (analitik/reklam hizmetleri)" : ""} aktarılabilir.
          Bu sağlayıcıların sunucuları yurt dışında bulunabildiğinden aktarım, KVKK'nın 9. maddesindeki şartlara uygun olarak yapılır; bülten ve çerezlerle yapılan aktarımlar açık rızana dayanır. Kanunen yetkili kurum ve kuruluşlara talep halinde aktarım yapılabilir.
        </p>
        <h2>5. Toplama yöntemi</h2>
        <p>Veriler siteyi ziyaret ettiğinde otomatik yollarla (sunucu kayıtları, çerezler), bülten formunu doldurman ve bize e-posta göndermen halinde elektronik ortamda toplanır.</p>
        <h2>6. Hakların</h2>
        <p>KVKK'nın 11. maddesi uyarınca verilerinin işlenip işlenmediğini öğrenme, bilgi talep etme, düzeltilmesini veya silinmesini isteme, aktarıldığı üçüncü kişileri öğrenme, itiraz etme ve zararın giderilmesini talep etme haklarına sahipsin. Başvurunu yukarıdaki e-posta adresine yazılı olarak iletebilirsin; en geç 30 gün içinde ücretsiz cevaplanır.</p>
      </>
    );
  }

  function cerez() {
    const rows: [string, string, string, string][] = [["ne-consent", "Zorunlu", "Çerez tercihini hatırlar", "6 ay"]];
    if (hasAnalytics(site)) rows.push(["_ga, _ga_*", "Analitik (onayla)", "Google Analytics 4: ziyaretleri toplu ve anonim ölçer", "2 yıla kadar"]);
    if (hasAds(site)) rows.push(["Google reklam çerezleri (ör. __gads, __gpi)", "Reklam (onayla)", "Google AdSense: reklam gösterimi ve ölçümü", "13 aya kadar"]);
    return (
      <>
        <Updated />
        <p>Çerezler, bir siteyi ziyaret ettiğinde tarayıcına kaydedilen küçük dosyalardır. {site.name} zorunlu çerezleri her zaman kullanır; analitik ve reklam çerezleri ise ancak sen izin verirsen devreye girer. İzin vermeden önce Google'ın ölçüm ve reklam scriptleri sayfaya hiç yüklenmez (Google İzin Modu varsayılan olarak "reddedildi" durumundadır).</p>
        <h2>Kullandığımız çerezler</h2>
        <table>
          <thead><tr><th>Çerez</th><th>Tür</th><th>Amaç</th><th>Süre</th></tr></thead>
          <tbody>{rows.map((r) => <tr key={r[0]}>{r.map((c, i) => <td key={i}>{c}</td>)}</tr>)}</tbody>
        </table>
        <h2>Tercihini değiştirmek</h2>
        <p>Onayını istediğin zaman değiştirebilir ya da geri alabilirsin: <ConsentSettingsLink />. Tarayıcı ayarlarından çerezleri silmek de mümkün.</p>
        <p>Kişisel verilerin nasıl işlendiği için <a href="/kvkk">KVKK Aydınlatma Metni</a>'ne bakabilirsin.</p>
      </>
    );
  }
}
