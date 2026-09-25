import { ConsentDefaultsScript, ConsentProvider, ConsentBanner, ConsentSettingsLink } from "@mu-media/site-kit/components";
export default function L({ children }: { children: React.ReactNode }) {
  return <html><head><ConsentDefaultsScript /></head><body><ConsentProvider>{children}<ConsentSettingsLink /><ConsentBanner /></ConsentProvider></body></html>;
}
