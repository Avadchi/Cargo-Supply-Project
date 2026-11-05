import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  Boxes,
  Building2,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  Users,
  Warehouse as WarehouseIcon,
} from 'lucide-react'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import { useLookups } from '../hooks/useLookups'
import { formatCurrency, formatDate, formatNumber, fullName, numeric, pct, stockStatus } from '../lib/utils'
import { PageHeader, SearchInput, EmptyState, Avatar, DetailRow } from '../components/ui/Bits'
import { Modal, Drawer } from '../components/ui/Modal'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { Field, FormGrid, SelectInput, TextInput } from '../components/ui/Form'
import { StatusBadge } from '../components/ui/StatusBadge'

const blankWarehouse = { warehouse_name: '', city: '', capacity: '', manager_id: '' }

export default function Warehouses() {
  const { db, create, update, remove } = useData()
  const { employeeName } = useLookups()
  const toast = useToast()

  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(blankWarehouse)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [viewing, setViewing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const warehouses = useMemo(() => {
    const term = search.trim().toLowerCase()
    return (db.warehouse || [])
      .map((warehouse) => {
        const inventory = (db.inventory || []).filter((row) => String(row.warehouse_id) === String(warehouse.warehouse_id))
        const used = inventory.reduce((sum, row) => sum + numeric(row.quantity_on_hand), 0)
        const value = inventory.reduce((sum, row) => {
          const product = (db.product || []).find((rowProduct) => String(rowProduct.product_id) === String(row.product_id))
          return sum + numeric(row.quantity_on_hand) * numeric(product?.unit_price)
        }, 0)
        const employees = (db.employee || []).filter((employee) => String(employee.warehouse_id) === String(warehouse.warehouse_id))
        const low = inventory.filter((row) => {
          const product = (db.product || []).find((rowProduct) => String(rowProduct.product_id) === String(row.product_id))
          return stockStatus(row.quantity_on_hand, product?.reorder_level) !== 'In stock'
        })
        return { ...warehouse, inventory, used, value, employees, low, utilization: pct(used, warehouse.capacity), manager: (db.employee || []).find((employee) => String(employee.emp_id) === String(warehouse.manager_id)) }
      })
      .filter((warehouse) => !term || [warehouse.warehouse_name, warehouse.city, warehouse.manager?.first_name, warehouse.manager?.last_name].filter(Boolean).some((value) => String(value).toLowerCase().includes(term)))
      .sort((a, b) => a.warehouse_name.localeCompare(b.warehouse_name))
  }, [db.warehouse, db.inventory, db.product, db.employee, search])

  const totals = useMemo(() => ({
    capacity: (db.warehouse || []).reduce((sum, row) => sum + numeric(row.capacity), 0),
    used: warehouses.reduce((sum, row) => sum + row.used, 0),
    value: warehouses.reduce((sum, row) => sum + row.value, 0),
    low: warehouses.reduce((sum, row) => sum + row.low.length, 0),
  }), [db.warehouse, warehouses])

  const openCreate = () => {
    setEditing(null)
    setForm(blankWarehouse)
    setErrors({})
    setFormOpen(true)
  }

  const openEdit = (warehouse) => {
    setEditing(warehouse)
    setForm({
      warehouse_name: warehouse.warehouse_name || '',
      city: warehouse.city || '',
      capacity: String(warehouse.capacity ?? ''),
      manager_id: warehouse.manager_id ? String(warehouse.manager_id) : '',
    })
    setErrors({})
    setFormOpen(true)
    setViewing(null)
  }

  const handleSave = async () => {
    const next = {}
    if (!form.warehouse_name.trim()) next.warehouse_name = 'Warehouse name is required.'
    if (!form.city.trim()) next.city = 'City is required.'
    if (!form.capacity || numeric(form.capacity) <= 0) next.capacity = 'Capacity must be greater than zero.'
    if (
      form.manager_id &&
      (db.warehouse || []).some(
        (warehouse) =>
          String(warehouse.manager_id) === String(form.manager_id) &&
          String(warehouse.warehouse_id) !== String(editing?.warehouse_id),
      )
    ) {
      next.manager_id = 'This employee already manages another warehouse.'
    }
    setErrors(next)
    if (Object.keys(next).length) return

    setSaving(true)
    const payload = {
      warehouse_name: form.warehouse_name.trim(),
      city: form.city.trim(),
      capacity: Number(form.capacity),
      manager_id: form.manager_id ? Number(form.manager_id) : null,
    }
    try {
      if (editing) {
        await update('warehouse', { warehouse_id: editing.warehouse_id }, payload)
        toast.success('Warehouse updated.')
      } else {
        await create('warehouse', payload)
        toast.success('Warehouse added.')
      }
      setFormOpen(false)
    } catch (error) {
      toast.error(error.message || 'Could not save warehouse.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    const references =
      (db.inventory || []).some((row) => String(row.warehouse_id) === String(deleting.warehouse_id)) ||
      (db.employee || []).some((row) => String(row.warehouse_id) === String(deleting.warehouse_id)) ||
      (db.customer_order || []).some((row) => String(row.warehouse_id) === String(deleting.warehouse_id)) ||
      (db.purchase_order || []).some((row) => String(row.warehouse_id) === String(deleting.warehouse_id))
    if (references) {
      toast.error('This warehouse is referenced by inventory, people or orders. Reassign those records first.')
      setDeleting(null)
      return
    }
    setDeleteLoading(true)
    try {
      await remove('warehouse', { warehouse_id: deleting.warehouse_id })
      toast.success('Warehouse deleted.')
      setDeleting(null)
    } catch (error) {
      toast.error(error.message || 'Could not delete warehouse.')
    } finally {
      setDeleteLoading(false)
    }
  }

  const viewingWarehouse = viewing ? warehouses.find((row) => String(row.warehouse_id) === String(viewing.warehouse_id)) : null

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Network / facilities"
        title="Warehouse management"
        description="Track physical locations, storage capacity, assigned managers and the inventory held at every site."
      >
        <button className="btn-primary" onClick={openCreate}><Plus size={15} /> Add warehouse</button>
      </PageHeader>

      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <div className="panel flex items-center gap-3 p-4"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F1F3EB] text-ink-600"><WarehouseIcon size={16} /></div><div><p className="mini-label">Facilities</p><p className="mt-1 font-display text-[18px] font-semibold leading-none text-ink-950">{warehouses.length}</p></div></div>
        <div className="panel flex items-center gap-3 p-4"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F1F3EB] text-ink-600"><Boxes size={16} /></div><div><p className="mini-label">Units stored</p><p className="mt-1 font-display text-[18px] font-semibold leading-none text-ink-950">{formatNumber(totals.used)}</p></div></div>
        <div className="panel flex items-center gap-3 p-4"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F1F3EB] text-ink-600"><Building2 size={16} /></div><div><p className="mini-label">Network capacity</p><p className="mt-1 font-display text-[18px] font-semibold leading-none text-ink-950">{formatNumber(totals.capacity)}</p></div></div>
        <div className="panel flex items-center gap-3 p-4"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FBF3E2] text-[#A77822]"><AlertTriangle size={16} /></div><div><p className="mini-label">Low stock lines</p><p className="mt-1 font-display text-[18px] font-semibold leading-none text-ink-950">{totals.low}</p></div></div>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput value={search} onChange={setSearch} placeholder="Search warehouses, city or manager…" className="w-full sm:max-w-xs" />
        <p className="font-mono text-[10px] text-mist">{pct(totals.used, totals.capacity)}% network utilisation</p>
      </div>

      {warehouses.length === 0 ? (
        <div className="panel"><EmptyState icon={WarehouseIcon} title="No warehouses yet" description="Add a facility to begin tracking inventory and fulfilment." action={<button className="btn-primary" onClick={openCreate}><Plus size={14} /> Add warehouse</button>} /></div>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {warehouses.map((warehouse) => (
            <article key={warehouse.warehouse_id} className="panel cursor-pointer p-5 transition hover:-translate-y-0.5 hover:shadow-lift" onClick={() => setViewing(warehouse)}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink-900 text-lime-400"><WarehouseIcon size={18} /></div>
                  <div>
                    <h3 className="font-display text-[15px] font-semibold tracking-[-0.01em] text-ink-950">{warehouse.warehouse_name}</h3>
                    <p className="mt-0.5 flex items-center gap-1 text-[10.5px] text-mist"><MapPin size={10} /> {warehouse.city}</p>
                  </div>
                </div>
                <div className="flex gap-0.5" onClick={(event) => event.stopPropagation()}>
                  <button className="icon-btn" onClick={() => openEdit(warehouse)} title="Edit"><Pencil size={13} /></button>
                  <button className="icon-btn hover:bg-[#FBE7E0] hover:text-[#B84A2C]" onClick={() => setDeleting(warehouse)} title="Delete"><Trash2 size={13} /></button>
                </div>
              </div>

              <div className="mt-4 flex items-end justify-between">
                <div>
                  <p className="mini-label">Capacity used</p>
                  <p className="mt-1 font-display text-[23px] font-semibold leading-none tracking-[-0.03em] text-ink-950">{warehouse.utilization}%</p>
                  <p className="mt-1 text-[10px] text-mist">{formatNumber(warehouse.used)} of {formatNumber(warehouse.capacity)} units</p>
                </div>
                <div className="w-32">
                  <div className="h-2 overflow-hidden rounded-full bg-[#EEF0E8]">
                    <div className={`h-full rounded-full ${warehouse.utilization > 85 ? 'bg-clay' : warehouse.utilization > 65 ? 'bg-[#D49A2A]' : 'bg-ink-800'}`} style={{ width: `${Math.min(100, warehouse.utilization)}%` }} />
                  </div>
                  <p className="mt-1.5 text-right text-[9px] text-mist">{formatNumber(warehouse.capacity - warehouse.used)} free</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-3.5">
                <div><p className="mini-label">Manager</p><p className="mt-1 truncate text-[10.5px] font-medium text-ink-800">{warehouse.manager ? fullName(warehouse.manager) : 'Unassigned'}</p></div>
                <div><p className="mini-label">People</p><p className="mt-1 font-mono text-[11px] font-medium text-ink-900">{warehouse.employees.length}</p></div>
                <div><p className="mini-label">Stock value</p><p className="mt-1 font-mono text-[10.5px] font-medium text-ink-900">{formatCurrency(warehouse.value, true)}</p></div>
              </div>
              {warehouse.low.length > 0 && (
                <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-[#FBF3E2] px-2.5 py-1.5 text-[9.5px] font-medium text-[#8C6A21]">
                  <AlertTriangle size={11} /> {warehouse.low.length} stock line{warehouse.low.length === 1 ? '' : 's'} below reorder level
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Edit warehouse' : 'Add warehouse'}
        subtitle="Facility identity, location, storage capacity and manager."
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setFormOpen(false)} disabled={saving}>Cancel</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Add warehouse'}</button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Warehouse name" required error={errors.warehouse_name}>
            <TextInput value={form.warehouse_name} onChange={(event) => setForm({ ...form, warehouse_name: event.target.value })} placeholder="e.g. Vashi Distribution Hub" />
          </Field>
          <FormGrid>
            <Field label="City" required error={errors.city}>
              <TextInput value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} placeholder="City" />
            </Field>
            <Field label="Capacity (units)" required error={errors.capacity}>
              <TextInput type="number" min="1" value={form.capacity} onChange={(event) => setForm({ ...form, capacity: event.target.value })} placeholder="e.g. 50000" />
            </Field>
          </FormGrid>
          <Field label="Assigned manager" hint="Each employee can manage only one warehouse (manager_id is unique)." error={errors.manager_id}>
            <SelectInput
              value={form.manager_id}
              onChange={(event) => setForm({ ...form, manager_id: event.target.value })}
              placeholder="No manager assigned"
              options={(db.employee || []).map((employee) => ({ value: employee.emp_id, label: `${fullName(employee)} · ${employee.designation}` }))}
            />
          </Field>
        </div>
      </Modal>

      <Drawer
        open={Boolean(viewingWarehouse)}
        onClose={() => setViewing(null)}
        title={viewingWarehouse?.warehouse_name || 'Warehouse'}
        subtitle={viewingWarehouse ? `${viewingWarehouse.city} · ${formatNumber(viewingWarehouse.capacity)} unit capacity` : ''}
        footer={
          <>
            <button className="btn-danger" onClick={() => setDeleting(viewingWarehouse)}><Trash2 size={14} /> Delete</button>
            <button className="btn-secondary" onClick={() => openEdit(viewingWarehouse)}><Pencil size={14} /> Edit warehouse</button>
          </>
        }
      >
        {viewingWarehouse && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-line bg-paper p-3"><p className="mini-label">Utilisation</p><p className="mt-1.5 font-mono text-[13px] font-medium text-ink-900">{viewingWarehouse.utilization}%</p></div>
              <div className="rounded-xl border border-line bg-paper p-3"><p className="mini-label">Stock value</p><p className="mt-1.5 font-mono text-[12px] font-medium text-ink-900">{formatCurrency(viewingWarehouse.value, true)}</p></div>
              <div className="rounded-xl border border-line bg-paper p-3"><p className="mini-label">Employees</p><p className="mt-1.5 font-mono text-[13px] font-medium text-ink-900">{viewingWarehouse.employees.length}</p></div>
            </div>
            <div>
              <p className="kicker mb-2">Facility details</p>
              <dl>
                <DetailRow label="Manager">{viewingWarehouse.manager ? `${fullName(viewingWarehouse.manager)} · ${viewingWarehouse.manager.designation}` : 'Unassigned'}</DetailRow>
                <DetailRow label="Location">{viewingWarehouse.city}</DetailRow>
                <DetailRow label="Capacity">{formatNumber(viewingWarehouse.capacity)} units</DetailRow>
                <DetailRow label="Units on hand">{formatNumber(viewingWarehouse.used)}</DetailRow>
                <DetailRow label="Available space">{formatNumber(viewingWarehouse.capacity - viewingWarehouse.used)} units</DetailRow>
              </dl>
            </div>

            <div>
              <p className="kicker mb-2">Inventory at this site</p>
              <div className="divide-y divide-line rounded-xl border border-line">
                {viewingWarehouse.inventory.slice(0, 8).map((row) => {
                  const product = (db.product || []).find((item) => String(item.product_id) === String(row.product_id))
                  return (
                    <div key={row.product_id} className="flex items-center gap-3 px-3 py-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F1F3EB] text-ink-600"><Boxes size={12} /></div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11px] font-semibold text-ink-900">{product?.product_name || 'Unknown product'}</p>
                        <p className="text-[9px] text-mist">Updated {formatDate(row.last_updated, 'short')}</p>
                      </div>
                      <p className="font-mono text-[10.5px] text-ink-800">{formatNumber(row.quantity_on_hand)}</p>
                    </div>
                  )
                })}
                {viewingWarehouse.inventory.length === 0 && <p className="px-4 py-5 text-center text-[11px] text-mist">No inventory recorded.</p>}
              </div>
              {viewingWarehouse.inventory.length > 8 && <p className="mt-2 text-right text-[10px] text-mist">+{viewingWarehouse.inventory.length - 8} more lines in inventory</p>}
            </div>

            <div>
              <p className="kicker mb-2">Assigned people</p>
              <div className="divide-y divide-line rounded-xl border border-line">
                {viewingWarehouse.employees.map((employee) => (
                  <div key={employee.emp_id} className="flex items-center gap-3 px-3 py-2.5">
                    <Avatar name={fullName(employee)} size="xs" />
                    <div className="min-w-0 flex-1"><p className="truncate text-[11px] font-semibold text-ink-900">{fullName(employee)}</p><p className="text-[9px] text-mist">{employee.designation}</p></div>
                    <span className="font-mono text-[9.5px] text-mist">EMP-{employee.emp_id}</span>
                  </div>
                ))}
                {viewingWarehouse.employees.length === 0 && <p className="px-4 py-5 text-center text-[11px] text-mist">No employees assigned.</p>}
              </div>
            </div>
          </div>
        )}
      </Drawer>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        loading={deleteLoading}
        title="Delete warehouse?"
        description={`Delete "${deleting?.warehouse_name}"? Warehouses with inventory, employees or orders cannot be deleted.`}
      />
    </div>
  )
}
