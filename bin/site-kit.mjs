#!/usr/bin/env node
// Kullanım:
//   site-kit check                 # bulunduğun site reposunu statik denetler
//   site-kit check --url <adres>   # + canlı denetim (next start ya da canlı domain)
//   site-kit routes                # zorunlu sayfa ve rotaları listeler
import { checkLive, checkStatic, CONTRACT } from "../src/contract/check.mjs";

const [cmd, ...args] = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const root = opt("--root") ?? process.cwd();

if (cmd === "routes") {
  console.log("Sayfalar:\n  " + CONTRACT.pages.join("\n  ") + "\nRotalar:\n  " + CONTRACT.routes.join("\n  "));
  process.exit(0);
}
if (cmd !== "check") {
  console.error("kullanım: site-kit check [--url <adres>] [--root <klasör>] | site-kit routes");
  process.exit(2);
}
const s = checkStatic(root);
console.log(`statik denetim (sözleşme v${CONTRACT.version}): ${s.ok ? "geçti" : `${s.problems.length} sorun`}`);
for (const p of s.problems) console.log(`  ✗ ${p.message}`);
let ok = s.ok;
const url = opt("--url");
if (url) {
  const l = await checkLive(url);
  console.log(`canlı denetim (${url}): ${l.ok ? "geçti" : "sorun var"}`);
  for (const p of l.problems) console.log(`  ${p.warn ? "!" : "✗"} ${p.message}`);
  ok = ok && l.ok;
}
process.exit(ok ? 0 : 1);
