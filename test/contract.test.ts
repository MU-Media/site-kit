import { describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { checkLive, checkStatic } from "../src/contract/check.mjs";

const fx = (n: string) => fileURLToPath(new URL(`../fixtures/contract/${n}`, import.meta.url));

describe("sözleşme denetimi kalibrasyonu (cairn: başarısız olurken görülmüş koruma)", () => {
  it("uyumlu ağaç geçer", () => {
    const r = checkStatic(fx("compliant"));
    expect(r.problems).toEqual([]);
    expect(r.ok).toBe(true);
  });
  it("bozuk ağaç tam olarak bilinen 4 sorunu bulur", () => {
    const r = checkStatic(fx("broken"));
    expect(r.ok).toBe(false);
    expect(r.problems.map((p) => p.id).sort()).toEqual(["kit:/rss.xml", "newsletter-form", "proxy-410", "route:/ads.txt"].sort());
  });
  it("app klasörü yoksa reddeder", () => {
    expect(checkStatic(fileURLToPath(new URL("../src", import.meta.url))).ok).toBe(false);
  });
});

describe("canlı denetim", () => {
  const page = (status: number, body = "", ct = "text/html") => new Response(body, { status, headers: { "content-type": ct } });
  function site(broken: boolean) {
    return async (url: string, init?: RequestInit) => {
      const p = new URL(url).pathname;
      if (p === "/") return page(200, `<script id="ne-consent-defaults"></script>${broken ? "" : '<section data-ne-newsletter="">'}`);
      if (p === "/api/revalidate") return page(broken ? 200 : 401, "{}", "application/json");
      if (p === "/api/newsletter") return page(400, "{}", "application/json");
      if (p === "/rss.xml") return page(200, "<rss><item><title>x</title><link>https://s.test/tcg/a</link></item></rss>", "application/rss+xml");
      if (p.endsWith(".xml")) return page(200, "<x/>", "application/xml");
      if (p.endsWith(".txt")) return page(p === "/ads.txt" ? 404 : 200, "x", "text/plain");
      if (p === "/tcg/a") return page(200, `<script type="application/ld+json">{"@graph":[]}</script><section data-ne-newsletter="">`);
      return page(200, "ok");
    };
  }
  it("uyumlu site geçer", async () => {
    const r = await checkLive("https://s.test", site(false) as any);
    expect(r.problems).toEqual([]);
  });
  it("bozuk site: revalidate 401 dönmüyor ve ana sayfada bülten yok", async () => {
    const r = await checkLive("https://s.test", site(true) as any);
    expect(r.problems.map((p: any) => p.id).sort()).toEqual(["live:newsletter", "live:revalidate-401"]);
  });
});
