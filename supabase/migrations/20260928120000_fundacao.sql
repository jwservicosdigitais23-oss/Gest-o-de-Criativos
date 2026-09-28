-- =====================================================================
-- Adere · Aprovação de Criativos — Prompt 1 (Fundação)
-- Tabelas, enums, funções auxiliares de acesso, RLS, bucket e seed.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------
create type public.papel as enum ('admin', 'aprovadora');
create type public.status_post as enum (
  'rascunho', 'aguardando', 'em_revisao', 'aprovado', 'reprovado', 'publicado', 'arquivado'
);
create type public.decisao as enum ('aprovado', 'reprovado', 'revisar');
create type public.formato as enum ('imagem', 'carrossel', 'video', 'texto', 'documento');
create type public.modo_aprovacao as enum ('todas', 'qualquer_uma');
create type public.tipo_perfil as enum ('pessoal', 'empresa');
create type public.origem_post as enum ('manual', 'importacao');

-- ---------------------------------------------------------------------
-- Utilitário: updated_at
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Data de hoje no fuso de São Paulo (o Postgres roda em UTC).
create or replace function public.hoje_sp()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'America/Sao_Paulo')::date
$$;

-- ---------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------

-- Pessoas com acesso ao CRM (id = auth.users.id)
create table public.membros (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null check (length(trim(nome)) > 0),
  email text not null unique,
  papel public.papel not null default 'aprovadora',
  avatar_url text,
  ativo boolean not null default true,
  ultimo_acesso timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Perfis do LinkedIn (Edna, Daniela, Grupo Adere...)
create table public.perfis (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (length(trim(nome)) > 0),
  tipo public.tipo_perfil not null default 'pessoal',
  linkedin_url text,
  avatar_url text, -- caminho no bucket "midias" (perfis/{id}/...)
  modo_aprovacao public.modo_aprovacao not null default 'qualquer_uma',
  ordem integer not null default 0,
  arquivado boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index perfis_nome_unico on public.perfis (lower(trim(nome)));

-- Quem aprova cada perfil
create table public.perfil_aprovadoras (
  perfil_id uuid not null references public.perfis (id) on delete cascade,
  membro_id uuid not null references public.membros (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (perfil_id, membro_id)
);
create index perfil_aprovadoras_membro on public.perfil_aprovadoras (membro_id);

-- O post (unidade de trabalho). Data e hora ficam no horário de São Paulo,
-- em colunas separadas (date + time), para não sofrer conversão de UTC.
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid not null references public.perfis (id) on delete restrict,
  status public.status_post not null default 'rascunho',
  data_publicacao date not null,
  hora_publicacao time,
  tema text not null check (length(trim(tema)) > 0),
  legenda text not null default '',
  formato public.formato not null default 'imagem',
  pilar text,
  cta text,
  prazo_aprovacao date,
  versao integer not null default 1 check (versao >= 1),
  link_publicado text,
  publicado_em timestamptz,
  origem public.origem_post not null default 'manual',
  chave_externa text, -- coluna "ID" da planilha
  arquivo_ref text,   -- coluna "Arquivo" da planilha (anexo em lote)
  enviado_em timestamptz,  -- 1º envio da versão atual para aprovação
  decidido_em timestamptz, -- decisão final (aprovado/reprovado)
  duplicado_de uuid references public.posts (id) on delete set null,
  criado_por uuid references public.membros (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index posts_perfil on public.posts (perfil_id);
create index posts_status on public.posts (status);
create index posts_data on public.posts (data_publicacao);
create unique index posts_chave_externa on public.posts (chave_externa) where chave_externa is not null;

-- Instantâneo de cada versão enviada para aprovação (para o seletor de versões)
create table public.post_versoes (
  post_id uuid not null references public.posts (id) on delete cascade,
  versao integer not null,
  tema text not null,
  legenda text not null,
  formato public.formato not null,
  pilar text,
  cta text,
  data_publicacao date not null,
  hora_publicacao time,
  enviado_por uuid references public.membros (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (post_id, versao)
);

-- Arquivos do post. Uma mídia vale da versão "versao" até antes de "versao_removida".
create table public.midias (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  versao integer not null default 1,
  versao_removida integer,
  ordem integer not null default 0,
  tipo text not null check (tipo in ('imagem', 'pdf', 'video', 'link')),
  storage_path text,
  url_externa text,
  nome_arquivo text not null,
  mime text,
  tamanho bigint,
  largura integer,
  altura integer,
  created_at timestamptz not null default now(),
  check ((storage_path is not null) <> (url_externa is not null)),
  check (versao_removida is null or versao_removida > versao)
);
create index midias_post on public.midias (post_id);

-- Decisões das aprovadoras (somente INSERT)
create table public.decisoes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  versao integer not null,
  autor_id uuid not null default auth.uid() references public.membros (id),
  decisao public.decisao not null,
  observacao text,
  itens text[] not null default '{}',
  created_at timestamptz not null default now(),
  -- Revisar exige observação (mín. 10 caracteres); Reprovar exige motivo.
  constraint decisoes_observacao_obrigatoria check (
    (decisao = 'aprovado')
    or (decisao = 'revisar' and length(trim(coalesce(observacao, ''))) >= 10)
    or (decisao = 'reprovado' and length(trim(coalesce(observacao, ''))) >= 3)
  ),
  constraint decisoes_itens_validos check (
    itens <@ array['legenda', 'arte', 'cta', 'data', 'outro']::text[]
  )
);
create index decisoes_post on public.decisoes (post_id, versao);
create index decisoes_autor on public.decisoes (autor_id);

-- Comentários (ex.: Jonathan respondendo a uma observação)
create table public.comentarios (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  versao integer not null,
  decisao_id uuid references public.decisoes (id) on delete set null,
  autor_id uuid not null default auth.uid() references public.membros (id),
  texto text not null check (length(trim(texto)) > 0),
  created_at timestamptz not null default now()
);
create index comentarios_post on public.comentarios (post_id);

-- Importações de cronograma (Excel)
create table public.importacoes (
  id uuid primary key default gen_random_uuid(),
  arquivo_nome text not null,
  total integer not null default 0,
  criados integer not null default 0,
  atualizados integer not null default 0,
  ignorados integer not null default 0,
  erros integer not null default 0,
  detalhes jsonb not null default '[]'::jsonb,
  autor_id uuid default auth.uid() references public.membros (id) on delete set null,
  created_at timestamptz not null default now()
);

-- Trilha de auditoria (somente INSERT)
create table public.historico (
  id bigint generated always as identity primary key,
  entidade text not null,       -- 'post', 'perfil', 'membro', 'importacao'...
  entidade_id uuid,
  post_id uuid references public.posts (id) on delete set null,
  perfil_id uuid references public.perfis (id) on delete set null,
  acao text not null,           -- 'criou', 'enviou', 'aprovou', 'pediu_revisao'...
  versao integer,
  autor_id uuid default auth.uid() references public.membros (id) on delete set null,
  detalhes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index historico_post on public.historico (post_id, created_at);
create index historico_perfil on public.historico (perfil_id);

-- Notificações por pessoa
create table public.notificacoes (
  id uuid primary key default gen_random_uuid(),
  destinatario_id uuid not null references public.membros (id) on delete cascade,
  tipo text not null,
  titulo text not null,
  corpo text,
  post_id uuid references public.posts (id) on delete cascade,
  lida boolean not null default false,
  created_at timestamptz not null default now()
);
create index notificacoes_destinatario on public.notificacoes (destinatario_id, lida, created_at desc);

-- updated_at
create trigger membros_updated before update on public.membros
  for each row execute function public.set_updated_at();
create trigger perfis_updated before update on public.perfis
  for each row execute function public.set_updated_at();
create trigger posts_updated before update on public.posts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Funções de acesso (security definer para não recursar nas políticas)
-- ---------------------------------------------------------------------
create or replace function public.is_membro_ativo()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.membros m where m.id = auth.uid() and m.ativo
  )
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.membros m
    where m.id = auth.uid() and m.ativo and m.papel = 'admin'
  )
$$;

create or replace function public.is_aprovadora_do_perfil(p_perfil_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.perfil_aprovadoras pa
    join public.membros m on m.id = pa.membro_id
    where pa.perfil_id = p_perfil_id and pa.membro_id = auth.uid() and m.ativo
  )
$$;

create or replace function public.pode_ver_perfil(p_perfil_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_admin() or public.is_aprovadora_do_perfil(p_perfil_id)
$$;

create or replace function public.pode_ver_post(p_post_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_admin() or exists (
    select 1 from public.posts p
    where p.id = p_post_id and public.is_aprovadora_do_perfil(p.perfil_id)
  )
$$;

-- Converte texto em uuid sem erro (nulo se inválido) — usado no Storage.
create or replace function public.try_uuid(p text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
begin
  return p::uuid;
exception when others then
  return null;
end;
$$;

-- Para a tela "Primeiro acesso": só existe enquanto ninguém se cadastrou.
create or replace function public.sistema_tem_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.membros where papel = 'admin')
$$;

-- Registra o último acesso de quem está logado.
create or replace function public.registrar_acesso()
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  update public.membros set ultimo_acesso = now() where id = auth.uid()
$$;

-- O primeiro usuário cadastrado vira administrador. Os demais só entram
-- por convite (a rota de convite cria o registro em membros).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.membros) then
    insert into public.membros (id, nome, email, papel)
    values (
      new.id,
      coalesce(nullif(trim(new.raw_user_meta_data ->> 'nome'), ''), split_part(new.email, '@', 1)),
      new.email,
      'admin'
    );
    insert into public.historico (entidade, entidade_id, acao, autor_id, detalhes)
    values ('membro', new.id, 'primeiro_admin', new.id, jsonb_build_object('email', new.email));
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.membros enable row level security;
alter table public.perfis enable row level security;
alter table public.perfil_aprovadoras enable row level security;
alter table public.posts enable row level security;
alter table public.post_versoes enable row level security;
alter table public.midias enable row level security;
alter table public.decisoes enable row level security;
alter table public.comentarios enable row level security;
alter table public.importacoes enable row level security;
alter table public.historico enable row level security;
alter table public.notificacoes enable row level security;

-- Nada é acessível sem login.
revoke all on all tables in schema public from anon;

-- membros: todo membro ativo vê a equipe (nomes/avatares na linha do tempo);
-- só o admin grava.
create policy membros_select on public.membros for select to authenticated
  using (public.is_membro_ativo() or id = auth.uid());
create policy membros_admin_insert on public.membros for insert to authenticated
  with check (public.is_admin());
create policy membros_admin_update on public.membros for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy membros_admin_delete on public.membros for delete to authenticated
  using (public.is_admin());

-- perfis
create policy perfis_select on public.perfis for select to authenticated
  using (public.pode_ver_perfil(id));
create policy perfis_admin_insert on public.perfis for insert to authenticated
  with check (public.is_admin());
create policy perfis_admin_update on public.perfis for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy perfis_admin_delete on public.perfis for delete to authenticated
  using (public.is_admin());

-- perfil_aprovadoras
create policy pa_select on public.perfil_aprovadoras for select to authenticated
  using (public.pode_ver_perfil(perfil_id));
create policy pa_admin_insert on public.perfil_aprovadoras for insert to authenticated
  with check (public.is_admin());
create policy pa_admin_delete on public.perfil_aprovadoras for delete to authenticated
  using (public.is_admin());

-- posts: aprovadora só lê; admin faz tudo.
create policy posts_select on public.posts for select to authenticated
  using (public.pode_ver_perfil(perfil_id));
create policy posts_admin_insert on public.posts for insert to authenticated
  with check (public.is_admin());
create policy posts_admin_update on public.posts for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy posts_admin_delete on public.posts for delete to authenticated
  using (public.is_admin());

-- post_versoes: leitura como o post; gravação só admin; nunca altera.
create policy pv_select on public.post_versoes for select to authenticated
  using (public.pode_ver_post(post_id));
create policy pv_admin_insert on public.post_versoes for insert to authenticated
  with check (public.is_admin());

-- midias
create policy midias_select on public.midias for select to authenticated
  using (public.pode_ver_post(post_id));
create policy midias_admin_insert on public.midias for insert to authenticated
  with check (public.is_admin());
create policy midias_admin_update on public.midias for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy midias_admin_delete on public.midias for delete to authenticated
  using (public.is_admin());

-- decisoes: aprovadora grava só em nome próprio, nos perfis que aprova.
create policy decisoes_select on public.decisoes for select to authenticated
  using (public.pode_ver_post(post_id));
create policy decisoes_insert on public.decisoes for insert to authenticated
  with check (
    autor_id = auth.uid()
    and exists (
      select 1 from public.posts p
      where p.id = post_id and public.is_aprovadora_do_perfil(p.perfil_id)
    )
  );

-- comentarios: quem vê o post comenta em nome próprio.
create policy comentarios_select on public.comentarios for select to authenticated
  using (public.pode_ver_post(post_id));
create policy comentarios_insert on public.comentarios for insert to authenticated
  with check (autor_id = auth.uid() and public.pode_ver_post(post_id));

-- importacoes: só admin
create policy importacoes_admin_all on public.importacoes for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- historico: admin lê tudo; aprovadora lê o dos posts/perfis que vê.
create policy historico_select on public.historico for select to authenticated
  using (
    public.is_admin()
    or (post_id is not null and public.pode_ver_post(post_id))
    or (post_id is null and perfil_id is not null and public.is_aprovadora_do_perfil(perfil_id))
  );
create policy historico_insert on public.historico for insert to authenticated
  with check (public.is_membro_ativo() and autor_id = auth.uid());

-- notificacoes: cada um vê e marca como lida só as suas.
create policy notificacoes_select on public.notificacoes for select to authenticated
  using (destinatario_id = auth.uid());
create policy notificacoes_update on public.notificacoes for update to authenticated
  using (destinatario_id = auth.uid()) with check (destinatario_id = auth.uid());

-- decisoes, historico e post_versoes: somente INSERT, nunca UPDATE/DELETE.
revoke update, delete, truncate on public.decisoes from authenticated, anon;
revoke update, delete, truncate on public.historico from authenticated, anon;
revoke update, delete, truncate on public.post_versoes from authenticated, anon;
revoke update, delete, truncate on public.comentarios from authenticated, anon;

create or replace function public.bloquear_alteracao()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Registros de % não podem ser alterados nem apagados.', tg_table_name
    using errcode = '42501';
end;
$$;

create trigger decisoes_imutaveis before update or delete on public.decisoes
  for each row execute function public.bloquear_alteracao();
create trigger historico_imutavel before update or delete on public.historico
  for each row execute function public.bloquear_alteracao();

-- Funções auxiliares: só para quem está logado.
revoke execute on function public.registrar_acesso() from public, anon;
grant execute on function public.registrar_acesso() to authenticated;
grant execute on function public.sistema_tem_admin() to anon, authenticated;

-- ---------------------------------------------------------------------
-- Storage: bucket privado "midias" (50 MB por arquivo no plano Free)
-- Caminhos: {perfil_id}/{post_id}/v{versao}/{arquivo} e perfis/{perfil_id}/...
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('midias', 'midias', false, 52428800)
on conflict (id) do nothing;

create policy midias_storage_select on storage.objects for select to authenticated
  using (
    bucket_id = 'midias'
    and (
      public.is_admin()
      or (
        (storage.foldername(name))[1] = 'perfis'
        and public.is_aprovadora_do_perfil(public.try_uuid((storage.foldername(name))[2]))
      )
      or public.is_aprovadora_do_perfil(public.try_uuid((storage.foldername(name))[1]))
    )
  );
create policy midias_storage_admin_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'midias' and public.is_admin());
create policy midias_storage_admin_update on storage.objects for update to authenticated
  using (bucket_id = 'midias' and public.is_admin())
  with check (bucket_id = 'midias' and public.is_admin());
create policy midias_storage_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'midias' and public.is_admin());

-- ---------------------------------------------------------------------
-- Realtime (sino de notificações e decisões ao vivo)
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table public.notificacoes;
alter publication supabase_realtime add table public.decisoes;
alter publication supabase_realtime add table public.posts;

-- ---------------------------------------------------------------------
-- Seed: somente os três perfis reais. Nenhum post fictício.
-- ---------------------------------------------------------------------
insert into public.perfis (nome, tipo, modo_aprovacao, ordem) values
  ('Edna Queiroz', 'pessoal', 'qualquer_uma', 1),
  ('Daniela Quintana', 'pessoal', 'qualquer_uma', 2),
  ('Grupo Adere', 'empresa', 'todas', 3)
on conflict do nothing;
