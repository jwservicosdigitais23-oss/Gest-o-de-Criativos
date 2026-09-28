import "server-only";

import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./env";

/**
 * Cliente com a SERVICE ROLE — ignora o RLS. Só pode ser usado no servidor
 * (convites, criação do primeiro acesso, limpeza do Storage).
 * O import "server-only" quebra o build se alguém importar isto no navegador.
 */
export function createAdminClient() {
  const url = SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada no servidor.");
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
