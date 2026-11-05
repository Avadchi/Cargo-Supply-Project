import { useMemo, useState } from 'react'
import {
  ArrowDownToLine,
  Check,
  Cloud,
  Copy,
  Database as DatabaseIcon,
  ExternalLink,
  HardDrive,
  KeyRound,
  Link2,
  RefreshCw,
  RotateCcw,
  Server,
  ShieldCheck,
  Table2,
  TerminalSquare,
  Unplug,
} from 'lucide-react'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import { supabaseProjectUrl } from '../lib/supabase'
import { formatDateTime } from '../lib/utils'
import { PageHeader } from '../components/ui/Bits'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'

const TABLES = [
  { name: 'supplier', label: 'Supplier', pk: 'supplier_id', columns: 9, description: 'Vendor identity, contact, address, rating and registration date.' },
  { name: 'supplier_phone', label: 'Supplier phone', pk: 'supplier_id + phone_no', columns: 2, description: 'One-to-many contact numbers for each supplier.' },
  { name: 'category', label: 'Category', pk: 'category_id', columns: 3, description: 'Product taxonomy and merchandising groups.' },
  { name: 'product', label: 'Product', pk: 'product_id', columns: 6, description: 'Catalogue items, pricing and reorder thresholds.' },
  { name: 'warehouse', label: 'Warehouse', pk: 'warehouse_id', columns: 4, description: 'Facilities, capacity and assigned manager.' },
  { name: 'employee', label: 'Employee', pk: 'emp_id', columns: 9, description: 'People, roles, salary, warehouse and supervisor.' },
  { name: 'supplier_product', label: 'Supplier product', pk: 'supplier_id + product_id', columns: 4, description: 'Many-to-many supply catalogue with price and lead time.' },
  { name: 'purchase_order', label: 'Purchase order', pk: 'po_id', columns: 5, description: 'Procurement header linked to supplier and warehouse.' },
  { name: 'po_item', label: 'PO item', pk: 'po_id + line_no', columns: 5, description: 'Products and quantities on each purchase order.' },
  { name: 'customer', label: 'Customer', pk: 'customer_id', columns: 9, description: 'Customer identity, contact and delivery address.' },
  { name: 'customer_order', label: 'Customer order', pk: 'order_id', columns: 5, description: 'Order header linked to customer and fulfilment warehouse.' },
  { name: 'order_item', label: 'Order item', pk: 'order_id + line_no', columns: 5, description: 'Products, quantities and selling prices on each order.' },
  { name: 'payment', label: 'Payment', pk: 'payment_id', columns: 5, description: 'Payment records associated with customer orders.' },
  { name: 'transporter', label: 'Transporter', pk: 'transporter_id', columns: 4, description: 'Carrier identity, phone number and vehicle type.' },
  { name: 'shipment', label: 'Shipment', pk: 'shipment_id', columns: 6, description: 'Order dispatch, transporter, delivery dates and status.' },
  { name: 'inventory', label: 'Inventory', pk: 'warehouse_id + product_id', columns: 4, description: 'Quantity on hand and last update for each warehouse-product pair.' },
]

const RELATIONSHIPS = [
  'supplier 1 : N supplier_phone',
  'supplier M : N product via supplier_product',
  'category 1 : N product',
  'warehouse 1 : N employee',
  'employee 1 : N employee (supervisor)',
  'employee 1 : N warehouse (manager)',
  'supplier 1 : N purchase_order',
  'warehouse 1 : N purchase_order',
  'purchase_order 1 : N po_item',
  'product 1 : N po_item',
  'product 1 : N inventory',
  'warehouse 1 : N inventory',
  'customer 1 : N customer_order',
  'warehouse 1 : N customer_order',
  'customer_order 1 : N order_item',
  'product 1 : N order_item',
  'customer_order 1 : 1 payment (per payment record)',
  'transporter 1 : N shipment',
  'customer_order 1 : 1 shipment',
]

const SQL_POLICY = `-- Development only: enable anon access from the browser
alter table supplier enable row level security;
create policy "anon all" on supplier
  for all to anon using (true) with check (true);
-- Repeat for every table used by the app.`;

