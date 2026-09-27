import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

/**
 * Temizleme sanitize-html ile (CommonJS, jsdom yok). Önceden isomorphic-dompurify → jsdom kullanılıyordu;
 * jsdom'un ESM-only alt bağımlılıkları Vercel'in fonksiyon ortamında require() edilemediği için yazı sayfası
 * her istekte 500 veriyordu (site-kit#1). Yerelde `next start` sorunu göstermiyordu.
 */
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [...sanitizeHtml.defaults.allowedTags, "img", "h1", "h2", "del", "ins", "sup", "sub"],
  allowedAttributes: {
    a: ["href", "name", "title", "target", "rel"],
    img: ["src", "alt", "title", "width", "height"],
    code: ["class"],
    th: ["align"],
    td: ["align"],
    ol: ["start"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesByTag: { img: ["http", "https"] },
  allowProtocolRelative: false,
};

/** Pipeline Markdown'ı → güvenli HTML. Dış linkler yeni sekmede (kaynak atfı, nofollow değil). */
export function renderMarkdown(md: string): string {
  const html = marked.parse(md, { async: false, gfm: true }) as string;
  const clean = sanitizeHtml(html, OPTIONS);
  return clean.replace(/<a href="(https?:\/\/[^"]+)"/g, '<a href="$1" target="_blank" rel="noopener"');
}

export { readingMinutes } from "./util/reading";
