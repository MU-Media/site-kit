import type { Metadata } from "next";
import type { Article, ArticleSummary, PublicSite } from "../types";
import { NEWS_TYPES } from "../types";
import { absUrl, articlePath } from "../config";

export { JsonLd, ldJson } from "./JsonLd";

const ogLocale = (locale: string) => locale.replace("-", "_");
const coverUrl = (a: ArticleSummary, size: "og" | "card" = "og") => a.cover?.sizes?.[size] ?? a.cover?.url;

/** Kök layout metadata'sı: title şablonu, RSS alternate, robots */
export function rootMetadata(site: PublicSite, siteUrl: string): Metadata {
  return {
    metadataBase: new URL(siteUrl),
    title: { default: site.name, template: `%s · ${site.name}` },
    description: site.description,
    alternates: { canonical: "/", types: { "application/rss+xml": [{ url: "/rss.xml", title: site.name }] } },
    openGraph: { type: "website", siteName: site.name, locale: ogLocale(site.locale) },
    twitter: { card: "summary_large_image" },
    robots: { index: true, follow: true, "max-image-preview": "large" },
  };
}

/** Sıradan sayfa (kategori, yazar, yasal, ana sayfa) */
export function pageMetadata(o: { site: PublicSite; title?: string; description?: string; path: string; noindex?: boolean }): Metadata {
  return {
    ...(o.title ? { title: o.title } : {}),
    description: o.description ?? o.site.description,
    alternates: { canonical: o.path },
    openGraph: { type: "website", siteName: o.site.name, locale: ogLocale(o.site.locale), url: o.path, ...(o.title ? { title: o.title } : {}) },
    ...(o.noindex ? { robots: { index: false, follow: true } } : {}),
  };
}

/** Yazı sayfası: kanonik, OG article, Twitter kartı */
export function articleMetadata(site: PublicSite, a: Article | ArticleSummary): Metadata {
  const path = articlePath(a);
  const img = coverUrl(a);
  return {
    title: a.title,
    description: a.meta,
    alternates: { canonical: path },
    openGraph: {
      type: "article",
      siteName: site.name,
      locale: ogLocale(site.locale),
      url: path,
      title: a.title,
      description: a.meta,
      publishedTime: a.publishedAt,
      modifiedTime: a.updatedAt,
      section: a.category.name,
      ...(a.author ? { authors: [a.author.name] } : {}),
      ...(img ? { images: [{ url: img, ...(a.cover?.alt ? { alt: a.cover.alt } : {}) }] } : {}),
    },
    twitter: { card: "summary_large_image", title: a.title, description: a.meta, ...(img ? { images: [img] } : {}) },
  };
}

// ---------------- JSON-LD ----------------

export function organizationLd(site: PublicSite, siteUrl: string) {
  return {
    "@type": "Organization",
    "@id": absUrl(siteUrl, "/#organization"),
    name: site.organization.name || site.name,
    url: absUrl(siteUrl, "/"),
    ...(site.organization.logo ? { logo: site.organization.logo.startsWith("http") ? site.organization.logo : absUrl(siteUrl, site.organization.logo) } : {}),
    ...(site.organization.sameAs.length ? { sameAs: site.organization.sameAs } : {}),
  };
}

export function websiteLd(site: PublicSite, siteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": absUrl(siteUrl, "/#website"),
        name: site.name,
        url: absUrl(siteUrl, "/"),
        inLanguage: site.locale,
        description: site.description,
        publisher: { "@id": absUrl(siteUrl, "/#organization") },
      },
      organizationLd(site, siteUrl),
    ],
  };
}

export function breadcrumbLd(items: { name: string; url: string }[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: it.url })),
  };
}

export function faqLd(faq: { q: string; a: string }[]) {
  return {
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
}

/** Yazı: NewsArticle (haber/hype) ya da Article + BreadcrumbList + Organization (+ FAQPage) */
export function articleLd(site: PublicSite, siteUrl: string, a: Article) {
  const url = absUrl(siteUrl, articlePath(a));
  const img = coverUrl(a);
  const graph: Record<string, unknown>[] = [
    {
      "@type": NEWS_TYPES.has(a.type) ? "NewsArticle" : "Article",
      "@id": `${url}#article`,
      headline: a.title,
      description: a.meta,
      url,
      mainEntityOfPage: url,
      inLanguage: site.locale,
      datePublished: a.publishedAt,
      dateModified: a.updatedAt,
      articleSection: a.category.name,
      ...(img ? { image: [img.startsWith("http") ? img : absUrl(siteUrl, img)] } : {}),
      author: a.author
        ? { "@type": "Person", name: a.author.name, url: absUrl(siteUrl, `/yazar/${a.author.slug}`) }
        : { "@id": absUrl(siteUrl, "/#organization") },
      publisher: { "@id": absUrl(siteUrl, "/#organization") },
      ...(a.sources?.length ? { citation: a.sources.map((s) => s.url) } : {}),
    },
    breadcrumbLd([
      { name: site.name, url: absUrl(siteUrl, "/") },
      { name: a.category.name, url: absUrl(siteUrl, `/kategori/${a.category.slug}`) },
      { name: a.title, url },
    ]),
    organizationLd(site, siteUrl),
  ];
  if (a.faq?.length) graph.push(faqLd(a.faq));
  return { "@context": "https://schema.org", "@graph": graph };
}

export function personLd(site: PublicSite, siteUrl: string, author: { name: string; slug: string; bio?: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: author.name,
    url: absUrl(siteUrl, `/yazar/${author.slug}`),
    ...(author.bio ? { description: author.bio } : {}),
    worksFor: { "@type": "Organization", name: site.organization.name || site.name, url: absUrl(siteUrl, "/") },
  };
}
