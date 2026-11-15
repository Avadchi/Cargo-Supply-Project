-- Kargo SQL console backend.
--
-- Run this once in the Supabase SQL editor to enable
-- System -> SQL console inside the app.
--
-- WARNING: this function lets the anon role execute arbitrary SQL,
-- including DROP and DELETE. Use it only for this academic/demo project
-- and never expose it on a public deployment.

create or replace function public.exec_sql(query text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  statement text := btrim(coalesce(query, ''));
  payload jsonb := '[]'::jsonb;
  affected bigint := 0;
begin
  if statement = '' then
    raise exception 'SQL statement is empty';
  end if;

  begin
    execute format(
      'select coalesce(jsonb_agg(to_jsonb(result_row)), ''[]''::jsonb) from (%s) as result_row',
      statement
    ) into payload;

    return jsonb_build_object(
      'rows', payload,
      'row_count', jsonb_array_length(payload),
      'command', upper(split_part(statement, ' ', 1))
    );
  exception
    when others then
      -- Wrapping only works for SELECT-style statements. Fall back to running
      -- INSERT/UPDATE/DELETE/DDL directly.
      execute statement;
      get diagnostics affected = row_count;
      return jsonb_build_object(
        'rows', '[]'::jsonb,
        'row_count', affected,
        'command', upper(split_part(statement, ' ', 1))
      );
  end;
end;
$$;

revoke all on function public.exec_sql(text) from public;
grant execute on function public.exec_sql(text) to anon, authenticated;

notify pgrst, 'reload schema';
