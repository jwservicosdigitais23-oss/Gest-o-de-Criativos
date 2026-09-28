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
| `VER_COMO_SECRET` | opcional, **somente no servidor** — chave do cookie assinado do "Ver como". Sem ela, é derivada da `SUPABASE_SERVICE_ROLE_KEY`. |
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

O **primeiro usuário cadastrado vira administrador**. Com o banco vazio, a tela de login mostra o link *"Criar o acesso de administrador"* (`/instalar`). Depois disso, as demais pessoas só entram por convite, então o cadastro público pode (e deve) ficar desligado em *Supabase › Authentication › Sign In / Providers › Allow new users to sign up*.

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
- **Membros**: *+ Adicionar aprovadora* (ver abaixo), reenviar convite, gerar nova senha provisória, enviar link de redefinição, editar perfis, desativar (bloqueia o login no Auth sem apagar o histórico) e *Ver como*.
- Todas as ações ficam registradas na tabela `historico`.

## Acessos das aprovadoras e "Ver como" (Prompt 9)

- **Visibilidade no banco**: a aprovadora só vê e decide nos perfis de `perfil_aprovadoras` (Edna → Edna Queiroz + Grupo Adere; Daniela → Daniela Quintana + Grupo Adere). O RLS de perfis, posts, mídias, decisões, comentários, histórico, notificações, membros e do bucket `midias` garante isso; `tests/db/acessos.test.ts` prova.
- **+ Adicionar aprovadora**: nome, e-mail, perfis e forma de acesso — *convite por e-mail* (`inviteUserByEmail`, link cai em `/primeiro-acesso`) ou *senha provisória* (`admin.createUser` com `email_confirm`; botão *Gerar senha*; mínimo de 10 caracteres com letras e números). A senha aparece **uma única vez** com *Copiar*; vai só para o Supabase Auth e nunca para tabela, histórico ou log (`src/lib/acessos.test.ts`). Nos dois casos `membros.deve_trocar_senha = true`.
- **Status**: *Convite pendente* (ainda não criou a própria senha), *Ativa* e *Desativada*, com o último acesso.
- **Primeiro acesso** (`/primeiro-acesso`): enquanto `deve_trocar_senha` for verdadeiro, o middleware manda a pessoa para lá. Ela cria a senha (força + regras visíveis), `concluir_troca_senha()` baixa a flag e registra no histórico, e um tour de 3 passos apresenta o CRM.
- **Minha conta** (menu do avatar): trocar a senha confirmando a atual.
- **Ver como** (só admin): menu do avatar ou linha do membro. Não há login como ela: um cookie assinado (HMAC, 30 min) guarda quem está sendo visualizado, e o servidor monta sidebar, painel, perfis, posts, calendário, busca e notificações só com os perfis dela. Faixa âmbar no topo, botões de decisão e comentário desabilitados ("Apenas a Edna pode decidir") e **toda server action de gravação é recusada** (`exigirMembro({ gravacao: true })`, conferido em `src/lib/auth.test.ts`). Pré-visualizações: tela de login, e-mail de convite e primeiro acesso. Entrada e saída ficam no histórico ("Jonathan visualizou como Edna Queiroz").
- **E-mails**: `src/lib/emails.ts` é a fonte; `npm run emails` regrava `supabase/templates/*.html`.
- **E2E**: `npm run build && npm run e2e` (Playwright). Os fluxos com login real rodam quando as variáveis `E2E_*` do topo de `e2e/acessos.spec.ts` estão definidas (ex.: `E2E_BASE_URL` apontando para o preview).

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

## Importação e exportação do cronograma (Excel)

- **Importar** (`/importar`, só admin): lê o .xlsx/.csv **no navegador** com SheetJS. Colunas: Data · Hora · Perfil · Tema · Legenda · Formato · Pilar · CTA · Arquivo · ID (reconhece variações como "Data de publicação", "Copy", "Script", "Texto"; se faltar coluna obrigatória, abre o mapeamento manual).
- Pré-visualização com selos **Novo / Atualiza / Ignorada / Erro** e motivo. Nada é gravado antes de "Importar {n} posts"; a gravação é feita pela função `importar_cronograma` numa única transação e registrada em `importacoes`.
- Regras: chave = coluna ID (ou Perfil + Data + Tema); chave existente atualiza em vez de duplicar; posts Aprovados/Publicados nunca são sobrescritos; perfil não cadastrado vira erro com atalho "Criar perfil agora"; data passada pede confirmação; legenda acima de 3.000 caracteres gera aviso; importados entram como Rascunho com origem `importacao`.
- **Anexo em lote**: após importar, solte as mídias — cada arquivo vai para o post cuja coluna Arquivo tem o mesmo nome. Depois, "Enviar para aprovação os que já têm mídia".
- **Exportar**: `/exportar` (com `?perfil=`, `?de=`, `?ate=`) gera o .xlsx com as mesmas colunas + Status, Versão e Última observação. `/exportar/modelo` baixa o modelo vazio.
- Planilha de exemplo para os testes: `fixtures/cronograma-exemplo.xlsx` (`npm run fixture` recria).

## Calendário

