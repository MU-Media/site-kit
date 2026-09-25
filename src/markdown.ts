import DOMPurify from "isomorphic-dompurify";
import { marked } from "marked";

/** Pipeline Markdown'ı → güvenli HTML. Dış linkler yeni sekmede (kaynak atfı, nofollow değil). */
export function renderMarkdown(md: string): string {
  const html = marked.parse(md, { async: false, gfm: true }) as string;
  const clean = DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
  return clean.replace(/<a href="(https?:\/\/[^"]+)"/g, '<a href="$1" target="_blank" rel="noopener"');
}

export const readingMinutes = (md: string) => Math.max(1, Math.round(md.split(/\s+/).filter(Boolean).length / 200));
