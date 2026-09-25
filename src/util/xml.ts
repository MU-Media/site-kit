export const xmlEscape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

const CACHE = "public, max-age=0, s-maxage=300, stale-while-revalidate=600";

export const xmlResponse = (body: string, type = "application/xml") =>
  new Response(body, { headers: { "Content-Type": `${type}; charset=utf-8`, "Cache-Control": CACHE } });

export const textResponse = (body: string, status = 200) =>
  new Response(body, { status, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": CACHE } });

export const lang = (locale: string) => locale.split("-")[0] ?? "tr";
