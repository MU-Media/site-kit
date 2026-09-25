/**
 * Site ortam değişkenleri (sözleşme §3). Eksik değişkende anlaşılır hata verir.
 * NE_REVALIDATE_SECRET sadece /api/revalidate için zorunludur.
 */
export interface SiteEnv {
  engineUrl: string;
  site: string;
  revalidateSecret: string | undefined;
  siteUrl: string;
}

const trimSlash = (s: string) => s.replace(/\/+$/, "");

export function siteEnv(env: Record<string, string | undefined> = process.env): SiteEnv {
  const missing = ["NE_ENGINE_URL", "NE_SITE_SLUG", "NEXT_PUBLIC_SITE_URL"].filter((k) => !env[k]?.trim());
  if (missing.length) {
    throw new Error(
      `site-kit: eksik ortam değişkeni: ${missing.join(", ")}. .env.example'a bak (NE_ENGINE_URL=https://engine..., NE_SITE_SLUG=<slug>, NEXT_PUBLIC_SITE_URL=https://<domain>).`,
    );
  }
  return {
    engineUrl: trimSlash(env.NE_ENGINE_URL!.trim()),
    site: env.NE_SITE_SLUG!.trim(),
    revalidateSecret: env.NE_REVALIDATE_SECRET?.trim() || undefined,
    siteUrl: trimSlash(env.NEXT_PUBLIC_SITE_URL!.trim()),
  };
}

/** Site içi mutlak URL */
export const absUrl = (siteUrl: string, path: string) => `${trimSlash(siteUrl)}${path.startsWith("/") ? path : `/${path}`}`;

/** Yazının kanonik yolu */
export const articlePath = (a: { slug: string; category: { slug: string } | string }) =>
  `/${typeof a.category === "string" ? a.category : a.category.slug}/${a.slug}`;
