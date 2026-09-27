/** Kaynak listesi ve SSS: Markdown/temizleme kütüphanelerine bağlı değil (ArticleBody'den ayrı dosya). */
export function SourceList({ sources, title = "Kaynaklar", className = "ne-sources" }: { sources: { title: string; url: string }[]; title?: string; className?: string }) {
  if (!sources?.length) return null;
  return (
    <section className={className} aria-label={title}>
      <h2>{title}</h2>
      <ul>
        {sources.map((s) => (
          <li key={s.url}>
            <a href={s.url} target="_blank" rel="noopener">{s.title || new URL(s.url).hostname}</a>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function FaqList({ faq, title = "Sık sorulan sorular", className = "ne-faq" }: { faq: { q: string; a: string }[]; title?: string; className?: string }) {
  if (!faq?.length) return null;
  return (
    <section className={className} aria-label={title}>
      <h2>{title}</h2>
      {faq.map((f) => (
        <details key={f.q}>
          <summary>{f.q}</summary>
          <p>{f.a}</p>
        </details>
      ))}
    </section>
  );
}
