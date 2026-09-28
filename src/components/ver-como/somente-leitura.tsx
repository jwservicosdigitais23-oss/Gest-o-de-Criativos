"use client";

import { createContext, useContext } from "react";

/** Presente só no "Ver como": nome da pessoa cuja visão está sendo montada. */
const Contexto = createContext<{ nome: string } | null>(null);

export function SomenteLeituraProvider({ nome, children }: { nome: string | null; children: React.ReactNode }) {
  return <Contexto.Provider value={nome ? { nome } : null}>{children}</Contexto.Provider>;
}

export function useSomenteLeitura() {
  return useContext(Contexto);
}

/** "Apenas a Edna pode decidir" */
export function dicaSomenteLeitura(nome: string, acao = "decidir") {
  return `Apenas a ${nome.split(" ")[0]} pode ${acao}`;
}
