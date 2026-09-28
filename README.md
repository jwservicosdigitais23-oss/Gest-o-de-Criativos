# Adere · Aprovação de Criativos

CRM para aprovar os posts do LinkedIn da **Edna Queiroz**, da **Daniela Quintana** e do **Grupo Adere** antes da publicação — com a identidade visual do Grupo Adere.

> Princípio: **nada vai ao ar sem aprovação registrada.** Jonathan sobe o criativo, Edna e Daniela decidem (Aprovar, Revisar ou Reprovar), e cada decisão fica gravada com autora, data, versão e observação.

## Stack

| Camada | Tecnologia |
| --- | --- |
| Front-end | Next.js 16 (App Router) + TypeScript + Tailwind CSS 4 + componentes no padrão shadcn/ui (Radix) + lucide-react |
| Banco | Supabase Postgres com Row Level Security em todas as tabelas |
| Login | Supabase Auth (e-mail e senha + convite por e-mail) via `@supabase/ssr` |
| Mídia | Supabase Storage, bucket **privado** `midias` (leitura por URL assinada) |
| Tempo real | Supabase Realtime (notificações e decisões ao vivo) |
| Excel | SheetJS (`xlsx`), leitura no navegador |
| Hospedagem | Vercel (deploy automático a cada push na `main`) |

## Rodar localmente

```bash
npm install
cp .env.example .env.local   # preencha com as chaves do projeto Supabase
npm run dev                  # http://localhost:3000
```

### Variáveis de ambiente

Configure no `.env.local` (já está no `.gitignore`) **e** na Vercel (Project › Settings › Environment Variables):

