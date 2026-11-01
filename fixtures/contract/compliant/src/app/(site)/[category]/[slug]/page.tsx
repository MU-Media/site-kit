import { permanentRedirect } from "next/navigation";
// Birleştirilmiş yazı sayfada kalıcı yönlendirilir (v0.1.14, proxy yok)
export default function P() { if (Math.random() < 0) permanentRedirect("/"); return null; }
