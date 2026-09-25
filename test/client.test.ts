import { describe, expect, it, vi } from "vitest";
import { createEngineClient, EngineError, orFallback, EMPTY_PAGE, TAGS } from "../src/client";

const res = (status: number, body: unknown = {}) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("engine istemcisi", () => {
  it("yazı: 200 ok, 404 missing, 410 gone", async () => {
    const f = vi.fn()
      .mockResolvedValueOnce(res(200, { slug: "a", title: "A" }))
      .mockResolvedValueOnce(res(404))
      .mockResolvedValueOnce(res(410, { status: "retracted" }));
    const c = createEngineClient({ engineUrl: "https://e.test/", site: "pokemon", fetch: f });
    expect(await c.getArticle("a")).toMatchObject({ status: "ok", article: { slug: "a" } });
    expect(await c.getArticle("b")).toEqual({ status: "missing" });
    expect(await c.getArticle("c")).toEqual({ status: "gone" });
    expect(f.mock.calls[0]![0]).toBe("https://e.test/api/public/sites/pokemon/articles/a");
    expect(f.mock.calls[0]![1].next.tags).toEqual([TAGS.article("a"), TAGS.articles]);
    expect(f.mock.calls[0]![1].next.revalidate).toBe(60);
  });

  it("liste sorgu parametrelerini kurar, boş değerleri atar", async () => {
    const f = vi.fn().mockResolvedValue(res(200, EMPTY_PAGE));
    const c = createEngineClient({ engineUrl: "https://e.test", site: "pokemon", fetch: f });
    await c.listArticles({ limit: 5, category: "tcg", author: "" });
    expect(f.mock.calls[0]![0]).toBe("https://e.test/api/public/sites/pokemon/articles?limit=5&category=tcg");
  });

  it("500 ve ağ hatası EngineError; orFallback boş duruma düşer", async () => {
    const c = createEngineClient({ engineUrl: "https://e.test", site: "x", fetch: vi.fn().mockResolvedValue(res(500)) });
    await expect(c.getSite()).rejects.toBeInstanceOf(EngineError);
    const d = createEngineClient({ engineUrl: "https://e.test", site: "x", fetch: vi.fn().mockRejectedValue(new Error("ECONNREFUSED")) });
    await expect(d.listArticles()).rejects.toBeInstanceOf(EngineError);
    expect(await orFallback(d.listArticles(), EMPTY_PAGE)).toBe(EMPTY_PAGE);
  });
});
