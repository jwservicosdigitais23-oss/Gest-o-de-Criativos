# Validação · fila do Grupo Adere (Edna e Daniela)

Branch: `fix/fila-grupo-adere`. Este repositório não tem `main`; a base é `claude/crm-sprints-prompts-f5mt16`, a branch de produção.

## 1. Diagnóstico (01/10/2026, produção, só leitura)

Todas as consultas rodaram no projeto Supabase `heiwuuqdjxrtmfzeatkv` apenas com `SELECT`. Nada foi alterado.

### Resumo

O código e o RLS estão corretos e não dependem de login. **O problema está nos dados:** o perfil **Grupo Adere não tem nenhuma aprovadora vinculada**. Por isso os 2 posts dele que estão aguardando não aparecem para ninguém, não geraram notificação e não podem ser decididos. Há também duas falhas menores no código e uma pendência operacional.

| # | Verificação | Resultado | Evidência |
|---|---|---|---|
| 1 | Edna e Daniela existem em `auth.users` e em `membros`, ativas, papel aprovadora | ✅ Sim | Edna `f7177645-…` e Daniela `d72a573e-…`: mesmo id nas duas tabelas, `papel = aprovadora`, `ativo = true` |
| 2 | Status de cada uma | ⚠️ **Convite pendente, sem senha** | As duas foram cadastradas por **convite por e-mail** (`invited_at` preenchido, `email_confirmed_at` nulo, `last_sign_in_at` nulo, `deve_trocar_senha = true`). Sem SMTP próprio, o Supabase só entrega e-mail para quem é da equipe do projeto, então **nenhuma das duas consegue entrar hoje**. Nenhuma senha provisória foi gerada (o histórico só tem `convidou_membro` com `forma: convite`). |
| 3 | `perfil_aprovadoras`: Edna→Edna Queiroz | ✅ Existe | perfil `882130b4-…` |
| 4 | `perfil_aprovadoras`: Daniela→Daniela Quintana | ✅ Existe | perfil `16b3d13d-…` |
| 5 | `perfil_aprovadoras`: Edna→Grupo Adere | ❌ **Falta** | Grupo Adere (`d7026ff7-…`) tem **0 aprovadoras**. No histórico, o convite da Edna levou só `perfis: [Edna Queiroz]`. |
| 6 | `perfil_aprovadoras`: Daniela→Grupo Adere | ❌ **Falta** | Convite da Daniela com `perfis: [Daniela Quintana]`. |
| 7 | Os vínculos usam o mesmo id de `auth.users` | ✅ Sim | Nenhum vínculo sem usuário correspondente (`vinculos_sem_auth = 0` nos 3 perfis) |
| 8 | Modo de aprovação | ℹ️ Grupo Adere = **todas**; Edna Queiroz e Daniela Quintana = **qualquer uma** | `perfis.modo_aprovacao` |
| 9 | Posts do Grupo Adere aguardando | ❌ 2 posts, **na fila de ninguém** | "Webinar - Crédito do Trabalhador no RM" (v1, pub. 28/09, prazo 28/09) e "Webinar 06/10 · IoT + IA: AIoT" (v1, pub. 02/10, prazo 05/10). Nenhuma decisão na versão atual. `pendencias_aprovadoras` vazio e nenhuma notificação. |
| 10 | Modo "todas" sem aprovadoras | ❌ Post travado | `status_pelas_decisoes` exige que `aprovados ≥ total`; com 0 aprovadoras, ninguém pode decidir (`validar_decisao` recusa) e o post fica em Aguardando para sempre. |
| 11 | RLS depende de primeiro login? | ✅ Não | `is_aprovadora_do_perfil` = vínculo em `perfil_aprovadoras` + `membros.ativo`. `pode_ver_perfil` e `pode_ver_post` usam essa função. As políticas de perfis, posts, mídias, decisões e comentários, a leitura do bucket `midias` (via `midias.post_id` → `pode_ver_post`) e a trigger `validar_decisao` usam só esses dois critérios. Nada olha `ultimo_acesso`, `deve_trocar_senha`, e-mail confirmado ou registro criado no login. Notificações filtram por `destinatario_id = auth.uid()`. |
| 12 | Painel "Para você aprovar" | ✅ Fonte única | `fila_aprovadora()` → view `pendencias_aprovadoras`, que mostra os posts aguardando dos perfis vinculados em que ela ainda não decidiu na versão atual. O KPI do banner conta a mesma view. |
| 13 | Contador da sidebar e cartão "N aguardando aprovação" | ❌ **Outra fonte** | `src/lib/shell.ts › carregarPerfisMenu` conta **todos** os posts `status = 'aguardando'` do perfil, e não a fila dela. No modo "todas", depois que a Edna aprova, o post continua com contador 1 na sidebar dela, mas sai do Painel. Os números não batem. |
| 14 | Página do perfil (Kanban) | ✅ OK | Filtra só por `perfil_id`; o acesso é controlado pelo RLS (vínculo). |
| 15 | Notificações no envio | ✅ Não dependem de login | Trigger `notificar_envio`: insere para todas as aprovadoras vinculadas e ativas (`perfil_aprovadoras` + `m.ativo`). Prova: o post "Repostagem Webinar…" (enviado em 01/10) notificou a Edna, que nunca entrou. |
| 16 | Aprovadora vinculada **depois** do envio | ❌ Sem notificação | A fila é dinâmica (a view), então o post aparece. Mas nenhuma notificação é criada. Em produção, "Relacionamento" (Edna) e "Decisão de tecnologia…" (Daniela) foram enviados em 28/09, antes do cadastro delas, e estão **sem notificação**. |
| 17 | Depois do `/primeiro-acesso` | ✅ OK | `salvarPrimeiraSenha` → `concluir_troca_senha()` → `router.replace("/?boas-vindas=1")`, que é o Painel com a fila e o tour. |

