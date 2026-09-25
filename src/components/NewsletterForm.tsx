"use client";
import { useId, useState, type FormEvent, type ReactNode } from "react";

/**
 * Bülten formu. Aynı kökendeki /api/newsletter vekiline gönderir (site-kit routes.newsletterProxy).
 * Görünüm tamamen sitenin: className'ler ve metinler prop'larla değiştirilir.
 * KVKK: açık rıza kutusu işaretlenmeden gönderilmez; bal küpü alanı botları eler.
 */
export type NewsletterState = "idle" | "sending" | "pending" | "already" | "error";

export interface NewsletterCopy {
  title: ReactNode;
  description: ReactNode;
  placeholder: string;
  button: string;
  sending: string;
  consent: ReactNode;
  pending: ReactNode;
  already: ReactNode;
  error: string;
}

/** Rıza metninin düz hali: engine'e rıza kaydıyla birlikte gönderilir. Özel `copy.consent` verirsen `consentText` da ver. */
export const DEFAULT_CONSENT_TEXT =
  "E-posta adresimin bülten gönderimi için işlenmesine açık rıza veriyorum. Ayrıntılar KVKK Aydınlatma Metni'nde.";

export const DEFAULT_NEWSLETTER_COPY: NewsletterCopy = {
  title: "Bültene katıl",
  description: "Haftanın öne çıkan yazıları e-postana gelsin. İstediğin zaman tek tıkla ayrılabilirsin.",
  placeholder: "e-posta adresin",
  button: "Katıl",
  sending: "Gönderiliyor…",
  consent: (
    <>
      E-posta adresimin bülten gönderimi için işlenmesine açık rıza veriyorum. Ayrıntılar{" "}
      <a href="/kvkk">KVKK Aydınlatma Metni</a>'nde.
    </>
  ),
  pending: "Neredeyse bitti: e-postana gelen bağlantıya tıklayarak kaydını onayla.",
  already: "Bu adres zaten listede. Onay e-postasını bulamadıysan gereksiz klasörüne bak.",
  error: "Kayıt şu an alınamadı, biraz sonra tekrar dene.",
};

export interface NewsletterFormProps {
  /** Kaynak etiketi (ör. "anasayfa", "yazi-sonu"); engine'de hangi formdan geldiği kaydedilir */
  source?: string;
  copy?: Partial<NewsletterCopy>;
  endpoint?: string;
  className?: string;
  classNames?: Partial<Record<"title" | "description" | "form" | "input" | "button" | "consent" | "message" | "error", string>>;
  /** Başlık/açıklama gösterilmesin (site kendi başlığını çizecekse) */
  bare?: boolean;
  /** copy.consent'i değiştirdiysen onun düz metni (rıza kaydı için) */
  consentText?: string;
}

export function NewsletterForm({ source, copy: c, endpoint = "/api/newsletter", className = "ne-newsletter", classNames: cn = {}, bare, consentText = DEFAULT_CONSENT_TEXT }: NewsletterFormProps) {
  const copy = { ...DEFAULT_NEWSLETTER_COPY, ...c };
  const id = useId();
  const [state, setState] = useState<NewsletterState>("idle");
  const [error, setError] = useState<string>("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (fd.get("consent") !== "on") { setState("error"); setError("Devam etmek için onay kutusunu işaretlemelisin."); return; }
    setState("sending");
    setError("");
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: String(fd.get("email") ?? ""), consent: true, consentText, source: source ?? location.pathname, hp: String(fd.get("website") ?? "") }),
      });
      const data = (await res.json().catch(() => ({}))) as { status?: string; error?: string };
      if (!res.ok) { setState("error"); setError(data.error ?? copy.error); return; }
      setState(data.status === "already" ? "already" : "pending");
    } catch {
      setState("error");
      setError(copy.error);
    }
  }

  return (
    <section className={className} data-ne-newsletter="" data-state={state} aria-labelledby={bare ? undefined : `${id}-t`}>
      {bare ? null : (
        <>
          <h2 id={`${id}-t`} className={cn.title}>{copy.title}</h2>
          <p className={cn.description}>{copy.description}</p>
        </>
      )}
      {state === "pending" || state === "already" ? (
        <p className={cn.message} role="status">{state === "pending" ? copy.pending : copy.already}</p>
      ) : (
        <form className={cn.form} onSubmit={onSubmit} noValidate>
          <label htmlFor={`${id}-e`} className="ne-visually-hidden">E-posta</label>
          <input id={`${id}-e`} className={cn.input} type="email" name="email" required autoComplete="email" placeholder={copy.placeholder} />
          {/* bal küpü: insanlar görmez, botlar doldurur */}
          <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }} />
          <label className={cn.consent}>
            <input type="checkbox" name="consent" required /> <span>{copy.consent}</span>
          </label>
          <button className={cn.button} type="submit" disabled={state === "sending"}>{state === "sending" ? copy.sending : copy.button}</button>
          {state === "error" ? <p className={cn.error} role="alert">{error}</p> : null}
        </form>
      )}
    </section>
  );
}
