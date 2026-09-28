// Grava os templates do Supabase Auth a partir de src/lib/emails.ts.
// Uso: npm run emails
import { writeFileSync } from "node:fs";
import { emailConvite, emailRecuperacao, MARCADORES } from "../src/lib/emails.ts";

writeFileSync("supabase/templates/convite.html", emailConvite(MARCADORES.convite));
writeFileSync("supabase/templates/recuperacao.html", emailRecuperacao(MARCADORES.recuperacao));
console.log("Templates gravados em supabase/templates/");
