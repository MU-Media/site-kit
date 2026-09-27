/** Okuma süresi (dk). Bağımlılıksız: sayfa sadece bunu içe aktarırsa Markdown/temizleme kütüphaneleri yüklenmez. */
export const readingMinutes = (md: string) => Math.max(1, Math.round(md.split(/\s+/).filter(Boolean).length / 200));