export default function Database() {
  const { db, mode, isSupabaseConfigured, error, refresh, loadDemo, resetDemo } = useData()
  const toast = useToast()
  const [resetOpen, setResetOpen] = useState(false)
  const [syncing, setSyncing] = useState(false)

  const live = mode === 'supabase' && isSupabaseConfigured
  const totalRows = useMemo(() => TABLES.reduce((sum, table) => sum + (db[table.name]?.length || 0), 0), [db])
  const lastSeed = useMemo(() => {
    try {
      const raw = localStorage.getItem('kargo.demo.workspace.v3')
      return raw ? JSON.parse(raw).__seededAt : null
    } catch {
      return null
    }
  }, [db])

  const copy = async (text, message = 'Copied to clipboard.') => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(message)
    } catch {
      toast.error('Could not access the clipboard.')
    }
  }

  const handleRefresh = async () => {
    if (!isSupabaseConfigured) {
      toast.info('Add Supabase credentials in .env, then restart the dev server.')
      return
    }
    setSyncing(true)
    await refresh()
    setSyncing(false)
    toast.success(live ? 'Live data reloaded.' : 'Connection attempted. Check the status below.')
  }

  const exportDemo = () => {
    const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'kargo-workspace.json'
    link.click()
    URL.revokeObjectURL(link.href)
    toast.success('Workspace snapshot downloaded.')
  }

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="System / database"
        title="Database & connection"
        description="Inspect the relational model and connect this interface to your Supabase project. The site uses demo data until credentials are supplied."
      >
        <button className="btn-secondary" onClick={handleRefresh} disabled={syncing}>
          <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} /> {syncing ? 'Checking…' : 'Test connection'}
        </button>
      </PageHeader>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.35fr_1fr]">
        <section className="relative overflow-hidden rounded-2xl bg-ink-950 p-5 text-white shadow-card sm:p-6">
          <div className="hero-noise pointer-events-none absolute inset-0 opacity-40" />
          <div className="relative">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${live ? 'bg-lime-500 text-ink-950' : 'bg-[#E9B35E]/15 text-[#E9B35E]'}`}>
                  {live ? <Cloud size={18} /> : <HardDrive size={18} />}
                </div>
                <div>
                  <p className="font-display text-[16px] font-semibold">{live ? 'Supabase connected' : 'Demo workspace active'}</p>
                  <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-white/35">
                    {live ? 'Live Postgres via anon key' : 'Local storage persistence'}
                  </p>
                </div>
              </div>
              <span className={`badge ${live ? 'bg-lime-500/15 text-lime-400' : 'bg-[#E9B35E]/15 text-[#E9B35E]'}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${live ? 'bg-lime-400' : 'bg-[#E9B35E]'}`} />
                {live ? 'Live' : 'Offline demo'}
              </span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-3">
                <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-white/35">Tables</p>
                <p className="mt-1.5 font-display text-[19px] font-semibold text-white">{TABLES.length}</p>
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-3">
                <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-white/35">Rows</p>
                <p className="mt-1.5 font-display text-[19px] font-semibold text-white">{totalRows}</p>
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-3">
                <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-white/35">Relations</p>
                <p className="mt-1.5 font-display text-[19px] font-semibold text-white">{RELATIONSHIPS.length}</p>
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-3">
                <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-white/35">Schema</p>
                <p className="mt-1.5 font-display text-[15px] font-semibold text-white">public</p>
              </div>
            </div>

            {live && supabaseProjectUrl && (
              <div className="mt-4 flex flex-col gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 sm:flex-row sm:items-center">
                <div className="flex min-w-0 items-center gap-2">
                  <Link2 size={12} className="shrink-0 text-lime-400" />
                  <span className="truncate font-mono text-[10px] text-white/60">{supabaseProjectUrl}</span>
                </div>
                <a
                  href={supabaseProjectUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-auto inline-flex shrink-0 items-center gap-1 text-[10px] font-semibold text-lime-400 hover:text-lime-300"
                >
                  Open project <ExternalLink size={10} />
                </a>
              </div>
            )}

            {!live && (
              <p className="mt-4 text-[11px] leading-5 text-white/45">
                All CRUD actions are persisted to this browser. Add your Supabase URL and anon key to <code className="rounded bg-white/10 px-1 py-0.5 font-mono text-[9.5px] text-white/70">.env</code> and restart the server to switch every module to live Postgres.
              </p>
            )}

            {error && (
              <div className="mt-4 rounded-xl border border-[#E8794A]/30 bg-[#E8794A]/10 px-3 py-2.5">
                <p className="text-[10.5px] font-semibold text-[#F3B49D]">Connection error</p>
                <p className="mt-0.5 font-mono text-[9.5px] leading-4 text-[#EBC4B5]">{error}</p>
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              {!live && <button className="btn-accent h-8 px-3 text-[11px]" onClick={() => copy('VITE_SUPABASE_URL=\nVITE_SUPABASE_ANON_KEY=')}><Copy size={12} /> Copy env template</button>}
              <button className="btn h-8 border border-white/10 bg-white/[0.06] px-3 text-[11px] text-white/75 hover:bg-white/10" onClick={exportDemo}><ArrowDownToLine size={12} /> Export workspace JSON</button>
              {!live && <button className="btn h-8 border border-white/10 bg-white/[0.04] px-3 text-[11px] text-white/55 hover:bg-white/10" onClick={() => setResetOpen(true)}><RotateCcw size={12} /> Reset demo</button>}
            </div>
          </div>
        </section>

        <section className="panel p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <TerminalSquare size={16} className="text-ink-600" />
            <h2 className="section-title">Connect in three steps</h2>
          </div>
          <div className="mt-4 space-y-4">
            <div className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink-900 font-mono text-[10px] font-semibold text-lime-400">1</span>
              <div>
                <p className="text-[11.5px] font-semibold text-ink-900">Open your Supabase project settings</p>
                <p className="mt-0.5 text-[10.5px] leading-4 text-mist">Go to Project Settings → API and copy the Project URL and anon public key.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink-900 font-mono text-[10px] font-semibold text-lime-400">2</span>
              <div className="min-w-0 flex-1">
                <p className="text-[11.5px] font-semibold text-ink-900">Paste them into the root .env</p>
                <pre className="mt-2 overflow-x-auto rounded-lg border border-line bg-[#F7F8F2] p-2.5 font-mono text-[9.5px] leading-5 text-ink-800">{'VITE_SUPABASE_URL=https://xxxx.supabase.co\nVITE_SUPABASE_ANON_KEY=eyJhbGciOi...'}</pre>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink-900 font-mono text-[10px] font-semibold text-lime-400">3</span>
              <div>
                <p className="text-[11.5px] font-semibold text-ink-900">Restart and test</p>
                <p className="mt-0.5 text-[10.5px] leading-4 text-mist">Stop the dev server, run <code className="rounded bg-[#F1F3EB] px-1 py-0.5 font-mono text-[9px]">npm run dev</code> again, then use “Test connection”.</p>
              </div>
            </div>
          </div>
          <div className="mt-5 rounded-xl border border-line bg-[#FBFBF7] p-3">
            <div className="flex items-center gap-1.5">
              <KeyRound size={12} className="text-mist" />
              <p className="text-[10px] font-semibold text-ink-800">Environment status</p>
            </div>
            <div className="mt-2 space-y-1.5">
              <div className="flex items-center justify-between text-[10px]"><span className="text-mist">VITE_SUPABASE_URL</span><span className={isSupabaseConfigured ? 'font-medium text-[#39741D]' : 'font-medium text-[#946714]'}>{isSupabaseConfigured ? 'Configured' : 'Not set'}</span></div>
              <div className="flex items-center justify-between text-[10px]"><span className="text-mist">VITE_SUPABASE_ANON_KEY</span><span className={isSupabaseConfigured ? 'font-medium text-[#39741D]' : 'font-medium text-[#946714]'}>{isSupabaseConfigured ? 'Configured' : 'Not set'}</span></div>
            </div>
          </div>
          <p className="mt-3 flex items-start gap-1.5 text-[9.5px] leading-4 text-mist">
            <ShieldCheck size={12} className="mt-0.5 shrink-0" /> Only the public anon key is used. For a production deployment, enable Row Level Security and scope policies. For local demos, anon all-access policies are sufficient.
          </p>
        </section>
      </div>

      {!live && (
        <section className="mt-3 panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
            <div className="flex items-center gap-2"><ShieldCheck size={15} className="text-ink-600" /><h2 className="section-title">Supabase access policy</h2></div>
            <button className="text-[10.5px] font-semibold text-ink-600 hover:text-ink-900" onClick={() => copy(SQL_POLICY, 'Policy SQL copied.')}>Copy SQL</button>
          </div>
          <div className="grid gap-0 lg:grid-cols-[1fr_1.4fr]">
            <div className="border-b border-line p-5 lg:border-b-0 lg:border-r">
              <p className="text-[11.5px] leading-5 text-mist">
                Supabase blocks anonymous access by default. If reads or writes fail after connecting, either disable RLS for this academic project or add <code className="rounded bg-[#F1F3EB] px-1 font-mono text-[9.5px]">for all to anon</code> policies to each table.
              </p>
              <div className="mt-3 flex items-start gap-2 rounded-lg bg-[#FFF9EB] px-3 py-2.5 text-[10px] leading-4 text-[#785A22]">
                <Unplug size={13} className="mt-0.5 shrink-0" /> Never expose your service-role key in client-side environment variables.
              </div>
            </div>
            <pre className="overflow-x-auto bg-[#10241C] p-5 font-mono text-[9.5px] leading-5 text-[#B9D7C2]">{SQL_POLICY}</pre>
          </div>
        </section>
      )}

      <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-[1.4fr_1fr]">
        <section className="panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
            <div>
              <h2 className="section-title">Relational schema</h2>
              <p className="mt-0.5 text-[11px] text-mist">All 16 tables mapped from the supplied ER diagram.</p>
            </div>
            <span className="badge bg-[#F1F3EB] text-ink-700"><Table2 size={10} /> {TABLES.length} tables</span>
          </div>
          <div className="table-shell max-h-[520px] overflow-y-auto">
            <table className="data-table min-w-[640px]">
              <thead className="sticky top-0 z-10">
                <tr><th>Table</th><th>Primary key</th><th>Attributes</th><th className="text-right">Rows</th></tr>
              </thead>
              <tbody>
                {TABLES.map((table) => (
                  <tr key={table.name}>
                    <td>
                      <p className="font-mono text-[11px] font-semibold text-ink-900">{table.name}</p>
                      <p className="mt-0.5 max-w-[270px] truncate text-[9px] text-mist">{table.description}</p>
                    </td>
                    <td><span className="font-mono text-[9.5px] text-ink-700">{table.pk}</span></td>
                    <td><span className="font-mono text-[9.5px] text-mist">{table.columns} columns</span></td>
                    <td className="text-right"><span className="rounded-md bg-[#F1F3EB] px-2 py-1 font-mono text-[9.5px] text-ink-700">{db[table.name]?.length || 0}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel overflow-hidden">
          <div className="border-b border-line px-5 py-3.5">
            <h2 className="section-title">Relationship map</h2>
            <p className="mt-0.5 text-[11px] text-mist">Foreign-key paths and cardinality.</p>
          </div>
          <div className="divide-y divide-line">
            {RELATIONSHIPS.map((relationship) => (
              <div key={relationship} className="flex items-center gap-2.5 px-5 py-2.5">
                <Link2 size={11} className="shrink-0 text-mist" />
                <span className="font-mono text-[9.5px] text-ink-700">{relationship}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        onConfirm={() => {
          resetDemo()
          setResetOpen(false)
          toast.success('Demo workspace reset to its original seed data.')
        }}
        title="Reset demo workspace?"
        confirmLabel="Reset demo"
        danger={false}
        description="Every local demo change will be discarded and the original sample dataset will be restored. This does not affect Supabase."
      />
    </div>
  )
}
