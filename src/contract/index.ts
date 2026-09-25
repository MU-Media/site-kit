import contract from "./routes.json";

/** Sitede bulunması zorunlu sayfalar ve rotalar (sözleşme §4). Dinamik segment adı serbest: [*] */
export const REQUIRED_PAGES: readonly string[] = contract.pages;
export const REQUIRED_ROUTES: readonly string[] = contract.routes;
export const REQUIRED_MARKERS = contract.markers;
export const CONTRACT_VERSION: number = contract.version;
