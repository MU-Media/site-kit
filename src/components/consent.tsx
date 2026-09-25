"use client";
import Script from "next/script";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/**
 * KVKK uyumlu çerez onayı + Google Consent Mode v2.
 * - Zorunlu çerez her zaman açık; analitik ve reklam ancak onayla.
 * - GA4 ve AdSense scriptleri onaydan ÖNCE hiç yüklenmez.
 * - Varsayılanlar <ConsentDefaultsScript/> ile "denied" kurulur (kök layout <head>'inde).
 * - Tercih `ne-consent` çerezinde 6 ay saklanır; onay geri alınınca _ga çerezleri silinir.
 */
export type ConsentChoice = { an: boolean; ad: boolean; t: number };
const COOKIE = "ne-consent";
const OPEN_EVENT = "ne-consent-open";

function read(): ConsentChoice | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${COOKIE}=([^;]*)`));
  if (!m) return null;
  try { return JSON.parse(decodeURIComponent(m[1]!)) as ConsentChoice; } catch { return null; }
}
function write(c: ConsentChoice) {
  document.cookie = `${COOKIE}=${encodeURIComponent(JSON.stringify(c))}; Max-Age=${60 * 60 * 24 * 182}; Path=/; SameSite=Lax`;
}
function clearAnalyticsCookies() {
  const host = location.hostname;
  const domains = ["", host, `.${host}`, `.${host.split(".").slice(-2).join(".")}`];
  for (const name of document.cookie.split("; ").map((c) => c.split("=")[0]!).filter((n) => /^_ga(_|$)|^_gid$|^_gat/.test(n)))
    for (const d of domains) document.cookie = `${name}=; Max-Age=0; Path=/${d ? `; Domain=${d}` : ""}`;
}

declare global { interface Window { dataLayer?: unknown[]; gtag?: (...a: unknown[]) => void } }

interface Ctx {
  choice: ConsentChoice | null;
  open: boolean;
  settings: boolean;
  save: (c: { an: boolean; ad: boolean }) => void;
  openSettings: () => void;
  showSettings: () => void;
}
const ConsentCtx = createContext<Ctx | null>(null);
export const useConsent = () => {
  const c = useContext(ConsentCtx);
  if (!c) throw new Error("useConsent, <ConsentProvider> içinde kullanılmalı");
  return c;
};

export function ConsentProvider({ ga4, adsense, children }: { ga4?: string; adsense?: string; children?: ReactNode }) {
  const [choice, setChoice] = useState<ConsentChoice | null>(null);
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState(false);

  useEffect(() => {
    const c = read();
    setChoice(c);
    setOpen(!c);
    const reopen = () => { setOpen(true); setSettings(true); };
    window.addEventListener(OPEN_EVENT, reopen);
    return () => window.removeEventListener(OPEN_EVENT, reopen);
  }, []);

  useEffect(() => {
    if (!choice || !window.gtag) return;
    window.gtag("consent", "update", {
      analytics_storage: choice.an ? "granted" : "denied",
      ad_storage: choice.ad ? "granted" : "denied",
      ad_user_data: choice.ad ? "granted" : "denied",
      ad_personalization: choice.ad ? "granted" : "denied",
    });
  }, [choice]);

  const save = useCallback((c: { an: boolean; ad: boolean }) => {
    const full = { ...c, t: Date.now() };
    if (!c.an) clearAnalyticsCookies();
    write(full);
    setChoice(full);
    setOpen(false);
    setSettings(false);
  }, []);

  const value = useMemo<Ctx>(() => ({
    choice, open, settings, save,
    openSettings: () => { setOpen(true); setSettings(true); },
    showSettings: () => setSettings(true),
  }), [choice, open, settings, save]);

  const pub = adsense ? (adsense.startsWith("ca-") ? adsense : `ca-${adsense}`) : undefined;
  return (
    <ConsentCtx.Provider value={value}>
      {choice?.an && ga4 ? (
        <>
          <Script id="ga4-src" src={`https://www.googletagmanager.com/gtag/js?id=${ga4}`} strategy="afterInteractive" />
          <Script id="ga4-init" strategy="afterInteractive">{`gtag('js', new Date()); gtag('config', '${ga4}');`}</Script>
        </>
      ) : null}
      {choice?.ad && pub ? (
        <Script id="adsense" async strategy="afterInteractive" crossOrigin="anonymous" src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${pub}`} />
      ) : null}
      {children}
    </ConsentCtx.Provider>
  );
}

export interface ConsentBannerProps {
  className?: string;
  text?: ReactNode;
  labels?: Partial<Record<"reject" | "settings" | "save" | "accept" | "necessary" | "analytics" | "ads", string>>;
}

/** Onay penceresi. Görünüm sitenin: className ve metinler değiştirilebilir. */
export function ConsentBanner({ className = "ne-consent", text, labels = {} }: ConsentBannerProps) {
  const { open, settings, save, showSettings, choice } = useConsent();
  const [an, setAn] = useState(false);
  const [ad, setAd] = useState(false);
  useEffect(() => { if (choice) { setAn(choice.an); setAd(choice.ad); } }, [choice]);
  if (!open) return null;
  const L = { reject: "Reddet", settings: "Ayarlar", save: "Seçimimi kaydet", accept: "Kabul et", necessary: "Zorunlu (her zaman açık)", analytics: "Analitik", ads: "Reklam", ...labels };
  return (
    <div className={className} data-ne-consent="" role="dialog" aria-live="polite" aria-label="Çerez tercihleri">
      <p>
        {text ?? (
          <>Siteyi çalıştırmak için zorunlu çerezler kullanıyoruz. İzin verirsen ziyaretleri ölçmek (analitik) ve reklam göstermek için de çerez kullanırız. Ayrıntılar <a href="/cerez-politikasi">Çerez Politikası</a>'nda.</>
        )}
      </p>
      {settings ? (
        <div className="ne-consent-settings">
          <label><input type="checkbox" checked disabled /> {L.necessary}</label>
          <label><input type="checkbox" checked={an} onChange={(e) => setAn(e.target.checked)} /> {L.analytics}</label>
          <label><input type="checkbox" checked={ad} onChange={(e) => setAd(e.target.checked)} /> {L.ads}</label>
        </div>
      ) : null}
      <div className="ne-consent-actions">
        <button type="button" onClick={() => save({ an: false, ad: false })}>{L.reject}</button>
        {settings
          ? <button type="button" onClick={() => save({ an, ad })}>{L.save}</button>
          : <button type="button" onClick={showSettings}>{L.settings}</button>}
        <button type="button" className="primary" onClick={() => save({ an: true, ad: true })}>{L.accept}</button>
      </div>
    </div>
  );
}

/** Footer'daki "Çerez ayarları" bağlantısı (Provider dışında da çalışır) */
export function ConsentSettingsLink({ className = "ne-linklike", children = "Çerez ayarları" }: { className?: string; children?: ReactNode }) {
  return (
    <button type="button" className={className} onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}>
      {children}
    </button>
  );
}
