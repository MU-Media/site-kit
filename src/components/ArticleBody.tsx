import { renderMarkdown } from "../markdown";

/** engine'in Markdown gövdesini temizlenmiş HTML olarak basar. Stil için className ver. */
export function ArticleBody({ markdown, className = "ne-body" }: { markdown: string; className?: string }) {
  return <div className={className} dangerouslySetInnerHTML={{ __html: renderMarkdown(markdown) }} />;
}
