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

/**
 * Satır başındaki Türkçe sıra sayısı liste sanılmasın (v0.1.17): "9. nesil başlarken…" marked'da `<ol start="9">`
 * oluyordu. 1'den büyük, küçük harfle devam eden ve önünde bir önceki numaralı madde olmayan satır kaçırılır;
 * gerçek numaralı listeler (1'den başlar ya da ardışık) dokunulmadan kalır.
 */
export function escapeOrdinals(md: string): string {
  const lines = md.split("\n");
  return lines
    .map((line, i) => {
      const m = /^(\s{0,3})(\d{1,4})\.(\s+)(?=\p{Ll})/u.exec(line);
      if (!m) return line;
      const n = Number(m[2]);
      if (n <= 1) return line;
      const prev = lines.slice(Math.max(0, i - 8), i).some((l) => new RegExp(`^\\s{0,3}${n - 1}\\.\\s`).test(l));
      return prev ? line : `${m[1]}${m[2]}\\.${line.slice(m[1]!.length + m[2]!.length + 1)}`;
    })
    .join("\n");
}

/** Pipeline Markdown'ı → güvenli HTML. Dış linkler yeni sekmede (kaynak atfı, nofollow değil). */
export function renderMarkdown(md: string): string {
  const html = marked.parse(escapeOrdinals(md), { async: false, gfm: true }) as string;
  const clean = sanitizeHtml(html, OPTIONS);
  return (
    clean
      .replace(/<a href="(https?:\/\/[^"]+)"/g, '<a href="$1" target="_blank" rel="noopener"')
      // Tablolar yana kayan bir kutuda: mobilde geniş tablo sütun kesmesin (27 Eyl: 5 sütunlu fiyat tablosunun
      // "Fiyat" sütunu 390 px'te kesiliyordu). Klavyeyle kaydırılabilsin diye odaklanabilir bölge.
      .replace(/<table>/g, '<div class="ne-table" role="region" aria-label="Tablo" tabindex="0"><table>')
      .replace(/<\/table>/g, "</table></div>")
  );
}

export { readingMinutes } from "./util/reading";
