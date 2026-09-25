import { describe, expect, it } from "vitest";
import { articleLd, articleMetadata, ldJson } from "../src/seo";
import type { Article, PublicSite } from "../src/types";
import { isArticlePath } from "../src/proxy";

const site: PublicSite = { slug: "p", name: "Site", description: "d", locale: "tr-TR", domains: ["ornek.com"], frontendUrl: null, categories: [], authors: [], organization: { name: "Org", sameAs: [] }, analytics: {}, ads: {}, legal: { personaDisclosure: true }, newsletter: { enabled: true } };
const base: Article = { slug: "s", title: "T", meta: "M", type: "haber", category: { slug: "tcg", name: "Kart" }, author: { slug: "deniz", name: "Deniz" }, cover: { url: "https://cdn/x.webp", sizes: { og: "https://cdn/og.webp" } }, publishedAt: "2026-09-24T10:00:00Z", updatedAt: "2026-09-24T11:00:00Z", bodyMarkdown: "x", sources: [{ title: "PB", url: "https://pb/x" }], faq: [] };

describe("JSON-LD", () => {
  it("haber → NewsArticle + BreadcrumbList(3) + Organization; FAQ yoksa FAQPage yok", () => {
    const ld = articleLd(site, "https://ornek.com", base) as { "@graph": any[] };
    const types = ld["@graph"].map((n) => n["@type"]);
    expect(types).toEqual(["NewsArticle", "BreadcrumbList", "Organization"]);
    const a = ld["@graph"][0];
    expect(a.url).toBe("https://ornek.com/tcg/s");
    expect(a.image).toEqual(["https://cdn/og.webp"]);
    expect(a.author.url).toBe("https://ornek.com/yazar/deniz");
    expect(a.citation).toEqual(["https://pb/x"]);
    expect(ld["@graph"][1].itemListElement.map((i: any) => i.position)).toEqual([1, 2, 3]);
  });
  it("rehber → Article; FAQ varsa FAQPage", () => {
    const ld = articleLd(site, "https://ornek.com", { ...base, type: "rehber", faq: [{ q: "S?", a: "C." }] }) as { "@graph": any[] };
    expect(ld["@graph"].map((n) => n["@type"])).toEqual(["Article", "BreadcrumbList", "Organization", "FAQPage"]);
  });
  it("</script> kaçışı", () => {
    expect(ldJson({ x: "</script><script>alert(1)</script>" })).not.toContain("</script>");
  });
  it("metadata kanonik ve og:article", () => {
    const m = articleMetadata(site, base);
    expect(m.alternates?.canonical).toBe("/tcg/s");
    expect((m.openGraph as any).type).toBe("article");
  });
});

describe("proxy yol eşleştirme", () => {
  it("sadece /kategori/slug biçimi, ayrılmış önekler hariç", () => {
    expect(isArticlePath("/tcg/delta")).toEqual({ category: "tcg", slug: "delta" });
    expect(isArticlePath("/kategori/tcg")).toBeNull();
    expect(isArticlePath("/bulten/onaylandi")).toBeNull();
    expect(isArticlePath("/rss.xml")).toBeNull();
    expect(isArticlePath("/tcg/delta/x")).toBeNull();
  });
});
