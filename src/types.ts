/**
 * engine herkese açık API sözleşmesinin tipleri.
 * Kaynak: MU-Media/engine docs/decisions/headless-contract.md (tek doğru kaynak orası).
 */
export type ArticleType = "haber" | "hype" | "kose" | "rehber" | "inceleme" | "liste";

export interface PublicSite {
  slug: string;
  name: string;
  description: string;
  locale: string;
  domains: string[];
  frontendUrl: string | null;
  categories: { slug: string; name: string; description?: string }[];
  authors: { slug: string; name: string; bio?: string; avatarUrl?: string; persona: boolean }[];
  organization: { name: string; logo?: string; sameAs: string[] };
  analytics: { ga4MeasurementId?: string };
  ads: { adsensePublisherId?: string };
  legal: { controllerName?: string; address?: string; personaDisclosure: boolean };
  contactEmail?: string;
  newsletter: { enabled: boolean };
}

export interface Media {
  url: string;
  width?: number;
  height?: number;
  alt?: string;
  sizes?: { card?: string; og?: string };
}

export interface ArticleSummary {
  slug: string;
  title: string;
  meta: string;
  type: ArticleType;
  category: { slug: string; name: string };
  author: { slug: string; name: string } | null;
  cover: Media | null;
  publishedAt: string;
  updatedAt: string;
}

export interface Article extends ArticleSummary {
  bodyMarkdown: string;
  sources: { title: string; url: string }[];
  faq: { q: string; a: string }[];
}

export interface ArticlePage {
  docs: ArticleSummary[];
  totalDocs: number;
  page: number;
  totalPages: number;
}

export interface SitemapData {
  articles: { slug: string; category: string; publishedAt: string; updatedAt: string }[];
  categories: string[];
  authors: string[];
}

export type ArticleResult =
  | { status: "ok"; article: Article }
  | { status: "gone" }
  | { status: "missing" };

export type SubscribeResult = { status: "pending" | "already" };

/** Revalidate bildirimi gövdesi (engine → site) */
export interface RevalidatePayload {
  type: "article";
  slug: string;
  category: string;
  status: string;
}

export const NEWS_TYPES: ReadonlySet<ArticleType> = new Set(["haber", "hype"]);
