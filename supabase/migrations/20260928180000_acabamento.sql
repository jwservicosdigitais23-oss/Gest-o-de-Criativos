-- =====================================================================
-- Prompt 8 · Acabamento: medidor do Storage e limpeza de órfãos
-- =====================================================================

-- Arquivos do bucket "midias" que nenhum registro usa (mídias, fotos de
-- perfil e de membros). Só considera arquivos com mais de p_horas horas,
-- para não apagar uploads de um formulário ainda aberto.
create or replace function public.arquivos_orfaos(p_horas integer default 24)
returns table (nome text, tamanho bigint, criado_em timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Somente o administrador vê o uso do Storage.' using errcode = '42501';
  end if;
  return query
    select o.name, coalesce((o.metadata ->> 'size')::bigint, 0), o.created_at
      from storage.objects o
     where o.bucket_id = 'midias'
       and o.created_at < now() - make_interval(hours => p_horas)
       and not exists (select 1 from public.midias m where m.storage_path = o.name)
       and not exists (select 1 from public.perfis p where p.avatar_url = o.name)
       and not exists (select 1 from public.membros mb where mb.avatar_url = o.name)
     order by o.created_at;
end;
$$;

create or replace function public.uso_storage()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v jsonb;
begin
  if not public.is_admin() then
    raise exception 'Somente o administrador vê o uso do Storage.' using errcode = '42501';
  end if;
  select jsonb_build_object(
    'arquivos', count(*),
    'bytes', coalesce(sum((metadata ->> 'size')::bigint), 0),
    'por_tipo', coalesce((
      select jsonb_object_agg(tipo, total)
        from (
          select case
                   when o2.metadata ->> 'mimetype' like 'image/%' then 'imagens'
                   when o2.metadata ->> 'mimetype' like 'video/%' then 'videos'
                   when o2.metadata ->> 'mimetype' = 'application/pdf' then 'pdfs'
                   else 'outros'
                 end as tipo,
                 sum(coalesce((o2.metadata ->> 'size')::bigint, 0)) as total
            from storage.objects o2
           where o2.bucket_id = 'midias'
           group by 1
        ) t
    ), '{}'::jsonb),
    'orfaos', (select count(*) from public.arquivos_orfaos(24)),
    'bytes_orfaos', (select coalesce(sum(tamanho), 0) from public.arquivos_orfaos(24))
  )
  into v
  from storage.objects
  where bucket_id = 'midias';
  return v;
end;
$$;

revoke execute on function public.arquivos_orfaos(integer) from public, anon;
revoke execute on function public.uso_storage() from public, anon;
grant execute on function public.arquivos_orfaos(integer) to authenticated;
grant execute on function public.uso_storage() to authenticated;

-- Funções auxiliares internas não precisam ser chamadas pela API.
revoke execute on function public.bloquear_alteracao() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.validar_decisao() from public, anon, authenticated;
revoke execute on function public.aplicar_decisao() from public, anon, authenticated;
revoke execute on function public.notificar_envio() from public, anon, authenticated;
revoke execute on function public.notificar_decisao() from public, anon, authenticated;
revoke execute on function public.notificar_comentario() from public, anon, authenticated;
revoke execute on function public.guardar_status_post() from public, anon, authenticated;
revoke execute on function public.posts_nascem_rascunho() from public, anon, authenticated;
