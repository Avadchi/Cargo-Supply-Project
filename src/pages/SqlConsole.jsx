import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Copy,
  History,
  Play,
  RefreshCw,
  ShieldAlert,
  TerminalSquare,
  Trash2,
} from 'lucide-react'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import { supabase } from '../lib/supabase'
import { EXEC_SQL_SETUP, SQL_SAMPLES, isWriteStatement, splitSqlStatements } from '../lib/sqlConsole'
import { PageHeader } from '../components/ui/Bits'

const HISTORY_KEY = 'kargo.sql.history'
const MAX_ROWS = 100

function readHistory() {
  try {
    const parsed = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeHistory(entries) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries))
  } catch {
    // History is a convenience only; ignore storage failures.
  }
}

function formatCell(value) {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'object') return JSON.stringify(value)
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  return String(value)
}

function columnsFor(rows) {
  const columns = []
  rows.forEach((row) => {
    Object.keys(row || {}).forEach((key) => {
      if (!columns.includes(key)) columns.push(key)
    })
  })
  return columns
}

function ResultTable({ rows }) {
  const columns = columnsFor(rows)
  return (
    <div className="table-shell max-h-[460px] overflow-auto">
      <table className="data-table min-w-[640px]">
        <thead className="sticky top-0 z-10">
          <tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr>
        </thead>
        <tbody>
          {rows.slice(0, MAX_ROWS).map((row, rowIndex) => (
            <tr key={rowIndex}>
              {columns.map((column) => (
                <td key={column} className="max-w-[280px] truncate font-mono text-[10.5px]" title={formatCell(row?.[column])}>
                  {formatCell(row?.[column])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > MAX_ROWS && (
        <p className="border-t border-line px-4 py-2 text-[10px] text-mist">
          Showing the first {MAX_ROWS} of {rows.length} rows. Add a LIMIT to narrow the result.
        </p>
      )}
    </div>
  )
}

export default function SqlConsole() {
  const { isSupabaseConfigured, mode, refreshSilent } = useData()
  const toast = useToast()
  const live = mode === 'supabase' && isSupabaseConfigured

  const editorRef = useRef(null)
  const [sql, setSql] = useState(SQL_SAMPLES[2].sql)
  const [running, setRunning] = useState(false)
  const [run, setRun] = useState(null)
  const [needsSetup, setNeedsSetup] = useState(false)
  const [history, setHistory] = useState(readHistory)

  const totalRows = useMemo(
    () => (run?.statements || []).reduce((sum, item) => sum + (item.rows?.length || 0), 0),
    [run],
  )

  const copy = async (text, message) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(message)
    } catch {
      toast.error('Could not access the clipboard.')
    }
  }

  const remember = (text) => {
    setHistory((previous) => {
      const next = [{ sql: text, at: new Date().toISOString() }, ...previous.filter((entry) => entry.sql !== text)].slice(0, 20)
      writeHistory(next)
      return next
    })
  }

  const runQuery = async () => {
    if (running) return

    const editor = editorRef.current
    const selection = editor && editor.selectionStart !== editor.selectionEnd
      ? editor.value.slice(editor.selectionStart, editor.selectionEnd)
      : ''
    const script = (selection || sql).trim()

    if (!script) {
      toast.info('Write a SQL statement first.')
      return
    }
    if (!isSupabaseConfigured || !supabase) {
      toast.error('The SQL console needs a live Supabase connection.')
      return
    }

    const statements = splitSqlStatements(script)
    if (!statements.length) {
      toast.info('Write a SQL statement first.')
      return
    }

    setRunning(true)
    setNeedsSetup(false)
    setRun(null)
    const started = performance.now()
    const results = []
    let wrote = false

    for (const statement of statements) {
      const { data, error } = await supabase.rpc('exec_sql', { query: statement })

      if (error) {
        const missing = error.code === 'PGRST202' || /exec_sql|Could not find the function|schema cache/i.test(error.message || '')
        if (missing) setNeedsSetup(true)
        results.push({ statement, error: error.message || 'Statement failed.', missing })
        break
      }

      const rows = Array.isArray(data?.rows) ? data.rows : []
      const command = data?.command || String(statement).trim().split(/\s+/)[0]?.toUpperCase() || ''
      const rowCount = Number.isFinite(Number(data?.row_count)) ? Number(data.row_count) : rows.length
      results.push({ statement, rows, command, rowCount })
      if (isWriteStatement(statement, command)) wrote = true
    }

    const elapsed = Math.round(performance.now() - started)
    setRun({ at: new Date(), elapsed, statements: results })
    setRunning(false)
    remember(script)

    const failed = results.find((item) => item.error)
    if (failed) {
      toast.error(`SQL failed: ${failed.error}`)
    } else {
      toast.success(statements.length === 1 ? 'Statement executed.' : `${statements.length} statements executed.`)
    }

    if (wrote && !failed) {
      await refreshSilent()
    }
  }

  const handleEditorKeyDown = (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault()
      runQuery()
    }
  }

  const clearEditor = () => {
    setSql('')
    setRun(null)
    setNeedsSetup(false)
    editorRef.current?.focus()
  }

  const clearHistory = () => {
    setHistory([])
    writeHistory([])
    toast.success('SQL history cleared.')
  }

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="System / SQL console"
        title="SQL console"
        description="Run SQL against the live Supabase Postgres database. Results appear below and the workspace data refreshes after writes."
      >
        <button className="btn-secondary" onClick={() => copy(EXEC_SQL_SETUP, 'Setup SQL copied.')}>
          <Copy size={14} /> Copy setup SQL
        </button>
        <button className="btn-primary" onClick={runQuery} disabled={running || !isSupabaseConfigured}>
          {running ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
          {running ? 'Running…' : 'Run statement'}
        </button>
      </PageHeader>

      {!isSupabaseConfigured && (
        <div className="mb-3 flex items-start gap-2 rounded-xl border border-[#E8D3A8] bg-[#FFF9EB] px-4 py-3 text-[11px] leading-5 text-[#785A22]">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <p>
            The console talks directly to Postgres through Supabase, so it only works with live credentials. Add your keys in <code className="rounded bg-black/[0.06] px-1 font-mono text-[10px]">.env</code> and restart the dev server, or visit <Link to="/database" className="font-semibold underline">Database</Link> for setup steps.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-3">
          <section className="panel overflow-hidden">
            <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
              <TerminalSquare size={15} className="text-ink-600" />
              <p className="text-[12px] font-semibold text-ink-900">Query editor</p>
              <span className={`badge ${live ? 'bg-[#E2F7D5] text-[#39741D]' : 'bg-[#FFF3D8] text-[#9A6A15]'}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${live ? 'bg-[#66A53A]' : 'bg-[#D49A2A]'}`} />
                {live ? 'Live Postgres' : 'Demo mode'}
              </span>
              <span className="ml-auto font-mono text-[9px] text-mist">⌘/Ctrl + Enter</span>
            </div>

            <textarea
              ref={editorRef}
              value={sql}
              onChange={(event) => setSql(event.target.value)}
              onKeyDown={handleEditorKeyDown}
              spellCheck={false}
              placeholder="select * from public.shipment limit 20;"
              className="block min-h-[280px] w-full resize-y border-0 bg-[#10241C] px-5 py-4 font-mono text-[12px] leading-6 text-[#B9D7C2] outline-none placeholder:text-white/20"
            />

            <div className="flex flex-wrap items-center gap-2 border-t border-line bg-[#FBFBF7] px-4 py-3">
              <p className="text-[10px] text-mist">
                Runs the whole editor, or just the selected text. Semicolon-separated statements run in order.
              </p>
              <div className="ml-auto flex items-center gap-2">
                <button className="btn-ghost h-8 px-2.5 text-[11px]" onClick={clearEditor} disabled={running}>
                  <Trash2 size={13} /> Clear
                </button>
                <button className="btn-primary h-8 px-3 text-[11.5px]" onClick={runQuery} disabled={running || !isSupabaseConfigured}>
                  {running ? <RefreshCw size={13} className="animate-spin" /> : <Play size={13} />}
                  {running ? 'Running…' : 'Run'}
                </button>
              </div>
            </div>
          </section>

          {needsSetup && (
            <section className="panel overflow-hidden border-[#E8C8BC]">
              <div className="flex items-center gap-2 border-b border-[#E8C8BC] bg-[#FDF4F0] px-4 py-3">
                <AlertTriangle size={15} className="text-[#B84A2C]" />
                <p className="text-[12px] font-semibold text-[#8A4A35]">One-time setup required</p>
                <button className="ml-auto text-[10.5px] font-semibold text-[#8A4A35] hover:underline" onClick={() => copy(EXEC_SQL_SETUP, 'Setup SQL copied.')}>
                  Copy SQL
                </button>
              </div>
              <div className="p-4">
                <p className="text-[11px] leading-5 text-mist">
                  The browser executes SQL through the <code className="rounded bg-[#F1F3EB] px-1 font-mono text-[10px]">public.exec_sql</code> function. Run the following once in the Supabase SQL editor, then try again.
                </p>
                <pre className="mt-3 max-h-72 overflow-auto rounded-xl bg-[#10241C] p-4 font-mono text-[9.5px] leading-5 text-[#B9D7C2]">{EXEC_SQL_SETUP}</pre>
              </div>
            </section>
          )}

          {run && (
            <section className="panel overflow-hidden">
              <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
                <CheckCircle2 size={15} className={run.statements.some((item) => item.error) ? 'text-[#B84A2C]' : 'text-[#39741D]'} />
                <p className="text-[12px] font-semibold text-ink-900">Result</p>
                <span className="font-mono text-[9px] text-mist">{run.statements.length} statement{run.statements.length === 1 ? '' : 's'} · {totalRows} row{totalRows === 1 ? '' : 's'}</span>
                <span className="ml-auto inline-flex items-center gap-1 font-mono text-[9px] text-mist">
                  <Clock3 size={11} /> {run.elapsed} ms
                </span>
              </div>

              {run.statements.map((item, index) => (
                <div key={index} className="border-b border-line last:border-b-0">
                  <div className="flex flex-wrap items-center gap-2 bg-[#F7F7F1] px-4 py-2">
                    <span className="font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-mist">Statement {index + 1}</span>
                    {item.error ? (
                      <span className="badge bg-[#FBE7E0] text-[#B84A2C]">Failed</span>
                    ) : (
                      <span className="badge bg-[#E2F7D5] text-[#39741D]">{item.command || 'OK'} · {item.rowCount} affected</span>
                    )}
                  </div>

                  {item.error ? (
                    <div className="px-4 py-3">
                      <pre className="overflow-auto rounded-lg border border-[#E8C8BC] bg-[#FDF4F0] p-3 font-mono text-[10px] leading-5 text-[#8A4A35]">{item.error}</pre>
                    </div>
                  ) : item.rows.length === 0 ? (
                    <p className="px-4 py-3 text-[11px] text-mist">Statement executed successfully. No rows returned.</p>
                  ) : (
                    <ResultTable rows={item.rows} />
                  )}
                </div>
              ))}
            </section>
          )}

          <div className="flex items-start gap-2 rounded-xl border border-[#E8D3A8] bg-[#FFF9EB] px-4 py-3 text-[10.5px] leading-5 text-[#785A22]">
            <ShieldAlert size={14} className="mt-0.5 shrink-0" />
            <p>
              The <code className="rounded bg-black/[0.06] px-1 font-mono text-[9.5px]">SECURITY DEFINER</code> SQL function may run with its owner’s privileges, not just anon’s. It can execute destructive statements such as <code className="rounded bg-black/[0.06] px-1 font-mono text-[9.5px]">DROP</code> and <code className="rounded bg-black/[0.06] px-1 font-mono text-[9.5px]">DELETE</code>; keep it for this academic project only and never expose it publicly.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <section className="panel overflow-hidden">
            <div className="border-b border-line px-4 py-3">
              <h2 className="section-title">Quick queries</h2>
              <p className="mt-0.5 text-[10.5px] text-mist">Load a statement into the editor, then run it.</p>
              <p className="mt-1 text-[10px] leading-4 text-mist">
                The anon examples use <code className="font-mono">public.anon_sql_demo</code>; create it first. Each RPC call is its own atomic transaction, so explicit <code className="font-mono">BEGIN</code>/<code className="font-mono">COMMIT</code> cannot span editor statements.
              </p>
            </div>
            <div className="divide-y divide-line">
              {SQL_SAMPLES.map((sample) => (
                <button
                  key={sample.label}
                  onClick={() => setSql(sample.sql)}
                  className="block w-full px-4 py-3 text-left transition hover:bg-[#FAFAF5]"
                >
                  <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-800">{sample.label}</p>
                  <p className="mt-1 text-[10px] leading-4 text-mist">{sample.description}</p>
                </button>
              ))}
            </div>
          </section>

          <section className="panel overflow-hidden">
            <div className="flex items-center gap-2 border-b border-line px-4 py-3">
              <History size={14} className="text-ink-600" />
              <h2 className="section-title">History</h2>
              {history.length > 0 && (
                <button className="ml-auto text-[10px] font-semibold text-mist hover:text-[#B84A2C]" onClick={clearHistory}>Clear</button>
              )}
            </div>
            {history.length === 0 ? (
              <p className="px-4 py-5 text-[10.5px] leading-5 text-mist">Executed statements will appear here. History is stored in this browser only.</p>
            ) : (
              <div className="max-h-[360px] divide-y divide-line overflow-y-auto">
                {history.map((entry, index) => (
                  <button
                    key={`${entry.at}-${index}`}
                    onClick={() => setSql(entry.sql)}
                    className="block w-full px-4 py-2.5 text-left transition hover:bg-[#FAFAF5]"
                    title="Load into editor"
                  >
                    <p className="truncate font-mono text-[9.5px] leading-4 text-ink-700">{entry.sql.replace(/\s+/g, ' ').slice(0, 120)}</p>
                    <p className="mt-0.5 font-mono text-[8.5px] text-mist">{new Date(entry.at).toLocaleString()}</p>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
