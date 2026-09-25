/** JSON-LD'yi </script> kaçışıyla güvenle gömer */
export const ldJson = (data: unknown) => JSON.stringify(data).replace(/</g, "\\u003c");

export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(data) }} />;
}
