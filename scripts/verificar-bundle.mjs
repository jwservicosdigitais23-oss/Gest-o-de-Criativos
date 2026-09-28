// Garante que a SUPABASE_SERVICE_ROLE_KEY nunca chega ao código do navegador.
// Procura o nome da variável e o valor configurado em .next/static (bundle público).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const raiz = ".next/static";
const valor = process.env.SUPABASE_SERVICE_ROLE_KEY;
const proibidos = ["SUPABASE_SERVICE_ROLE_KEY", ...(valor && valor.length > 8 ? [valor] : [])];
const achados = [];

function varrer(dir) {
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) varrer(caminho);
    else if (/\.(js|mjs|css|html|json|map)$/.test(nome)) {
      const conteudo = readFileSync(caminho, "utf8");
      for (const p of proibidos) if (conteudo.includes(p)) achados.push(`${caminho}: contém ${p === valor ? "o valor da service role" : p}`);
    }
  }
}

try {
  varrer(raiz);
} catch {
  console.error("Rode `npm run build` antes (pasta .next/static não encontrada).");
  process.exit(1);
}
if (achados.length) {
  console.error("A service role apareceu no bundle do navegador:\n" + achados.join("\n"));
  process.exit(1);
}
console.log(`OK: a service role não aparece em ${raiz}.`);
