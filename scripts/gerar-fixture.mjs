// Gera fixtures/cronograma-exemplo.xlsx (planilha de exemplo usada nos testes).
// Usa variações de cabeçalho ("Data de publicação", "Copy") de propósito.
import * as XLSX from "xlsx";
import { writeFileSync } from "node:fs";

const linhas = [
  ["Data de publicação", "Hora", "Perfil", "Tema", "Copy", "Formato", "Pilar", "CTA", "Arquivo", "ID"],
  [new Date(Date.UTC(2030, 0, 15)), "09:00", "Edna Queiroz", "Exemplo de tema A", "Legenda de exemplo A", "Imagem", "Autoridade", "Comente", "exemplo-a.png", ""],
  ["16/01/2030", "18h30", "grupo adere", "Exemplo de tema B", "Legenda de exemplo B", "Carrossel", "", "", "exemplo-b.pdf", "CRONO-B"],
  ["32/01/2030", "", "Perfil Inexistente", "", "Legenda", "Vídeo", "", "", "", ""],
];
const ws = XLSX.utils.aoa_to_sheet(linhas, { cellDates: true });
ws["A2"].z = "dd/mm/yyyy";
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Cronograma");
writeFileSync("fixtures/cronograma-exemplo.xlsx", XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
console.log("fixtures/cronograma-exemplo.xlsx gerado");
