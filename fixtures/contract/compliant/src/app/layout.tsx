import { ConsentDefaultsScript, ConsentProvider, ConsentBanner, ConsentSettingsLink, NewsletterForm } from "@mu-media/site-kit/components";
export default function L({ children }: { children: React.ReactNode }) {
  return <html><head><ConsentDefaultsScript /></head><body><ConsentProvider>{children}<NewsletterForm /><ConsentSettingsLink /><ConsentBanner /></ConsentProvider></body></html>;
}
