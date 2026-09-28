/**
 * E-mails do Supabase Auth (convite e redefinição) com a identidade Adere.
 *
 * Fonte única: `npm run emails` grava supabase/templates/*.html usando os
 * marcadores do Supabase ({{ .SiteURL }}, {{ .Data.nome }}...). A mesma função
 * gera a pré-visualização do "Ver como" com os dados reais da aprovadora.
 */
export interface VarsEmail {
  siteUrl: string;
  link: string;
  nome: string;
  perfis: string;
}

/** Marcadores Go-template usados pelo Supabase nos arquivos de template. */
export const MARCADORES = {
  convite: {
    siteUrl: "{{ .SiteURL }}",
    link: "{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/primeiro-acesso",
    nome: "{{ .Data.nome }}",
    perfis: "{{ .Data.perfis }}",
  },
  recuperacao: {
    siteUrl: "{{ .SiteURL }}",
    link: "{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/auth/nova-senha",
    nome: "",
    perfis: "",
  },
} satisfies Record<string, VarsEmail>;

function moldura(v: VarsEmail, corpo: string) {
  return `<!doctype html>
<html lang="pt-BR">
<body style="margin: 0; padding: 24px 12px; background: #EEF3FA;">
<div style="font-family: Montserrat, 'Segoe UI', Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #2E3A59;">
  <div style="background: #001F4D linear-gradient(135deg, #001F4D 0%, #004C97 60%, #00AEEF 100%); padding: 28px 32px; border-radius: 16px 16px 0 0;">
    <img src="${v.siteUrl}/logo-adere-branco.png" width="170" height="60" alt="Adere · Gestão de Negócios" style="display: block; border: 0; width: 170px; height: auto;" />
    <p style="margin: 18px 0 0; display: inline-block; padding: 5px 12px; border: 1px solid rgba(0,174,239,0.6); border-radius: 999px; color: #FFFFFF; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase;">Aprovação de criativos</p>
  </div>
  <div style="background: #FFFFFF; padding: 32px; border: 1px solid #DCE3EE; border-top: 0; border-radius: 0 0 16px 16px;">
${corpo}
  </div>
  <p style="margin: 16px 0 0; text-align: center; font-size: 11px; color: #5E6D84;">Grupo Adere · Gestão de Negócios</p>
</div>
</body>
</html>
`;
}

function botao(link: string, texto: string) {
  return `    <p style="margin: 0 0 24px;">
      <a href="${link}" style="display: inline-block; background: #004C97; color: #FFFFFF; text-decoration: none; font-weight: 700; font-size: 15px; padding: 14px 26px; border-radius: 12px;">${texto}</a>
    </p>`;
}

export function emailConvite(v: VarsEmail) {
  return moldura(
    v,
    `    <h1 style="margin: 0 0 12px; color: #001F4D; font-size: 22px;">Olá, ${v.nome}! Seu acesso está pronto</h1>
    <p style="margin: 0 0 16px; line-height: 1.6;">
      Você foi convidada para o <strong>CRM de Aprovação de Criativos</strong> do Grupo Adere. É por lá que os posts do LinkedIn chegam para você aprovar, pedir ajustes ou reprovar.
    </p>
    <div style="margin: 0 0 24px; padding: 14px 16px; background: #EEF3FA; border-radius: 12px;">
      <p style="margin: 0; font-size: 12px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: #5E6D84;">Perfis que você vai aprovar</p>
      <p style="margin: 4px 0 0; font-size: 16px; font-weight: 700; color: #001F4D;">${v.perfis}</p>
    </div>
${botao(v.link, "Criar minha senha")}
    <p style="margin: 0 0 8px; font-size: 13px; line-height: 1.5; color: #5E6D84;">O link vale por 24 horas. Depois de criar a senha, é só entrar com o seu e-mail.</p>
    <p style="margin: 0; font-size: 12px; color: #5E6D84;">Se você não esperava este convite, pode ignorar este e-mail.</p>`,
  );
}

export function emailRecuperacao(v: VarsEmail) {
  return moldura(
    v,
    `    <h1 style="margin: 0 0 12px; color: #001F4D; font-size: 22px;">Redefinir sua senha</h1>
    <p style="margin: 0 0 24px; line-height: 1.6;">Recebemos um pedido para criar uma nova senha de acesso ao CRM de Aprovação de Criativos do Grupo Adere.</p>
${botao(v.link, "Criar nova senha")}
    <p style="margin: 0; font-size: 12px; color: #5E6D84;">Se não foi você, ignore este e-mail — sua senha continua a mesma.</p>`,
  );
}