### Fila de cada aprovadora hoje (produção)

| Post aguardando | Perfil | Na fila da Edna? | Na fila da Daniela? | Notificada(s) |
|---|---|---|---|---|
| Relacionamento | Edna Queiroz | ✅ | — (não é dela) | ninguém |
| Repostagem Webinar - Crédito do Trabalhador no RM | Edna Queiroz | ✅ | — | Edna |
| Decisão de tecnologia é decisão de negócio, não só de TI | Daniela Quintana | — | ✅ | ninguém |
| Webinar - Crédito do Trabalhador no RM | **Grupo Adere** | ❌ | ❌ | ninguém |
| Webinar 06/10 · IoT + IA: AIoT | **Grupo Adere** | ❌ | ❌ | ninguém |

### O que proponho corrigir

1. **Dados (migração idempotente):** criar os vínculos Edna→Grupo Adere e Daniela→Grupo Adere, localizados pelo e-mail e pelo nome do perfil, com `on conflict do nothing`.
2. **Notificação ao vincular:** trigger em `perfil_aprovadoras` (AFTER INSERT) que cria a notificação de cada post aguardando daquele perfil em que ela ainda não decidiu, sem duplicar. Mais um **backfill** único para os posts pendentes de hoje. Em produção, isso cria 2 notificações para o Grupo Adere × 2 aprovadoras, mais "Relacionamento" (Edna) e "Decisão de tecnologia…" (Daniela).
3. **Contadores da sidebar = fila:** `carregarPerfisMenu` passa a contar pela mesma fonte do Painel (`pendencias_aprovadoras` filtrada pela aprovadora). O admin continua vendo o total aguardando do perfil.
4. **Progresso por pessoa** no card e no detalhe dos posts no modo "todas": "Edna: aprovou · Daniela: pendente".
5. **Testes** (Vitest no Postgres de teste; Playwright com o harness local, nunca em produção) para todos os cenários do pedido.

Ação **sua**, que não é código: as duas ainda não têm senha. Depois do deploy, em Membros, use **Gerar nova senha provisória** para cada uma (isso também confirma o e-mail) e mande pelo WhatsApp.

## 2. Correções feitas

| O que estava errado | Correção | Onde |
|---|---|---|
| Grupo Adere sem aprovadoras | Vínculos Edna→Grupo Adere e Daniela→Grupo Adere, localizados por e-mail e nome do perfil, com `on conflict do nothing` (idempotente) | `supabase/migrations/20261001100000_fila_grupo_adere.sql` (aplicada em produção em 01/10) |
| Aprovadora vinculada depois do envio não recebia notificação | Trigger `perfil_aprovadoras_notificar` (AFTER INSERT) → `notificar_pendencias(membro, perfil)`: avisa cada post aguardando em que ela ainda não decidiu, sem duplicar | mesma migração |
| Posts pendentes sem notificação | Backfill `select notificar_pendencias()`: criou 6 notificações (2 posts do Grupo Adere × 2 aprovadoras, mais "Relacionamento" para a Edna e "Decisão de tecnologia…" para a Daniela) | mesma migração |
| Contador da sidebar contava todos os posts aguardando do perfil | A view `pendencias_aprovadoras` ganhou `perfil_id`; para a aprovadora (e no "Ver como"), a sidebar conta a mesma view do Painel. O admin continua vendo o total aguardando. | `src/lib/shell.ts`, `src/app/(app)/layout.tsx` |
| Progresso só em número ("1 de 2") | "Edna: aprovou · Daniela: pendente" no card do Kanban e no detalhe do post (modo "todas", aguardando) | `src/lib/progresso.ts`, `perfis/[id]/page.tsx`, `posts/[id]/page.tsx` |