| Variável | Onde é usada |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | navegador e servidor |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | navegador e servidor (respeita o RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | **somente no servidor** — convites, primeiro acesso e limpeza do Storage. O módulo `src/lib/supabase/admin.ts` importa `server-only`, então o build falha se alguém tentar usá-la no navegador. |

## Banco de dados e migrações

As migrações ficam em `supabase/migrations` e são aplicadas em ordem.

```bash
# Uma vez: vincular a pasta ao projeto do Supabase
supabase login
supabase link --project-ref <ref-do-projeto>

# Aplicar as migrações pendentes no projeto remoto
supabase db push
```

A primeira migração cria as tabelas (`membros`, `perfis`, `perfil_aprovadoras`, `posts`, `post_versoes`, `midias`, `decisoes`, `comentarios`, `importacoes`, `historico`, `notificacoes`), os enums, as políticas de RLS, o bucket privado `midias` e o seed com **apenas** os três perfis reais (nenhum post fictício).

### Papéis

- **Administrador** (Jonathan): lê e grava tudo.
- **Aprovadora** (Edna, Daniela): lê só os perfis em que é aprovadora e os posts desses perfis; grava apenas `decisoes` e `comentarios` em nome próprio.
- `decisoes` e `historico` aceitam só `INSERT` — nunca `UPDATE`/`DELETE` (política + `revoke` + trigger de bloqueio).

### Primeiro acesso

O **primeiro usuário cadastrado vira administrador**. Com o banco vazio, a tela de login mostra o link *"Criar o acesso de administrador"* (`/primeiro-acesso`). Depois disso, as demais pessoas só entram por convite, então o cadastro público pode (e deve) ficar desligado em *Supabase › Authentication › Sign In / Providers › Allow new users to sign up*.

## Testes

```bash
npm run lint
npm run typecheck
npm test                         # testes unitários
```

Os testes de banco (RLS, triggers, transições) rodam contra um Postgres local com as migrações aplicadas:

```bash
# Postgres local na porta 54329 (ex.: docker run -p 54329:5432 -e POSTGRES_HOST_AUTH_METHOD=trust postgres:16)
TEST_DATABASE_URL=postgres://postgres@localhost:54329/postgres npm run db:test-reset
TEST_DATABASE_URL=postgres://postgres@localhost:54329/adere_test npm test
```

`tests/db/supabase-stub.sql` recria o mínimo do ambiente Supabase (roles `anon`/`authenticated`, `auth.uid()`, `storage.objects`) para que as políticas possam ser testadas num Postgres puro.

## Convenções

- Português, datas `dd/mm/aaaa`, fuso `America/Sao_Paulo`. Data e hora de publicação são gravadas em colunas `date` e `time` (sem fuso) para não sofrer a conversão de UTC do Postgres.
- Design System do Grupo Adere configurado como tokens do Tailwind em `src/app/globals.css`.
- Logo: enquanto `public/logo-adere.svg` não for enviado, o componente `Logo` usa o texto "ADERE" + "Gestão de Negócios".

## Configurações (somente administrador)

- **Perfis**: criar, editar (nome único, tipo, LinkedIn, foto, aprovadoras, modo de aprovação), reordenar arrastando (define a ordem da sidebar), arquivar e excluir. Perfil com posts só sai da sidebar arquivando; a exclusão definitiva exige digitar o nome do perfil (função `excluir_perfil_definitivo`).
- **Membros**: convidar por e-mail (`supabase.auth.admin.inviteUserByEmail`, executado no servidor com a service role), reenviar convite, editar papel e perfis, desativar (bloqueia o login no Auth sem apagar o histórico).
- Todas as ações ficam registradas na tabela `historico`.

## Posts, upload e prévia

- **Página do perfil** (`/perfis/[id]`): KPIs (Aguardando, Em revisão, Aprovados no mês, Próximos 7 dias), Kanban/Lista, filtros de status, formato e mês.
- **Novo/editar post** (só admin): validação com zod, upload direto do navegador para o bucket `midias` em `{perfil_id}/{post_id}/v{versao}/{arquivo}` com barra de progresso, reordenar/remover, link externo (Drive/Canva) para arquivos grandes, aviso de proporção e prévia do LinkedIn ao vivo. O limite de upload fica em `LIMITE_UPLOAD_MB` (`src/lib/constantes.ts`).
- **Detalhe** (`/posts/[id]`): prévia estilo LinkedIn ("…ver mais" após ~210 caracteres, carrossel em PDF com pdf.js, player de vídeo), copiar legenda, baixar mídia, seletor de versões e ações do admin (editar, duplicar, excluir/arquivar, marcar como publicado).
- **Versões**: cada envio para aprovação grava um instantâneo em `post_versoes`; as mídias valem de `versao` até `versao_removida`. O status do post só muda pelas funções de transição (`enviar_para_aprovacao`, `marcar_publicado`, `arquivar_post`) — um `UPDATE` direto em `posts.status` é recusado pelo banco.

## Fluxo de aprovação

| De | Para | Quem |
| --- | --- | --- |
| Rascunho | Aguardando aprovação | admin envia |
| Aguardando | Aprovado · Em revisão · Reprovado | decisão da aprovadora |
| Em revisão | Aguardando (versão + 1) | admin ajusta e reenvia |
| Aprovado | Publicado | admin informa o link |
| Aprovado (editado) | Aguardando (versão + 1) | admin |
| Reprovado | novo rascunho | admin duplica |

- A aprovadora **só insere** em `decisoes`. O trigger `decisoes_validar` confere se o post está aguardando e fixa a versão atual; o trigger `decisoes_aplicar` (função `security definer`) recalcula o status e grava o histórico. A observação obrigatória também é validada por `CHECK` (Revisar ≥ 10 caracteres; Reprovar exige motivo).
- **Modo "todas"** (ex.: Grupo Adere): fica aguardando até todas as aprovadoras ativas aprovarem a versão atual ("1 de 2 aprovações"); qualquer revisão → Em revisão; reprovação prevalece. **Modo "qualquer uma"**: a primeira decisão define o status.
- Linha do tempo com todas as ações, observações em destaque âmbar, respostas do Jonathan como comentários e a observação da versão anterior exibida junto da nova versão.
- Testes das transições: `tests/db/fluxo-aprovacao.test.ts`.

## Painel e notificações

- **Painel do administrador**: 5 KPIs calculados no banco pela função `painel_kpis()` (Aguardando aprovação — também por aprovadora —, Em revisão, Aprovados para a semana, Atrasados, Tempo médio de aprovação), bloco "Precisa da sua ação" (posts em revisão com a observação), "Próximos 7 dias" (vermelho se vai ao ar em até 24h sem aprovação) e "Por perfil" (view `perfis_status`).
- **Painel da aprovadora**: fila "Para você aprovar" (`fila_aprovadora()`, ordenada por prazo, selos "Vence amanhã"/"Atrasado") e "Suas últimas decisões".
- **Notificações**: geradas por triggers (envio, reenvio, decisão, comentário) na tabela `notificacoes` (RLS: cada um vê e marca como lida só as suas). O sino da topbar usa Supabase Realtime — contador e lista atualizam sem recarregar.
- **WhatsApp**: no detalhe do post aguardando, "Copiar link para WhatsApp" gera o texto pronto para cada aprovadora que ainda não decidiu.
