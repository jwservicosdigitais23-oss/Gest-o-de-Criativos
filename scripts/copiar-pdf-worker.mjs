// Copia o worker do pdf.js para /public (usado na prévia de carrossel em PDF).
// Nunca pode derrubar o `npm install`: em caso de erro, só avisa.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";

const origem = "node_modules/pdfjs-dist/build/pdf.worker.min.mjs";
try {
  if (existsSync(origem)) {
    // Num clone novo a pasta public/ pode não existir (o worker está no .gitignore).
    mkdirSync("public", { recursive: true });
    copyFileSync(origem, "public/pdf.worker.min.mjs");
  } else {
    console.warn("[copiar-pdf-worker] pdfjs-dist não encontrado; pulando.");
  }
} catch (erro) {
  console.warn("[copiar-pdf-worker] não foi possível copiar o worker:", erro.message);
}