Não mudou: RLS, regras do fluxo (`status_pelas_decisoes`, `validar_decisao`, `aplicar_decisao`), visual e telas. Visibilidade e decisão continuam dependendo só de **membro ativo + vínculo em `perfil_aprovadoras`**.

## 3. Testes

Vitest (`npm test`, 110 testes, todos passando) num Postgres local com todas as migrações. Nunca em produção.

`tests/db/fila-grupo-adere.test.ts`, com as duas aprovadoras como em produção (convite pendente, nunca entraram):

| Cenário | Resultado |
|---|---|
| Modo do Grupo Adere é "todas" | ✅ |
| Post do Grupo Adere enviado entra na fila das duas e notifica as duas, sem login; depois do primeiro acesso, continua na fila e na notificação | ✅ |
| As duas aprovam, revisam (com observação) e reprovam no Grupo Adere e no próprio perfil | ✅ |
| Revisar sem observação é recusado | ✅ |
| Edna não lê nem decide em post da Daniela, e vice-versa (SQL direto, via RLS) | ✅ |
| Modo todas: 1 aprovação = Aguardando "1 de 2" e sai só da fila de quem decidiu; a 2ª aprova; revisão de qualquer uma → Em revisão; nova versão zera as aprovações e volta para a fila das duas | ✅ |
| Aprovadora vinculada depois do envio vê o post e recebe a notificação; desvincular e vincular de novo não duplica | ✅ |
| Contador por perfil (sidebar) = fila do Painel | ✅ |
| Migração: vínculos idempotentes (rodados 2×), backfill não duplica | ✅ |

`src/lib/progresso.test.ts`: o texto "Edna: aprovou · Daniela: pendente" e o fato de que decisões de versões anteriores não contam.

Playwright: `e2e/fila-grupo-adere.spec.ts` (fila e contadores na tela) e `e2e/acessos.spec.ts` precisam de usuários de teste (`E2E_*`) num ambiente de preview. Aqui rodaram os 6 testes sem login; os de login ficaram como *skipped*, porque este ambiente não acessa o Supabase.

## 4. Produção depois da correção (01/10, só leitura)

| Post aguardando | Perfil (modo) | Fila da Edna | Fila da Daniela | Notificadas | Decisões na versão atual |
|---|---|---|---|---|---|
| Relacionamento | Edna Queiroz (qualquer uma) | ✅ | — | Edna | 0 |
| Repostagem Webinar - Crédito do Trabalhador no RM | Edna Queiroz (qualquer uma) | ✅ | — | Edna | 0 |
| Decisão de tecnologia é decisão de negócio, não só de TI | Daniela Quintana (qualquer uma) | — | ✅ | Daniela | 0 |
| Webinar - Crédito do Trabalhador no RM | **Grupo Adere (todas)** | ✅ | ✅ | Edna, Daniela | 0 |
| Webinar 06/10 · IoT + IA: AIoT | **Grupo Adere (todas)** | ✅ | ✅ | Edna, Daniela | 0 |

| Aprovadora | Perfis | Itens na fila | Notificações não lidas |
|---|---|---|---|
| Edna Queiroz | Edna Queiroz, Grupo Adere | 4 | 4 |
| Daniela Quintana | Daniela Quintana, Grupo Adere | 3 | 3 |

Nenhum post foi criado, alterado ou decidido, e nenhum e-mail foi enviado (as notificações são só internas).

**Prints do "Ver como":** não foi possível tirar daqui, porque este ambiente não acessa o Supabase de produção nem tem a sua sessão de admin. Para conferir: entre como admin › avatar › **Ver como Edna Queiroz** › Painel (4 em "Para você aprovar") e a página do Grupo Adere (os 2 webinars em Aguardando, com "Edna: pendente · Daniela: pendente"). Depois repita com a Daniela (3 na fila).
