/**
 * Regras de senha (usadas na tela e revalidadas no servidor).
 * Mínimo de 10 caracteres, com letras e números.
 */
export const SENHA_MINIMO = 10;

export interface RegraSenha {
  id: "tamanho" | "letra" | "numero";
  rotulo: string;
  ok: boolean;
}

export function regrasSenha(senha: string): RegraSenha[] {
  return [
    { id: "tamanho", rotulo: `Pelo menos ${SENHA_MINIMO} caracteres`, ok: senha.length >= SENHA_MINIMO },
    { id: "letra", rotulo: "Pelo menos uma letra", ok: /\p{L}/u.test(senha) },
    { id: "numero", rotulo: "Pelo menos um número", ok: /\d/.test(senha) },
  ];
}

export function senhaValida(senha: string) {
  return senha.length <= 72 && regrasSenha(senha).every((r) => r.ok);
}

export const ERRO_SENHA = `A senha precisa ter pelo menos ${SENHA_MINIMO} caracteres, com letras e números.`;

/** Força de 0 a 4 (fraca → forte), para o indicador visual. */
export function forcaSenha(senha: string): { nivel: 0 | 1 | 2 | 3 | 4; rotulo: string } {
  if (!senha) return { nivel: 0, rotulo: "" };
  let pontos = 0;
  if (senha.length >= SENHA_MINIMO) pontos++;
  if (senha.length >= 14) pontos++;
  if (/[a-z]/.test(senha) && /[A-Z]/.test(senha)) pontos++;
  if (/\d/.test(senha)) pontos++;
  if (/[^\p{L}\d]/u.test(senha)) pontos++;
  if (!senhaValida(senha)) pontos = Math.min(pontos, 1);
  const nivel = Math.min(4, Math.max(1, pontos - 1)) as 1 | 2 | 3 | 4;
  return { nivel, rotulo: ["", "Fraca", "Razoável", "Boa", "Forte"][nivel]! };
}

// Sem caracteres ambíguos (0/O, 1/l/I) para ditar ou copiar sem erro.
const MINUSCULAS = "abcdefghijkmnpqrstuvwxyz";
const MAIUSCULAS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const NUMEROS = "23456789";
const SIMBOLOS = "!@#$%*-_";

/** Senha forte aleatória (crypto), sempre válida pelas regras acima. */
export function gerarSenha(tamanho = 14): string {
  const todos = MINUSCULAS + MAIUSCULAS + NUMEROS + SIMBOLOS;
  const aleatorio = (n: number) => {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return buf[0]! % n;
  };
  const obrigatorios = [
    MINUSCULAS[aleatorio(MINUSCULAS.length)]!,
    MAIUSCULAS[aleatorio(MAIUSCULAS.length)]!,
    NUMEROS[aleatorio(NUMEROS.length)]!,
    SIMBOLOS[aleatorio(SIMBOLOS.length)]!,
  ];
  const resto = Array.from({ length: Math.max(tamanho, SENHA_MINIMO) - obrigatorios.length }, () => todos[aleatorio(todos.length)]!);
  const chars = [...obrigatorios, ...resto];
  for (let i = chars.length - 1; i > 0; i--) {
    const j = aleatorio(i + 1);
    [chars[i], chars[j]] = [chars[j]!, chars[i]!];
  }
  return chars.join("");
}
