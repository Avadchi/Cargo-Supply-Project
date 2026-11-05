import { useMemo, useState } from 'react'
import {
  ArrowDownToLine,
  Check,
  ClipboardList,
  Clock3,
  PackageCheck,
  Pencil,
  Plus,
  ShoppingCart,
  Trash2,
  Truck,
  X,
} from 'lucide-react'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import { useLookups } from '../hooks/useLookups'
import { downloadCSV, formatCurrency, formatDate, formatNumber, numeric, nowISO, poTotal, todayISO } from '../lib/utils'
import { PO_STATUSES } from '../lib/constants'
import { PageHeader, SearchInput, EmptyState, DetailRow } from '../components/ui/Bits'
import { Modal, Drawer } from '../components/ui/Modal'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { Field, FormGrid, SelectInput, TextInput } from '../components/ui/Form'
import { StatusBadge } from '../components/ui/StatusBadge'

const blankPo = { supplier_id: '', warehouse_id: '', po_date: todayISO(), po_status: 'Draft' }
const blankLine = { product_id: '', quantity: '', unit_cost: '' }

export default function PurchaseOrders() {
  const { db, create, update, remove, nextId } = useData()
  const { supplierById, warehouseById, productById } = useLookups()
  const toast = useToast()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(blankPo)
  const [lines, setLines] = useState([{ ...blankLine }])
  const [errors, setErrors] = useState({})
  const [lineErrors, setLineErrors] = useState([])
  const [saving, setSaving] = useState(false)
  const [viewing, setViewing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [receiving, setReceiving] = useState(false)

  const purchaseOrders = useMemo(() => {
    const term = search.trim().toLowerCase()
    return (db.purchase_order || [])
      .map((po) => {
        const items = (db.po_item || []).filter((item) => String(item.po_id) === String(po.po_id))
        return {
          ...po,
          supplier: supplierById.get(String(po.supplier_id)),
          warehouse: warehouseById.get(String(po.warehouse_id)),
          items: items.map((item) => ({ ...item, product: productById.get(String(item.product_id)) })),
          total: poTotal(po, db.po_item || []),
        }
      })
      .filter((po) => statusFilter === 'all' || po.po_status === statusFilter)
      .filter((po) => !term || [po.po_id, po.supplier?.supplier_name, po.warehouse?.warehouse_name, po.po_status].filter(Boolean).some((value) => String(value).toLowerCase().includes(term)))
      .sort((a, b) => new Date(b.po_date) - new Date(a.po_date))
  }, [db.purchase_order, db.po_item, supplierById, warehouseById, productById, search, statusFilter])

  const metrics = useMemo(() => {
    const all = (db.purchase_order || []).map((po) => ({ ...po, total: poTotal(po, db.po_item || []) }))
    return {
      open: all.filter((po) => ['Draft', 'Pending', 'Approved'].includes(po.po_status)).length,
      openValue: all.filter((po) => !['Received', 'Cancelled'].includes(po.po_status)).reduce((sum, po) => sum + po.total, 0),
      received: all.filter((po) => po.po_status === 'Received').length,
      pending: all.filter((po) => po.po_status === 'Pending').length,
    }
  }, [db.purchase_order, db.po_item])

  const openCreate = () => {
    setEditing(null)
    setForm(blankPo)
    setLines([{ ...blankLine }])
    setErrors({})
    setLineErrors([])
    setFormOpen(true)
  }

  const openEdit = (po) => {
    setEditing(po)
    setForm({
      supplier_id: String(po.supplier_id),
      warehouse_id: String(po.warehouse_id),
      po_date: po.po_date || todayISO(),
      po_status: po.po_status,
    })
    setLines(
      po.items.length
        ? po.items.map((item) => ({ product_id: String(item.product_id), quantity: String(item.quantity), unit_cost: String(item.unit_cost) }))
        : [{ ...blankLine }],
    )
    setErrors({})
    setLineErrors([])
    setFormOpen(true)
    setViewing(null)
  }

  const suggestedCost = (productId, supplierId = form.supplier_id) => {
    const link = (db.supplier_product || []).find(
      (row) => String(row.supplier_id) === String(supplierId) && String(row.product_id) === String(productId),
    )
    if (link) return link.supply_price
    const product = productById.get(String(productId))
    return product ? Math.round(numeric(product.unit_price) * 0.82) : ''
  }

  const updateLine = (index, patch) => {
    setLines((previous) => previous.map((line, lineIndex) => (lineIndex === index ? { ...line, ...patch } : line)))
  }

  const handleSupplierChange = (supplierId) => {
    setForm((previous) => ({ ...previous, supplier_id: supplierId }))
    setLines((previous) =>
      previous.map((line) => (line.product_id ? { ...line, unit_cost: String(suggestedCost(line.product_id, supplierId) || line.unit_cost) } : line)),
    )
  }

  const validate = () => {
    const next = {}
    if (!form.supplier_id) next.supplier_id = 'Choose a supplier.'
    if (!form.warehouse_id) next.warehouse_id = 'Choose a destination warehouse.'
    if (!form.po_date) next.po_date = 'PO date is required.'
    const nextLineErrors = lines.map((line) => {
      const lineError = {}
      if (!line.product_id) lineError.product_id = 'Choose a product.'
      if (!line.quantity || numeric(line.quantity) <= 0) lineError.quantity = 'Quantity must be greater than zero.'
      if (line.unit_cost === '' || numeric(line.unit_cost) < 0) lineError.unit_cost = 'Enter unit cost.'
      return lineError
    })
    const productIds = lines.map((line) => String(line.product_id)).filter(Boolean)
    const duplicate = new Set(productIds).size !== productIds.length
    setErrors(next)
    setLineErrors(nextLineErrors)
    const hasLineError = nextLineErrors.some((lineError) => Object.keys(lineError).length > 0)
    if (duplicate) toast.error('Each product can only appear once per purchase order.')
    return Object.keys(next).length === 0 && !hasLineError && !duplicate
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    const poId = editing ? editing.po_id : nextId('purchase_order', 'po_id')
    const payload = {
      supplier_id: Number(form.supplier_id),
      warehouse_id: Number(form.warehouse_id),
      po_date: form.po_date,
      po_status: form.po_status,
    }
    try {
      if (editing) {
        await update('purchase_order', { po_id: poId }, payload)
        const existing = (db.po_item || []).filter((item) => String(item.po_id) === String(poId))
        for (const item of existing) {
          await remove('po_item', { po_id: poId, line_no: item.line_no })
        }
      } else {
        await create('purchase_order', { po_id: poId, ...payload })
      }
      await create(
        'po_item',
        lines.map((line, index) => ({
          po_id: poId,
          line_no: index + 1,
          product_id: Number(line.product_id),
          quantity: Number(line.quantity),
          unit_cost: Number(line.unit_cost),
        })),
      )
      toast.success(editing ? 'Purchase order updated.' : 'Purchase order created.')
      setFormOpen(false)
      setViewing(null)
    } catch (error) {
      toast.error(error.message || 'Could not save purchase order.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    setDeleteLoading(true)
    try {
      const items = (db.po_item || []).filter((item) => String(item.po_id) === String(deleting.po_id))
      for (const item of items) {
        await remove('po_item', { po_id: deleting.po_id, line_no: item.line_no })
      }
      await remove('purchase_order', { po_id: deleting.po_id })
      toast.success('Purchase order deleted.')
      setDeleting(null)
      setViewing(null)
    } catch (error) {
      toast.error(error.message || 'Could not delete purchase order.')
    } finally {
      setDeleteLoading(false)
    }
  }

  const changeStatus = async (po, status) => {
    try {
      await update('purchase_order', { po_id: po.po_id }, { po_status: status })
      toast.success(`Purchase order marked ${status.toLowerCase()}.`)
    } catch (error) {
      toast.error(error.message || 'Could not update status.')
    }
  }

  const receivePo = async (po) => {
    if (!po) return
    setReceiving(true)
    try {
      for (const item of po.items) {
        const existing = (db.inventory || []).find(
          (row) => String(row.warehouse_id) === String(po.warehouse_id) && String(row.product_id) === String(item.product_id),
        )
        if (existing) {
          await update(
            'inventory',
            { warehouse_id: po.warehouse_id, product_id: item.product_id },
            { quantity_on_hand: numeric(existing.quantity_on_hand) + numeric(item.quantity), last_updated: nowISO() },
          )
        } else {
          await create('inventory', {
            warehouse_id: po.warehouse_id,
            product_id: item.product_id,
            quantity_on_hand: numeric(item.quantity),
            last_updated: nowISO(),
          })
        }
      }
      await update('purchase_order', { po_id: po.po_id }, { po_status: 'Received' })
      toast.success(`PO-${po.po_id} received. Stock has been added to ${po.warehouse?.warehouse_name}.`)
      setViewing(null)
    } catch (error) {
      toast.error(error.message || 'Could not receive purchase order.')
    } finally {
      setReceiving(false)
    }
  }

  const viewingPo = viewing ? purchaseOrders.find((po) => String(po.po_id) === String(viewing.po_id)) : null
  const lineTotal = lines.reduce((sum, line) => sum + numeric(line.quantity) * numeric(line.unit_cost), 0)

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Procurement / purchase orders"
        title="Purchase orders"
        description="Create supplier purchase orders, record ordered products and quantities, and receive stock into a destination warehouse."
      >
        <button
          className="btn-secondary"
          onClick={() => {
            downloadCSV('kargo-purchase-orders.csv', purchaseOrders, [
              { label: 'PO', value: 'po_id' },
              { label: 'Supplier', value: (row) => row.supplier?.supplier_name || '' },
              { label: 'Warehouse', value: (row) => row.warehouse?.warehouse_name || '' },
              { label: 'Date', value: 'po_date' },
              { label: 'Status', value: 'po_status' },
              { label: 'Items', value: (row) => row.items.length },
              { label: 'Total', value: 'total' },
            ])
            toast.success('Purchase orders exported.')
          }}
        >
          <ArrowDownToLine size={14} /> Export
        </button>
        <button className="btn-primary" onClick={openCreate}><Plus size={15} /> New purchase order</button>
      </PageHeader>

      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <div className="panel flex items-center gap-3 p-4"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F1F3EB] text-ink-600"><ClipboardList size={16} /></div><div><p className="mini-label">Open POs</p><p className="mt-1 font-display text-[18px] font-semibold leading-none text-ink-950">{metrics.open}</p></div></div>
        <div className="panel flex items-center gap-3 p-4"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F1F3EB] text-ink-600"><ShoppingCart size={16} /></div><div><p className="mini-label">Open commitment</p><p className="mt-1 font-display text-[18px] font-semibold leading-none text-ink-950">{formatCurrency(metrics.openValue, true)}</p></div></div>
        <div className="panel flex items-center gap-3 p-4"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FFF3D8] text-[#A77822]"><Clock3 size={16} /></div><div><p className="mini-label">Pending approval</p><p className="mt-1 font-display text-[18px] font-semibold leading-none text-ink-950">{metrics.pending}</p></div></div>
        <div className="panel flex items-center gap-3 p-4"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EAF4E1] text-[#527B32]"><PackageCheck size={16} /></div><div><p className="mini-label">Received</p><p className="mt-1 font-display text-[18px] font-semibold leading-none text-ink-950">{metrics.received}</p></div></div>
      </div>

      <div className="panel overflow-hidden">
        <div className="flex flex-col gap-2 border-b border-line px-4 py-3.5 sm:flex-row sm:items-center">
          <SearchInput value={search} onChange={setSearch} placeholder="Search PO, supplier or warehouse…" className="w-full sm:max-w-xs" />
          <SelectInput className="h-9 w-full text-[12px] sm:w-auto" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">All statuses</option>
            {PO_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
          </SelectInput>
          <span className="ml-auto font-mono text-[10px] text-mist">{purchaseOrders.length} orders</span>
        </div>

        {purchaseOrders.length === 0 ? (
          <EmptyState icon={ClipboardList} title="No purchase orders found" description="Create a purchase order to replenish stock from a supplier." action={<button className="btn-primary" onClick={openCreate}><Plus size={14} /> New purchase order</button>} />
        ) : (
          <div className="table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Purchase order</th>
                  <th>Supplier</th>
                  <th>Destination</th>
                  <th>Order date</th>
                  <th>Lines</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th className="w-20 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {purchaseOrders.map((po) => (
                  <tr key={po.po_id} className="cursor-pointer" onClick={() => setViewing(po)}>
                    <td><span className="font-mono text-[11px] font-semibold text-ink-900">PO-{po.po_id}</span><p className="mt-0.5 text-[9px] text-mist">{po.items.length} product{po.items.length === 1 ? '' : 's'}</p></td>
                    <td><p className="max-w-[190px] truncate text-[11.5px] font-medium text-ink-900">{po.supplier?.supplier_name || 'Unknown supplier'}</p><p className="mt-0.5 text-[9px] text-mist">{po.supplier?.city}</p></td>
                    <td><p className="max-w-[150px] truncate text-[10.5px] text-ink-800">{po.warehouse?.warehouse_name || '—'}</p></td>
                    <td><span className="text-[10.5px] text-mist">{formatDate(po.po_date, 'short')}</span></td>
                    <td><span className="rounded-md bg-[#F1F3EB] px-2 py-1 font-mono text-[10px] text-ink-700">{po.items.length}</span></td>
                    <td><span className="font-mono text-[11px] font-medium text-ink-900">{formatCurrency(po.total)}</span></td>
                    <td><StatusBadge status={po.po_status} /></td>
                    <td>
                      <div className="flex justify-end gap-0.5" onClick={(event) => event.stopPropagation()}>
                        <button className="icon-btn" onClick={() => openEdit(po)} title="Edit"><Pencil size={13} /></button>
                        <button className="icon-btn hover:bg-[#FBE7E0] hover:text-[#B84A2C]" onClick={() => setDeleting(po)} title="Delete"><Trash2 size={13} /></button>
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
        title={editing ? 'Edit purchase order' : 'New purchase order'}
        subtitle="Select a supplier and destination, then add the products being purchased."
        size="xl"
        footer={
          <>
            <div className="mr-auto hidden text-[11px] text-mist sm:block">
              Order total <span className="ml-1 font-mono text-[13px] font-semibold text-ink-900">{formatCurrency(lineTotal)}</span>
            </div>
            <button className="btn-secondary" onClick={() => setFormOpen(false)} disabled={saving}>Cancel</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Create purchase order'}</button>
          </>
        }
      >
        <div className="space-y-5">
          <FormGrid>
            <Field label="Supplier" required error={errors.supplier_id}>
              <SelectInput
                value={form.supplier_id}
                onChange={(event) => handleSupplierChange(event.target.value)}
                placeholder="Select supplier"
                options={(db.supplier || []).map((supplier) => ({ value: supplier.supplier_id, label: supplier.supplier_name }))}
              />
            </Field>
            <Field label="Destination warehouse" required error={errors.warehouse_id}>
              <SelectInput value={form.warehouse_id} onChange={(event) => setForm({ ...form, warehouse_id: event.target.value })} placeholder="Select warehouse" options={(db.warehouse || []).map((warehouse) => ({ value: warehouse.warehouse_id, label: warehouse.warehouse_name }))} />
            </Field>
            <Field label="PO date" required error={errors.po_date}>
              <TextInput type="date" value={form.po_date} onChange={(event) => setForm({ ...form, po_date: event.target.value })} />
            </Field>
            <Field label="Status">
              <SelectInput value={form.po_status} onChange={(event) => setForm({ ...form, po_status: event.target.value })} options={PO_STATUSES} />
            </Field>
          </FormGrid>

          <div>
            <div className="mb-2.5 flex items-center justify-between border-b border-line pb-2.5">
              <div><h3 className="font-display text-[13px] font-semibold text-ink-950">Order line items</h3><p className="mt-0.5 text-[10.5px] text-mist">Record each product and the quantity being purchased.</p></div>
              <button className="btn-secondary h-8 px-3 text-[11px]" onClick={() => setLines([...lines, { ...blankLine }])} type="button"><Plus size={13} /> Add line</button>
            </div>
            <div className="space-y-2.5">
              {lines.map((line, index) => {
                const lineError = lineErrors[index] || {}
                return (
                  <div key={index} className="rounded-xl border border-line bg-[#FBFBF7] p-3">
                    <div className="flex items-center justify-between pb-2">
                      <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-mist">Line {String(index + 1).padStart(2, '0')}</span>
                      <button className="icon-btn h-6 w-6 hover:bg-[#FBE7E0] hover:text-[#B84A2C]" onClick={() => setLines(lines.length === 1 ? [{ ...blankLine }] : lines.filter((_, lineIndex) => lineIndex !== index))} type="button" title="Remove line"><X size={13} /></button>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_100px_120px_92px]">
                      <Field error={lineError.product_id}>
                        <SelectInput
                          className="h-9 text-[11.5px]"
                          value={line.product_id}
                          onChange={(event) => updateLine(index, { product_id: event.target.value, unit_cost: String(suggestedCost(event.target.value) || '') })}
                          placeholder="Select product"
                          options={(db.product || []).map((product) => ({ value: product.product_id, label: product.product_name }))}
                        />
                      </Field>
                      <Field error={lineError.quantity}>
                        <TextInput className="h-9 text-[11.5px]" type="number" min="1" placeholder="Qty" value={line.quantity} onChange={(event) => updateLine(index, { quantity: event.target.value })} />
                      </Field>
                      <Field error={lineError.unit_cost}>
                        <TextInput className="h-9 text-[11.5px]" type="number" min="0" step="0.01" placeholder="Unit cost" value={line.unit_cost} onChange={(event) => updateLine(index, { unit_cost: event.target.value })} />
                      </Field>
                      <div className="flex h-9 items-center justify-end rounded-lg bg-white px-2.5 font-mono text-[10.5px] font-medium text-ink-900">
                        {formatCurrency(numeric(line.quantity) * numeric(line.unit_cost))}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </Modal>

      <Drawer
        open={Boolean(viewingPo)}
        onClose={() => setViewing(null)}
        title={viewingPo ? `Purchase order PO-${viewingPo.po_id}` : 'Purchase order'}
        subtitle={viewingPo ? `${viewingPo.supplier?.supplier_name} · ${formatDate(viewingPo.po_date)}` : ''}
        footer={
          viewingPo && (
            <>
              <button className="btn-danger" onClick={() => setDeleting(viewingPo)}><Trash2 size={14} /> Delete</button>
              {['Draft', 'Pending'].includes(viewingPo.po_status) && (
                <button className="btn-secondary" onClick={() => changeStatus(viewingPo, 'Approved')}><Check size={14} /> Approve</button>
              )}
              {['Draft', 'Pending', 'Approved'].includes(viewingPo.po_status) && (
                <button className="btn-primary" onClick={() => receivePo(viewingPo)} disabled={receiving}><PackageCheck size={14} /> {receiving ? 'Receiving…' : 'Receive stock'}</button>
              )}
              {!['Received', 'Cancelled'].includes(viewingPo.po_status) && <button className="btn-secondary" onClick={() => openEdit(viewingPo)}><Pencil size={14} /> Edit</button>}
            </>
          )
        }
      >
        {viewingPo && (
          <div className="space-y-6">
            <div className="flex items-center justify-between rounded-xl border border-line bg-paper p-4">
              <div>
                <p className="mini-label">Order total</p>
                <p className="mt-1 font-display text-[24px] font-semibold leading-none tracking-[-0.03em] text-ink-950">{formatCurrency(viewingPo.total)}</p>
                <p className="mt-1 text-[10px] text-mist">{viewingPo.items.length} line items</p>
              </div>
              <StatusBadge status={viewingPo.po_status} />
            </div>
            <div>
              <p className="kicker mb-2">Order details</p>
              <dl>
                <DetailRow label="Supplier">{viewingPo.supplier?.supplier_name}</DetailRow>
                <DetailRow label="Contact">{viewingPo.supplier?.email}</DetailRow>
                <DetailRow label="Destination">{viewingPo.warehouse?.warehouse_name}</DetailRow>
                <DetailRow label="City">{viewingPo.warehouse?.city}</DetailRow>
                <DetailRow label="PO date">{formatDate(viewingPo.po_date)}</DetailRow>
              </dl>
            </div>
            <div>
              <p className="kicker mb-2">Products ordered</p>
              <div className="overflow-hidden rounded-xl border border-line">
                <table className="w-full text-left">
                  <thead><tr className="bg-[#F7F7F1]"><th className="px-3 py-2 font-mono text-[8.5px] uppercase tracking-wider text-mist">Product</th><th className="px-2 py-2 text-right font-mono text-[8.5px] uppercase tracking-wider text-mist">Qty</th><th className="px-2 py-2 text-right font-mono text-[8.5px] uppercase tracking-wider text-mist">Unit</th><th className="px-3 py-2 text-right font-mono text-[8.5px] uppercase tracking-wider text-mist">Total</th></tr></thead>
                  <tbody>
                    {viewingPo.items.map((item) => (
                      <tr key={item.line_no} className="border-t border-line">
                        <td className="px-3 py-2.5 text-[10.5px] font-medium text-ink-900">{item.product?.product_name || 'Unknown'}</td>
                        <td className="px-2 py-2.5 text-right font-mono text-[10px] text-ink-800">{formatNumber(item.quantity)}</td>
                        <td className="px-2 py-2.5 text-right font-mono text-[10px] text-ink-800">{formatCurrency(item.unit_cost)}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-[10px] font-medium text-ink-900">{formatCurrency(numeric(item.quantity) * numeric(item.unit_cost))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            {viewingPo.po_status === 'Received' && (
              <div className="flex items-start gap-2 rounded-lg bg-[#EFF7E8] px-3 py-2.5 text-[10.5px] leading-5 text-[#4E7332]">
                <PackageCheck size={14} className="mt-0.5 shrink-0" /> Stock from this purchase order has been added to {viewingPo.warehouse?.warehouse_name}.
              </div>
            )}
          </div>
        )}
      </Drawer>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        loading={deleteLoading}
        title="Delete purchase order?"
        description={`Delete PO-${deleting?.po_id} and all of its line items? This cannot be undone.`}
      />
    </div>
  )
}
