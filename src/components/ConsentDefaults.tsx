/** Consent Mode v2 varsayılanları: her şey reddedilmiş başlar. Kök layout'un <head>'ine koy. */
export const CONSENT_DEFAULTS_JS =
  "window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',wait_for_update:500});";

export function ConsentDefaultsScript() {
  return <script id="ne-consent-defaults" dangerouslySetInnerHTML={{ __html: CONSENT_DEFAULTS_JS }} />;
}
