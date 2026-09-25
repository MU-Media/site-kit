import type { ArticlePage, ArticleResult, ArticleType, PublicSite, SitemapData, SubscribeResult } from "./types";
import { siteEnv } from "./config";

/** Önbellek etiketleri: /api/revalidate bunları yeniler */
export const TAGS = {
  site: "ne:site",
  articles: "ne:articles",
  sitemap: "ne:sitemap",
  article: (slug: string) => `ne:article:${slug}`,
} as const;

export class EngineError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "EngineError";
  }
}

export interface EngineClientOptions {
  engineUrl: string;
  site: string;
  /** Test için enjekte edilebilir */
  fetch?: typeof fetch;
  /** Varsayılan 60 sn (sözleşmedeki s-maxage ile aynı) */
  revalidate?: number;
  timeoutMs?: number;
}

export interface ListArticlesQuery {
  limit?: number;
  page?: number;
  category?: string;
  author?: string;
  type?: ArticleType;
}

type NextInit = RequestInit & { next?: { tags?: string[]; revalidate?: number } };

export function createEngineClient(opts: EngineClientOptions) {
  const base = `${opts.engineUrl.replace(/\/+$/, "")}/api/public`;
  const siteBase = `${base}/sites/${encodeURIComponent(opts.site)}`;
  const f = opts.fetch ?? fetch;
  const revalidate = opts.revalidate ?? 60;
  const timeoutMs = opts.timeoutMs ?? 10_000;

  async function get(url: string, tags: string[]): Promise<Response> {
    try {
      return await f(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(timeoutMs),
        next: { tags, revalidate },
      } as NextInit);
    } catch (e) {
      throw new EngineError(`engine'e ulaşılamadı (${url}): ${String(e)}`);
    }
  }

  async function json<T>(url: string, tags: string[]): Promise<T> {
    const res = await get(url, tags);
    if (!res.ok) throw new EngineError(`engine ${res.status}: ${url}`, res.status);
    return (await res.json()) as T;
  }

  return {
    site: opts.site,

    getSite: () => json<PublicSite>(siteBase, [TAGS.site]),

    listArticles(q: ListArticlesQuery = {}) {
      const p = new URLSearchParams();
      for (const [k, v] of Object.entries(q)) if (v !== undefined && v !== "") p.set(k, String(v));
      const qs = p.toString();
      return json<ArticlePage>(`${siteBase}/articles${qs ? `?${qs}` : ""}`, [TAGS.articles]);
    },

    /** 404 → missing, 410 → gone (geri çekilmiş yazı; sayfa 410 dönmeli) */
    async getArticle(slug: string): Promise<ArticleResult> {
      const res = await get(`${siteBase}/articles/${encodeURIComponent(slug)}`, [TAGS.article(slug), TAGS.articles]);
      if (res.status === 404) return { status: "missing" };
      if (res.status === 410) return { status: "gone" };
      if (!res.ok) throw new EngineError(`engine ${res.status}: yazı ${slug}`, res.status);
      return { status: "ok", article: await res.json() };
    },

    getSitemap: () => json<SitemapData>(`${siteBase}/sitemap`, [TAGS.sitemap, TAGS.articles]),

    /** Sunucu tarafı bülten kaydı (site içindeki /api/newsletter vekili kullanır) */
    async subscribe(body: { email: string; consent: true; source?: string; hp?: string; consentText?: string }, headers: Record<string, string> = {}) {
      const res = await f(`${siteBase}/newsletter/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", ...headers },
        body: JSON.stringify(body),
        cache: "no-store",
        signal: AbortSignal.timeout(timeoutMs),
      });
      const data = (await res.json().catch(() => ({}))) as Partial<SubscribeResult> & { error?: string };
      return { httpStatus: res.status, data };
    },
  };
}

export type EngineClient = ReturnType<typeof createEngineClient>;

/** Ortam değişkenlerinden istemci (sitelerde tipik kullanım) */
export function engine(): EngineClient {
  const env = siteEnv();
  return createEngineClient({ engineUrl: env.engineUrl, site: env.site });
}

/**
 * engine'e ulaşılamazsa build ve sayfa çökmesin: boş durumla devam et.
 * Kullanım: const page = await orFallback(engine().listArticles(), EMPTY_PAGE)
 */
export async function orFallback<T>(p: Promise<T>, fallback: T): Promise<T> {
  try {
    return await p;
  } catch (e) {
    console.warn(`[site-kit] ${String(e)}; boş durumla devam ediliyor`);
    return fallback;
  }
}

export const EMPTY_PAGE: ArticlePage = { docs: [], totalDocs: 0, page: 1, totalPages: 0 };
export const EMPTY_SITEMAP: SitemapData = { articles: [], categories: [], authors: [] };

/** engine yokken sitenin iskeletini çizebilmek için env'den minimal site */
export function fallbackSite(slug: string, name = slug): PublicSite {
  return {
    slug, name, description: "", locale: "tr-TR", domains: [], frontendUrl: null, categories: [], authors: [],
    organization: { name, sameAs: [] }, analytics: {}, ads: {}, legal: { personaDisclosure: true }, newsletter: { enabled: true },
  };
}

/** Site bilgisini getirir; engine yoksa env'den iskelet döner */
export async function siteOrFallback(): Promise<PublicSite> {
  const env = siteEnv();
  return orFallback(createEngineClient({ engineUrl: env.engineUrl, site: env.site }).getSite(), fallbackSite(env.site));
}
