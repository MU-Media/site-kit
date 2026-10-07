import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { LegalPage } from "../src/components/LegalPage";
import type { PublicSite } from "../src/types";

const base: PublicSite = { slug: "p", name: "Site", description: "d", locale: "tr-TR", domains: ["ornek.com"], frontendUrl: null, categories: [], authors: [], organization: { name: "Org", sameAs: [] }, analytics: {}, ads: {}, legal: { personaDisclosure: true }, newsletter: { enabled: true } };

describe("veri sorumlusu adresi (v0.1.9)", () => {
  it("gerçek kişi + e-posta, adres yok: adres satırı ve [Güncellenecek] görünmez", () => {
    const site = { ...base, contactEmail: "a@b.com", legal: { personaDisclosure: true, controllerName: "Uluç Muslu" } } as PublicSite;
    for (const kind of ["kvkk", "gizlilik"] as const) {
      const html = renderToStaticMarkup(<LegalPage kind={kind} site={site} />);
      expect(html, kind).toContain("Uluç Muslu");
      expect(html, kind).toContain("a@b.com");
      expect(html, kind).not.toContain("Güncellenecek");
      expect(html, kind).not.toContain("Adres:");
    }
  });
  it("veri sorumlusu tanımsız: eksik fark edilsin diye uyarı kalır", () => {
    expect(renderToStaticMarkup(<LegalPage kind="kvkk" site={base} />)).toContain("Adres: [Güncellenecek]");
  });
});
