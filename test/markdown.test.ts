import { describe, expect, it } from "vitest";
import { renderMarkdown, readingMinutes } from "../src/markdown";

describe("renderMarkdown (sanitize-html, jsdom yok: site-kit#1)", () => {
  it("gfm tablo, başlık, liste ve dış link yeni sekmede", () => {
    const html = renderMarkdown("## Başlık\n\n- a\n- b\n\n| x | y |\n|---|---|\n| 1 | 2 |\n\n[kaynak](https://ornek.com/a)");
    expect(html).toContain("<h2>Başlık</h2>");
    expect(html).toContain("<table>");
    expect(html).toContain('<a href="https://ornek.com/a" target="_blank" rel="noopener">kaynak</a>');
  });
  it("zararlı içerik atılır: script, javascript: link, onerror, iframe", () => {
    const html = renderMarkdown('<script>alert(1)</script>\n\n[x](javascript:alert(1))\n\n<img src="https://a/b.png" onerror="alert(1)">\n\n<iframe src="https://kotu"></iframe>');
    expect(html).not.toMatch(/<script|javascript:|onerror|<iframe/i);
    expect(html).toContain('<img src="https://a/b.png"');
  });
  it("okuma süresi en az 1 dk", () => {
    expect(readingMinutes("kısa")).toBe(1);
    expect(readingMinutes("kelime ".repeat(1000))).toBe(5);
  });
  it("jsdom zinciri geri gelmesin", async () => {
    const pkg = (await import("../package.json", { with: { type: "json" } })).default as { dependencies: Record<string, string> };
    expect(Object.keys(pkg.dependencies)).not.toContain("isomorphic-dompurify");
    expect(Object.keys(pkg.dependencies)).not.toContain("jsdom");
  });
});
