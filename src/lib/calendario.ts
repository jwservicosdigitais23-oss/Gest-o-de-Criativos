import { diaDaSemana, somarDias } from "./datas";

/** Grade do mês (semanas de domingo a sábado), com os dias de fora do mês. */
export function gradeDoMes(ano: number, mes: number): string[] {
  const primeiro = `${ano}-${String(mes).padStart(2, "0")}-01`;
  const inicio = somarDias(primeiro, -diaDaSemana(primeiro));
  const proximoMes = mes === 12 ? `${ano + 1}-01-01` : `${ano}-${String(mes + 1).padStart(2, "0")}-01`;
  const ultimo = somarDias(proximoMes, -1);
  const fim = somarDias(ultimo, 6 - diaDaSemana(ultimo));
  const dias: string[] = [];
  for (let d = inicio; d <= fim; d = somarDias(d, 1)) dias.push(d);
  return dias;
}

export function semanaDe(data: string): string[] {
  const inicio = somarDias(data, -diaDaSemana(data));
  return Array.from({ length: 7 }, (_, i) => somarDias(inicio, i));
}

export function navegar(modo: "mes" | "semana", data: string, delta: number): string {
  if (modo === "semana") return somarDias(data, 7 * delta);
  const [a, m] = data.split("-").map(Number);
  const total = a! * 12 + (m! - 1) + delta;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}-01`;
}
