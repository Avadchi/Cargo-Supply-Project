import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowDownToLine,
  Boxes,
  CheckCircle2,
  CircleOff,
  PackageSearch,
  Pencil,
  Plus,
  Trash2,
  Warehouse,
} from 'lucide-react'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import { useLookups } from '../hooks/useLookups'
import { downloadCSV, formatCurrency, formatDate, formatNumber, numeric, stockStatus, todayISO } from '../lib/utils'
import { PageHeader, SearchInput, EmptyState } from '../components/ui/Bits'
import { Modal } from '../components/ui/Modal'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { Field, FormGrid, SelectInput, TextInput } from '../components/ui/Form'
import { StatusBadge } from '../components/ui/StatusBadge'

export default function Inventory() {
  const { db, create, update, remove } = useData()
  const { productById, warehouseById, categoryById } = useLookups()
  const toast = useToast()
  const [searchParams] = useSearchParams()

  const [search, setSearch] = useState('')
  const [warehouseFilter, setWarehouseFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('filter') === 'low' ? 'attention' : 'all')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ warehouse_id: '', product_id: '', quantity_on_hand: '' })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    setStatusFilter(searchParams.get('filter') === 'low' ? 'attention' : 'all')
  }, [searchParams])

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase()
    return (db.inventory || [])
      .map((row) => {
        const product = productById.get(String(row.product_id))
        const warehouse = warehouseById.get(String(row.warehouse_id))
        const status = stockStatus(row.quantity_on_hand, product?.reorder_level)
        return { ...row, product, warehouse, status, value: numeric(row.quantity_on_hand) * numeric(product?.unit_price) }
      })
      .filter((row) => {
        if (warehouseFilter !== 'all' && String(row.warehouse_id) !== warehouseFilter) return false
        if (statusFilter === 'attention' && row.status === 'In stock') return false
        if (statusFilter === 'in' && row.status !== 'In stock') return false
        if (statusFilter === 'out' && row.status !== 'Out of stock') return false
        if (!term) return true
        return [row.product?.product_name, row.warehouse?.warehouse_name, row.product?.product_id, categoryById.get(String(row.product?.category_id))?.category_name]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term))
      })
      .sort((a, b) => {
        const rank = { 'Out of stock': 0, Low: 1, 'In stock': 2 }
        if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status]
        return (a.product?.product_name || '').localeCompare(b.product?.product_name || '')
      })
  }, [db.inventory, productById, warehouseById, categoryById, search, warehouseFilter, statusFilter])

  const metrics = useMemo(() => {
    const all = (db.inventory || []).map((row) => {
      const product = productById.get(String(row.product_id))
      return { ...row, product, status: stockStatus(row.quantity_on_hand, product?.reorder_level) }
    })
    return {
      units: all.reduce((sum, row) => sum + numeric(row.quantity_on_hand), 0),
      value: all.reduce((sum, row) => sum + numeric(row.quantity_on_hand) * numeric(row.product?.unit_price), 0),
      low: all.filter((row) => row.status === 'Low').length,
      out: all.filter((row) => row.status === 'Out of stock').length,
    }
  }, [db.inventory, productById])

  const openCreate = () => {
    setEditing(null)
    setForm({ warehouse_id: '', product_id: '', quantity_on_hand: '' })
    setErrors({})
    setFormOpen(true)
  }

  const openEdit = (row) => {
    setEditing(row)
    setForm({ warehouse_id: String(row.warehouse_id), product_id: String(row.product_id), quantity_on_hand: String(row.quantity_on_hand ?? '') })
    setErrors({})
    setFormOpen(true)
  }

  const handleSave = async () => {
    const next = {}
    if (!form.warehouse_id) next.warehouse_id = 'Choose a warehouse.'
    if (!form.product_id) next.product_id = 'Choose a product.'
    if (form.quantity_on_hand === '' || numeric(form.quantity_on_hand) < 0) next.quantity_on_hand = 'Quantity must be zero or greater.'
    if (!editing && form.warehouse_id && form.product_id) {
      const exists = (db.inventory || []).some((row) => String(row.warehouse_id) === String(form.warehouse_id) && String(row.product_id) === String(form.product_id))
      if (exists) next.product_id = 'Stock already exists for this warehouse-product pair. Edit that row instead.'
    }
    setErrors(next)
    if (Object.keys(next).length) return

    setSaving(true)
    try {
      if (editing) {
        await update(
          'inventory',
          { warehouse_id: editing.warehouse_id, product_id: editing.product_id },
          { quantity_on_hand: Number(form.quantity_on_hand), last_updated: todayISO() },
        )
        toast.success('Inventory quantity updated.')
      } else {
        await create('inventory', {
          warehouse_id: Number(form.warehouse_id),
          product_id: Number(form.product_id),
          quantity_on_hand: Number(form.quantity_on_hand),
          last_updated: todayISO(),
        })
        toast.success('Inventory record created.')
      }
      setFormOpen(false)
    } catch (error) {
      toast.error(error.message || 'Could not save inventory record.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    setDeleteLoading(true)
    try {
      await remove('inventory', { warehouse_id: deleting.warehouse_id, product_id: deleting.product_id })
      toast.success('Inventory record removed.')
      setDeleting(null)
    } catch (error) {
      toast.error(error.message || 'Could not delete inventory record.')
    } finally {
      setDeleteLoading(false)
    }
  }

  const exportRows = () => {
    downloadCSV('kargo-inventory.csv', rows, [
      { label: 'Product', value: (row) => row.product?.product_name || '' },
      { label: 'Product ID', value: 'product_id' },
      { label: 'Warehouse', value: (row) => row.warehouse?.warehouse_name || '' },
      { label: 'Quantity on hand', value: 'quantity_on_hand' },
      { label: 'Reorder level', value: (row) => row.product?.reorder_level || 0 },
      { label: 'Status', value: 'status' },
      { label: 'Last updated', value: 'last_updated' },
    ])
    toast.success('Inventory exported.')
  }

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Operations / stock"
        title="Inventory"
        description="A single source of truth for quantity on hand and last-updated timestamps across every warehouse-product pair."
      >
        <button className="btn-secondary" onClick={exportRows}><ArrowDownToLine size={14} /> Export</button>
        <button className="btn-primary" onClick={openCreate}><Plus size={15} /> Add stock line</button>
      </PageHeader>

      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <div className="panel flex items-center gap-3 p-4"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F1F3EB] text-ink-600"><Boxes size={16} /></div><div><p className="mini-label">Units on hand</p><p className="mt-1 font-display text-[18px] font-semibold leading-none text-ink-950">{formatNumber(metrics.units)}</p></div></div>
        <div className="panel flex items-center gap-3 p-4"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F1F3EB] text-ink-600"><PackageSearch size={16} /></div><div><p className="mini-label">Stock value</p><p className="mt-1 font-display text-[18px] font-semibold leading-none text-ink-950">{formatCurrency(metrics.value, true)}</p></div></div>
        <div className="panel flex items-center gap-3 p-4"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FBF3E2] text-[#A77822]"><AlertTriangle size={16} /></div><div><p className="mini-label">Low stock</p><p className="mt-1 font-display text-[18px] font-semibold leading-none text-ink-950">{metrics.low}</p></div></div>
        <div className="panel flex items-center gap-3 p-4"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FBE7E0] text-[#B84A2C]"><CircleOff size={16} /></div><div><p className="mini-label">Out of stock</p><p className="mt-1 font-display text-[18px] font-semibold leading-none text-ink-950">{metrics.out}</p></div></div>
      </div>

      <div className="panel overflow-hidden">
        <div className="flex flex-col gap-2 border-b border-line px-4 py-3.5 lg:flex-row lg:items-center">
          <SearchInput value={search} onChange={setSearch} placeholder="Search product or warehouse…" className="w-full lg:max-w-xs" />
          <SelectInput className="h-9 w-full text-[12px] lg:w-auto" value={warehouseFilter} onChange={(event) => setWarehouseFilter(event.target.value)}>
            <option value="all">All warehouses</option>
            {(db.warehouse || []).map((warehouse) => <option key={warehouse.warehouse_id} value={warehouse.warehouse_id}>{warehouse.warehouse_name}</option>)}
          </SelectInput>
          <SelectInput className="h-9 w-full text-[12px] lg:w-auto" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">All statuses</option>
            <option value="attention">Needs attention</option>
            <option value="in">In stock</option>
            <option value="out">Out of stock</option>
          </SelectInput>
          <span className="ml-auto font-mono text-[10px] text-mist">{rows.length} stock lines</span>
        </div>

        {rows.length === 0 ? (
          <EmptyState icon={Boxes} title="No inventory lines found" description="Adjust the filters or add a warehouse-product stock record." action={<button className="btn-primary" onClick={openCreate}><Plus size={14} /> Add stock line</button>} />
        ) : (
          <div className="table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Warehouse</th>
                  <th>On hand</th>
                  <th>Reorder at</th>
                  <th>Stock value</th>
                  <th>Status</th>
                  <th>Last updated</th>
                  <th className="w-20 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={`${row.warehouse_id}-${row.product_id}`}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-[#F8F9F3] text-ink-600"><Boxes size={14} /></div>
                        <div className="min-w-0">
                          <p className="max-w-[220px] truncate text-[11.5px] font-semibold text-ink-900">{row.product?.product_name || 'Unknown product'}</p>
                          <p className="mt-0.5 font-mono text-[9px] text-mist">PRD-{row.product_id} · {categoryById.get(String(row.product?.category_id))?.category_name || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td><p className="text-[11px] text-ink-800">{row.warehouse?.warehouse_name || '—'}</p><p className="text-[9px] text-mist">{row.warehouse?.city}</p></td>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className={`font-mono text-[12px] font-semibold ${row.status === 'Out of stock' ? 'text-[#B84A2C]' : row.status === 'Low' ? 'text-[#946714]' : 'text-ink-900'}`}>{formatNumber(row.quantity_on_hand)}</span>
                        {row.status === 'In stock' && <CheckCircle2 size={11} className="text-[#6B9D44]" />}
                      </div>
                    </td>
                    <td><span className="font-mono text-[10.5px] text-mist">{formatNumber(row.product?.reorder_level)}</span></td>
                    <td><span className="font-mono text-[10.5px] text-ink-800">{formatCurrency(row.value, true)}</span></td>
                    <td><StatusBadge status={row.status} /></td>
                    <td><span className="text-[10px] text-mist">{formatDate(row.last_updated)}</span></td>
                    <td>
                      <div className="flex justify-end gap-0.5">
                        <button className="icon-btn" onClick={() => openEdit(row)} title="Update stock"><Pencil size={13} /></button>
                        <button className="icon-btn hover:bg-[#FBE7E0] hover:text-[#B84A2C]" onClick={() => setDeleting(row)} title="Delete stock line"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Update stock level' : 'Add stock line'}
        subtitle={editing ? `${editing.product?.product_name} at ${editing.warehouse?.warehouse_name}` : 'Create a new warehouse-product inventory record.'}
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setFormOpen(false)} disabled={saving}>Cancel</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : editing ? 'Update quantity' : 'Create stock line'}</button>
          </>
        }
      >
        <div className="space-y-4">
          {!editing && (
            <>
              <Field label="Warehouse" required error={errors.warehouse_id}>
                <SelectInput value={form.warehouse_id} onChange={(event) => setForm({ ...form, warehouse_id: event.target.value })} placeholder="Select warehouse" options={(db.warehouse || []).map((warehouse) => ({ value: warehouse.warehouse_id, label: warehouse.warehouse_name }))} />
              </Field>
              <Field label="Product" required error={errors.product_id}>
                <SelectInput value={form.product_id} onChange={(event) => setForm({ ...form, product_id: event.target.value })} placeholder="Select product" options={(db.product || []).map((product) => ({ value: product.product_id, label: product.product_name }))} />
              </Field>
            </>
          )}
          {editing && (
            <div className="rounded-xl border border-line bg-paper p-3">
              <p className="text-[11px] font-semibold text-ink-900">{editing.product?.product_name}</p>
              <p className="mt-0.5 flex items-center gap-1 text-[9.5px] text-mist"><Warehouse size={10} /> {editing.warehouse?.warehouse_name}</p>
            </div>
          )}
          <Field label="Quantity on hand" required error={errors.quantity_on_hand} hint="The last-updated timestamp is set automatically on save.">
            <TextInput type="number" min="0" value={form.quantity_on_hand} onChange={(event) => setForm({ ...form, quantity_on_hand: event.target.value })} placeholder="0" />
          </Field>
          {editing && (
            <p className="text-[10.5px] text-mist">
              Reorder level is {formatNumber(editing.product?.reorder_level)} units. Status will be recalculated automatically.
            </p>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        loading={deleteLoading}
        title="Remove stock line?"
        description={`Remove the inventory record for ${deleting?.product?.product_name || 'this product'} at ${deleting?.warehouse?.warehouse_name || 'this warehouse'}? This does not affect historic orders.`}
      />
    </div>
  )
}
