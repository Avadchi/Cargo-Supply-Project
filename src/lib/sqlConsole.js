// Helpers for the in-app SQL console.
//
// The browser can only reach Postgres through Supabase's PostgREST endpoint,
// so arbitrary SQL is executed by the `public.exec_sql` function created by
// the SQL below. It is intentionally unrestricted and is meant for this
// local/academic demo only.

export const EXEC_SQL_SETUP = `-- Run this once in the Supabase SQL editor.
-- Creates the function used by System -> SQL console.
--
-- WARNING: this lets the anon role run any SQL, including DROP/DELETE.
-- Use it only for this academic project and never on a public deployment.

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

notify pgrst, 'reload schema';`

export const SQL_SAMPLES = [
  {
    label: 'Widen shipment status',
    description: 'Fixes "value too long for type character varying(12)" for Out for delivery.',
    sql: `alter table public.shipment
  alter column shipment_status type varchar(64);`,
  },
  {
    label: 'Find short text columns',
    description: 'Lists every capped text column in the 16 app tables.',
    sql: `select table_name, column_name, data_type, character_maximum_length
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'supplier', 'supplier_phone', 'category', 'product', 'warehouse', 'employee',
    'supplier_product', 'purchase_order', 'po_item', 'customer', 'customer_order',
    'order_item', 'payment', 'transporter', 'shipment', 'inventory'
  )
  and data_type in ('character varying', 'character')
order by character_maximum_length nulls last, table_name, column_name;`,
  },
  {
    label: 'Recent shipments',
    description: 'Newest shipment rows with their current status.',
    sql: `select *
from public.shipment
order by shipment_id desc
limit 25;`,
  },
  {
    label: 'Table row counts',
    description: 'Confirms how much live data each module is reading.',
    sql: `select 'supplier' as table_name, count(*) as rows from public.supplier
union all select 'product', count(*) from public.product
union all select 'warehouse', count(*) from public.warehouse
union all select 'customer', count(*) from public.customer
union all select 'customer_order', count(*) from public.customer_order
union all select 'shipment', count(*) from public.shipment
union all select 'inventory', count(*) from public.inventory
order by table_name;`,
  },
]

const READ_COMMANDS = new Set(['SELECT', 'SHOW', 'EXPLAIN', 'VALUES', 'TABLE', 'WITH'])

export function isReadCommand(command) {
  return READ_COMMANDS.has(String(command || '').toUpperCase())
}

// A WITH query can still modify rows through a data-modifying CTE.
export function isWriteStatement(statement, command) {
  if (!isReadCommand(command)) return true
  if (String(command || '').toUpperCase() === 'WITH') {
    return /\b(insert|update|delete|merge)\b/i.test(String(statement || ''))
  }
  return false
}

// Splits a script on top-level semicolons while respecting strings, quoted
// identifiers, dollar-quoted blocks and SQL comments.
export function splitSqlStatements(input) {
  const sql = String(input || '')
  const statements = []
  let current = ''
  let quote = null
  let dollarTag = null
  let index = 0

  while (index < sql.length) {
    const char = sql[index]
    const next = sql[index + 1]

    if (dollarTag) {
      if (sql.startsWith(dollarTag, index)) {
        current += dollarTag
        index += dollarTag.length
        dollarTag = null
        continue
      }
      current += char
      index += 1
      continue
    }

    if (quote) {
      current += char
      if (char === quote) {
        if (next === quote) {
          current += next
          index += 2
          continue
        }
        quote = null
      }
      index += 1
      continue
    }

    if (char === '-' && next === '-') {
      const newline = sql.indexOf('\n', index)
      const end = newline === -1 ? sql.length : newline
      current += sql.slice(index, end)
      index = end
      continue
    }

    if (char === '/' && next === '*') {
      const close = sql.indexOf('*/', index + 2)
      const end = close === -1 ? sql.length : close + 2
      current += sql.slice(index, end)
      index = end
      continue
    }

    if (char === "'" || char === '"') {
      quote = char
      current += char
      index += 1
      continue
    }

    if (char === '$') {
      const match = sql.slice(index).match(/^\$[A-Za-z_0-9]*\$/)
      if (match) {
        dollarTag = match[0]
        current += dollarTag
        index += dollarTag.length
        continue
      }
    }

    if (char === ';') {
      if (current.trim()) statements.push(current.trim())
      current = ''
      index += 1
      continue
    }

    current += char
    index += 1
  }

  if (current.trim()) statements.push(current.trim())
  return statements
}
