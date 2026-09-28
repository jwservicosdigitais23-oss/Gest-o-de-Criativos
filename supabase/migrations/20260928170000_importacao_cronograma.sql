-- =====================================================================
-- Prompt 6 · Importação e exportação do cronograma Excel
-- A gravação acontece numa única função (uma transação).
-- =====================================================================

-- Prazo padrão: N dias úteis (seg–sex) antes da data.
create or replace function public.subtrair_dias_uteis(p_data date, p_dias integer)
returns date
language plpgsql
immutable
set search_path = ''
as $$
declare
  v date := p_data;
  n integer := p_dias;
begin
  while n > 0 loop
    v := v - 1;
    if extract(isodow from v) < 6 then
      n := n - 1;
    end if;
  end loop;
  return v;
end;
$$;

create index if not exists posts_chave_composta on public.posts (perfil_id, data_publicacao, lower(trim(tema)));

-- p_linhas: [{linha, chave_externa, perfil_id, data, hora, tema, legenda, formato, pilar, cta, arquivo}]
-- p_rejeitadas: linhas que a pré-visualização já marcou como erro (só para o registro).
create or replace function public.importar_cronograma(
  p_arquivo text,
  p_linhas jsonb,
  p_rejeitadas jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  r jsonb;
  v_existente public.posts;
  v_id uuid;
  v_criados int := 0;
  v_atualizados int := 0;
  v_ignorados int := 0;
  v_erros int := coalesce(jsonb_array_length(p_rejeitadas), 0);
  v_detalhes jsonb := coalesce(p_rejeitadas, '[]'::jsonb);
  v_importacao uuid := gen_random_uuid();
  v_data date;
  v_hora time;
  v_formato public.formato;
begin
  if not public.is_admin() then
    raise exception 'Somente o administrador importa cronogramas.' using errcode = '42501';
  end if;

  for r in select * from jsonb_array_elements(coalesce(p_linhas, '[]'::jsonb)) loop
    begin
      v_data := (r ->> 'data')::date;
      v_hora := nullif(r ->> 'hora', '')::time;
      v_formato := coalesce(nullif(r ->> 'formato', ''), 'imagem')::public.formato;

      if (r ->> 'perfil_id') is null or not exists (select 1 from public.perfis where id = (r ->> 'perfil_id')::uuid) then
        raise exception 'Perfil não cadastrado';
      end if;
      if coalesce(trim(r ->> 'tema'), '') = '' then
        raise exception 'Tema obrigatório';
      end if;

      v_existente := null;
      if coalesce(trim(r ->> 'chave_externa'), '') <> '' then
        select * into v_existente from public.posts
         where lower(chave_externa) = lower(trim(r ->> 'chave_externa'))
            or id::text = lower(trim(r ->> 'chave_externa'))
         limit 1;
      else
        select * into v_existente from public.posts
         where perfil_id = (r ->> 'perfil_id')::uuid
           and data_publicacao = v_data
           and lower(trim(tema)) = lower(trim(r ->> 'tema'))
         order by created_at
         limit 1;
      end if;

      if v_existente.id is not null then
        if v_existente.status not in ('rascunho', 'em_revisao') then
          v_ignorados := v_ignorados + 1;
          v_detalhes := v_detalhes || jsonb_build_object(
            'linha', r -> 'linha', 'resultado', 'ignorada', 'post_id', v_existente.id,
            'motivo', case v_existente.status
                        when 'aprovado' then 'Ignorada — já aprovado'
                        when 'publicado' then 'Ignorada — já publicado'
                        else 'Ignorada — ' || v_existente.status::text end);
          continue;
        end if;

        update public.posts
           set perfil_id = (r ->> 'perfil_id')::uuid,
               data_publicacao = v_data,
               hora_publicacao = v_hora,
               tema = trim(r ->> 'tema'),
               legenda = coalesce(r ->> 'legenda', ''),
               formato = v_formato,
               pilar = nullif(trim(r ->> 'pilar'), ''),
               cta = nullif(trim(r ->> 'cta'), ''),
               arquivo_ref = coalesce(nullif(trim(r ->> 'arquivo'), ''), arquivo_ref),
               prazo_aprovacao = public.subtrair_dias_uteis(v_data, 2)
         where id = v_existente.id;
        insert into public.historico (entidade, entidade_id, post_id, perfil_id, acao, versao, autor_id, detalhes)
        values ('post', v_existente.id, v_existente.id, (r ->> 'perfil_id')::uuid, 'atualizou_importacao',
                v_existente.versao, auth.uid(), jsonb_build_object('importacao', v_importacao, 'arquivo', p_arquivo));
        v_atualizados := v_atualizados + 1;
        v_detalhes := v_detalhes || jsonb_build_object('linha', r -> 'linha', 'resultado', 'atualizado', 'post_id', v_existente.id);
      else
        insert into public.posts
          (perfil_id, data_publicacao, hora_publicacao, tema, legenda, formato, pilar, cta, prazo_aprovacao,
           origem, chave_externa, arquivo_ref, criado_por)
        values
          ((r ->> 'perfil_id')::uuid, v_data, v_hora, trim(r ->> 'tema'), coalesce(r ->> 'legenda', ''), v_formato,
           nullif(trim(r ->> 'pilar'), ''), nullif(trim(r ->> 'cta'), ''), public.subtrair_dias_uteis(v_data, 2),
           'importacao', nullif(trim(r ->> 'chave_externa'), ''), nullif(trim(r ->> 'arquivo'), ''), auth.uid())
        returning id into v_id;
        insert into public.historico (entidade, entidade_id, post_id, perfil_id, acao, versao, autor_id, detalhes)
        values ('post', v_id, v_id, (r ->> 'perfil_id')::uuid, 'importou', 1, auth.uid(),
                jsonb_build_object('importacao', v_importacao, 'arquivo', p_arquivo, 'linha', r -> 'linha'));
        v_criados := v_criados + 1;
        v_detalhes := v_detalhes || jsonb_build_object('linha', r -> 'linha', 'resultado', 'criado', 'post_id', v_id);
      end if;
    exception
      when others then
        v_erros := v_erros + 1;
        v_detalhes := v_detalhes || jsonb_build_object('linha', r -> 'linha', 'resultado', 'erro', 'motivo', sqlerrm);
    end;
  end loop;

  insert into public.importacoes (id, arquivo_nome, total, criados, atualizados, ignorados, erros, detalhes, autor_id)
  values (v_importacao, p_arquivo,
          coalesce(jsonb_array_length(p_linhas), 0) + coalesce(jsonb_array_length(p_rejeitadas), 0),
          v_criados, v_atualizados, v_ignorados, v_erros, v_detalhes, auth.uid());

  insert into public.historico (entidade, entidade_id, acao, autor_id, detalhes)
  values ('importacao', v_importacao, 'importou_cronograma', auth.uid(),
          jsonb_build_object('arquivo', p_arquivo, 'criados', v_criados, 'atualizados', v_atualizados,
                             'ignorados', v_ignorados, 'erros', v_erros));

  return jsonb_build_object(
    'importacao_id', v_importacao,
    'criados', v_criados,
    'atualizados', v_atualizados,
    'ignorados', v_ignorados,
    'erros', v_erros,
    'detalhes', v_detalhes
  );
end;
$$;

revoke execute on function public.importar_cronograma(text, jsonb, jsonb) from public, anon;
grant execute on function public.importar_cronograma(text, jsonb, jsonb) to authenticated;

-- Última observação de cada post (coluna da exportação).
create or replace view public.posts_ultima_observacao
with (security_invoker = true)
as
select distinct on (d.post_id) d.post_id, d.observacao, d.created_at
  from public.decisoes d
 where d.observacao is not null
 order by d.post_id, d.created_at desc;

grant select on public.posts_ultima_observacao to authenticated;