`/calendario`: visão Mês/Semana com navegação e "Hoje", filtros por perfil (chips com avatar) e status, pílulas com avatar + hora + tema na cor do status, "+n" abre a lista do dia, dia de hoje com borda `#00AEEF`, "+" para o admin criar post na data, arrastar um post para outro dia (confirmação; se aprovado, volta para aprovação) e "Exportar cronograma" do período. No celular, a grade vira lista agrupada por dia. As datas são colunas `date` puras, então não há conversão de UTC.

## Segurança e qualidade (Prompt 8)

- RLS revisado em todas as tabelas e no bucket `midias`; testes em `tests/db/seguranca.test.ts` provam que a aprovadora não lê posts de perfis que não são dela, não grava decisão em nome de outra pessoa e não altera posts, e que ninguém (nem o admin) altera ou apaga `decisoes` e `historico`.
- **Security Advisor do Supabase**: executado após as migrações. Os alertas corrigidos estão em `20260928190000_security_advisor.sql`. Restam avisos intencionais (nível WARN) de funções `SECURITY DEFINER` executáveis por usuários logados: as auxiliares do RLS (`is_admin`, `pode_ver_post`…, necessárias para as políticas e que só revelam o acesso de quem chama), `registrar_acesso`, e as de admin (`uso_storage`, `arquivos_orfaos`, `excluir_perfil_definitivo`), que conferem `is_admin()` por dentro. `sistema_tem_admin()` é pública de propósito (tela de primeiro acesso).
- `SUPABASE_SERVICE_ROLE_KEY` só em `src/lib/supabase/admin.ts` (com `server-only`); `npm run check:bundle` confere o bundle do navegador.
- Conflito de edição: o formulário envia o `updated_at` lido; se o post mudou, aparece "Este post foi alterado por outra pessoa" com o botão Recarregar.
- Contraste AA: tons escurecidos para texto secundário (#5E6D84), selos e botões de decisão (verde #15803D, âmbar #B45309); foco visível em #00AEEF; navegação por teclado; estados vazios, de erro e skeletons.
- CI: `.github/workflows/ci.yml` roda lint, tipos, migrações + testes num Postgres, build e a verificação do bundle a cada pull request.

## Colocar no ar

Infraestrutura já criada:

- **Supabase**: projeto `adere-crm-criativos` (ref `heiwuuqdjxrtmfzeatkv`, região São Paulo, plano Free) com **todas as migrações aplicadas** e o seed dos três perfis.
  As migrações foram aplicadas pela API com outro número de versão; antes do primeiro `supabase db push`, marque-as como aplicadas para o CLI não tentar rodá-las de novo:
  `supabase migration repair --status applied 20260928120000 20260928130000 20260928140000 20260928150000 20260928160000 20260928170000 20260928180000 20260928190000 20260928200000 20260929100000`

Passos que dependem de você (não puderam ser feitos daqui):

1. **Vercel ↔ GitHub**: instale o app da Vercel no GitHub (https://github.com/apps/vercel) com acesso a este repositório. Depois, na Vercel (time `jw-servicos`), importe o repositório como projeto `adere-crm-criativos` (framework Next.js). Confirme que o time está no plano **Pro** (o Hobby não permite uso comercial).
2. **Variáveis na Vercel** (Production e Preview): `NEXT_PUBLIC_SUPABASE_URL=https://heiwuuqdjxrtmfzeatkv.supabase.co`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Supabase › Project Settings › API Keys › anon) e `SUPABASE_SERVICE_ROLE_KEY` (mesma tela, **service_role**; marque como *Sensitive*).
3. **Deployment Protection**: em Project › Settings › Deployment Protection, deixe a "Vercel Authentication" só para *Preview*, senão as aprovadoras precisariam de conta na Vercel.
4. **Supabase Auth** (Authentication › URL Configuration): Site URL = `https://gest-o-de-criativos.vercel.app`; Redirect URLs = `https://<produção>/**` e `http://localhost:3000/**`. Em *Email Templates*, cole `supabase/templates/convite.html` (Invite) e `supabase/templates/recuperacao.html` (Reset password) — eles usam `token_hash`, necessário para o link funcionar no celular da pessoa. Em *Sign In / Providers*, desligue "Allow new users to sign up". (Ou rode `supabase config push` com o `supabase/config.toml`.)
5. **Merge na `main`**: a branch de trabalho é `claude/crm-sprints-prompts-f5mt16`; ao fazer o merge, a Vercel publica em produção.
6. Envie o logo oficial para `public/logo-adere.svg` e troque o texto no componente `Logo`.

### Primeiro acesso e convites

1. Abra a URL de produção › "Criar o acesso de administrador" (`/instalar`, Jonathan). Só funciona enquanto não houver admin.
2. **Configurações › Membros › + Adicionar aprovadora**: Edna Queiroz (perfis *Edna Queiroz* e *Grupo Adere*) e Daniela Quintana (*Daniela Quintana* e *Grupo Adere*), por convite ou senha provisória.
3. Elas recebem o e-mail "Criar minha senha" (ou a senha provisória por WhatsApp), criam a senha em `/primeiro-acesso`, veem o tour e caem no painel com a fila "Para você aprovar".
4. Confira em **Configurações › Perfis** se o Grupo Adere deve exigir as duas ("Todas precisam aprovar", padrão) ou qualquer uma.
