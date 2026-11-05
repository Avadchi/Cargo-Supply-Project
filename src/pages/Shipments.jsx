import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowDownToLine,
  CalendarDays,
  CheckCircle2,
  Clock3,
  MapPin,
  Pencil,
  Plus,
  Ship,
  Trash2,
  Truck,
  XCircle,
} from 'lucide-react'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import { useLookups } from '../hooks/useLookups'
import { downloadCSV, formatDate, fullName, numeric, todayISO } from '../lib/utils'
import { SHIPMENT_STATUSES } from '../lib/constants'
import { PageHeader, SearchInput, EmptyState, Avatar } from '../components/ui/Bits'
import { Modal } from '../components/ui/Modal'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { Field, FormGrid, SelectInput, TextInput } from '../components/ui/Form'
import { StatusBadge } from '../components/ui/StatusBadge'

const blankShipment = { order_id: '', transporter_id: '', ship_date: todayISO(), delivery_date: '', shipment_status: 'Pending' }

export default function Shipments() {
  const { db, create, update, remove } = useData()
  const { customerById, transporterById, orderById } = useLookups()
  const toast = useToast()
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(blankShipment)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const shipments = useMemo(() => {
    const term = search.trim().toLowerCase()
    return (db.shipment || [])
      .map((shipment) => {
        const order = orderById.get(String(shipment.order_id))
        const customer = customerById.get(String(order?.customer_id))
        const transporter = transporterById.get(String(shipment.transporter_id))
        return { ...shipment, order, customer, transporter }
      })
      .filter((shipment) => statusFilter === 'all' || shipment.shipment_status === statusFilter)
      .filter((shipment) => !term || [shipment.shipment_id, shipment.order_id, shipment.shipment_status, shipment.transporter?.transporter_name, fullName(shipment.customer)].filter(Boolean).some((value) => String(value).toLowerCase().includes(term)))
      .sort((a, b) => new Date(b.ship_date) - new Date(a.ship_date))
  }, [db.shipment, orderById, customerById, transporterById, search, statusFilter])

  const metrics = useMemo(() => {
    const all = db.shipment || []
    return {
      total: all.length,
      transit: all.filter((row) => ['In transit', 'Out for delivery'].includes(row.shipment_status)).length,
      delivered: all.filter((row) => row.shipment_status === 'Delivered').length,
      delayed: all.filter((row) => row.shipment_status === 'Delayed').length,
    }
  }, [db.shipment])

  const openCreate = () => {
    setEditing(null)
    setForm({ ...blankShipment, ship_date: todayISO() })
    setErrors({})
    setFormOpen(true)
  }

  const openEdit = (shipment) => {
    setEditing(shipment)
    setForm({
      order_id: String(shipment.order_id),
      transporter_id: String(shipment.transporter_id),
      ship_date: shipment.ship_date || todayISO(),
      delivery_date: shipment.delivery_date || '',
      shipment_status: shipment.shipment_status || 'Pending',
    })
    setErrors({})
    setFormOpen(true)
  }

  const handleSave = async () => {
    const next = {}
    if (!form.order_id) next.order_id = 'Choose an order.'
    if (!form.transporter_id) next.transporter_id = 'Choose a transporter.'
    if (!form.ship_date) next.ship_date = 'Ship date is required.'
    if (form.delivery_date && form.delivery_date < form.ship_date) next.delivery_date = 'Delivery date cannot be before the ship date.'
    if (!editing && form.order_id && (db.shipment || []).some((row) => String(row.order_id) === String(form.order_id))) next.order_id = 'A shipment already exists for this order.'
    setErrors(next)
    if (Object.keys(next).length) return

    setSaving(true)
    const payload = {
      order_id: Number(form.order_id),
      transporter_id: Number(form.transporter_id),
      ship_date: form.ship_date,
      delivery_date: form.delivery_date || null,
      shipment_status: form.shipment_status,
    }
    try {
      if (editing) {
        await update('shipment', { shipment_id: editing.shipment_id }, payload)
      } else {
        await create('shipment', payload)
      }

      const order = orderById.get(String(form.order_id))
      if (order) {
        if (form.shipment_status === 'Delivered' && order.order_status !== 'Delivered') {
          await update('customer_order', { order_id: order.order_id }, { order_status: 'Delivered' })
        } else if (['In transit', 'Out for delivery', 'Delayed'].includes(form.shipment_status) && ['Pending', 'Confirmed', 'Processing', 'Packed'].includes(order.order_status)) {
          await update('customer_order', { order_id: order.order_id }, { order_status: 'Shipped' })
        }
      }
      toast.success(editing ? 'Shipment updated.' : 'Shipment created.')
      setFormOpen(false)
    } catch (error) {
      toast.error(error.message || 'Could not save shipment.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    setDeleteLoading(true)
    try {
      await remove('shipment', { shipment_id: deleting.shipment_id })
      toast.success('Shipment deleted.')
      setDeleting(null)
    } catch (error) {
      toast.error(error.message || 'Could not delete shipment.')
    } finally {
      setDeleteLoading(false)
    }
  }

  const exportShipments = () => {
    downloadCSV('kargo-shipments.csv', shipments, [
      { label: 'Shipment', value: 'shipment_id' },
      { label: 'Order', value: 'order_id' },
      { label: 'Customer', value: (row) => fullName(row.customer) },
      { label: 'Transporter', value: (row) => row.transporter?.transporter_name || '' },
      { label: 'Ship date', value: 'ship_date' },
      { label: 'Delivery date', value: 'delivery_date' },
      { label: 'Status', value: 'shipment_status' },
    ])
    toast.success('Shipments exported.')
  }

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Logistics / outbound"
        title="Shipments"
        description="Assign transporters to customer orders and track ship dates, delivery dates and the real-time shipment status."
      >
        <button className="btn-secondary" onClick={exportShipments}><ArrowDownToLine size={14} /> Export</button>
        <button className="btn-primary" onClick={openCreate}><Plus size={15} /> New shipment</button>
      </PageHeader>

      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <div className="panel flex items-center gap-3 p-4"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F1F3EB] text-ink-600"><Ship size={16} /></div><div><p className="mini-label">Shipments</p><p className="mt-1 font-display text-[18px] font-semibold leading-none text-ink-950">{metrics.total}</p></div></div>
        <div className="panel flex items-center gap-3 p-4"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E8F2EE] text-ink-600"><Truck size={16} /></div><div><p className="mini-label">In transit</p><p className="mt-1 font-display text-[18px] font-semibold leading-none text-ink-950">{metrics.transit}</p></div></div>
        <div className="panel flex items-center gap-3 p-4"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EAF4E1] text-[#527B32]"><CheckCircle2 size={16} /></div><div><p className="mini-label">Delivered</p><p className="mt-1 font-display text-[18px] font-semibold leading-none text-ink-950">{metrics.delivered}</p></div></div>
        <div className="panel flex items-center gap-3 p-4"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FBE7E0] text-[#B84A2C]"><XCircle size={16} /></div><div><p className="mini-label">Delayed</p><p className="mt-1 font-display text-[18px] font-semibold leading-none text-ink-950">{metrics.delayed}</p></div></div>
      </div>

      <div className="panel overflow-hidden">
        <div className="flex flex-col gap-2 border-b border-line px-4 py-3.5 sm:flex-row sm:items-center">
          <SearchInput value={search} onChange={setSearch} placeholder="Search shipment, order or transporter…" className="w-full sm:max-w-xs" />
          <SelectInput className="h-9 w-full text-[12px] sm:w-auto" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">All statuses</option>
            {SHIPMENT_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
          </SelectInput>
          <span className="ml-auto font-mono text-[10px] text-mist">{shipments.length} shipments</span>
        </div>

        {shipments.length === 0 ? (
          <EmptyState icon={Ship} title="No shipments found" description="Create a shipment to assign a transporter and track delivery." action={<button className="btn-primary" onClick={openCreate}><Plus size={14} /> New shipment</button>} />
        ) : (
          <div className="table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Shipment</th>
                  <th>Order / customer</th>
                  <th>Transporter</th>
                  <th>Ship date</th>
                  <th>Delivery date</th>
                  <th>Status</th>
                  <th className="w-20 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {shipments.map((shipment) => (
                  <tr key={shipment.shipment_id}>
                    <td><span className="font-mono text-[11px] font-semibold text-ink-900">SHIP-{shipment.shipment_id}</span><p className="mt-0.5 text-[9px] text-mist">#{shipment.order_id}</p></td>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={fullName(shipment.customer)} size="xs" tone="blue" />
                        <div className="min-w-0"><button className="max-w-[150px] truncate text-left text-[11px] font-medium text-ink-900 hover:underline" onClick={() => navigate(`/orders?view=${shipment.order_id}`)}>{fullName(shipment.customer)}</button><p className="flex items-center gap-1 text-[9px] text-mist"><MapPin size={8} /> {shipment.customer?.city}</p></div>
                      </div>
                    </td>
                    <td><p className="text-[11px] text-ink-800">{shipment.transporter?.transporter_name || '—'}</p><p className="text-[9px] text-mist">{shipment.transporter?.vehicle_type}</p></td>
                    <td><span className="text-[10.5px] text-mist">{formatDate(shipment.ship_date, 'short')}</span></td>
                    <td><span className="text-[10.5px] text-mist">{shipment.delivery_date ? formatDate(shipment.delivery_date, 'short') : '—'}</span></td>
                    <td><StatusBadge status={shipment.shipment_status} /></td>
                    <td>
                      <div className="flex justify-end gap-0.5">
                        <button className="icon-btn" onClick={() => openEdit(shipment)} title="Edit"><Pencil size={13} /></button>
                        <button className="icon-btn hover:bg-[#FBE7E0] hover:text-[#B84A2C]" onClick={() => setDeleting(shipment)} title="Delete"><Trash2 size={13} /></button>
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
        title={editing ? 'Edit shipment' : 'New shipment'}
        subtitle={editing ? `Updating SHIP-${editing.shipment_id}` : 'Assign an order to a transporter and set delivery milestones.'}
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setFormOpen(false)} disabled={saving}>Cancel</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Create shipment'}</button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Customer order" required error={errors.order_id} hint={editing ? 'A shipment is uniquely associated with one order.' : 'Only orders without an existing shipment should be selected.'}>
            <SelectInput value={form.order_id} onChange={(event) => setForm({ ...form, order_id: event.target.value })} placeholder="Select order" disabled={Boolean(editing)}>
              {(db.customer_order || []).map((order) => {
                const customer = customerById.get(String(order.customer_id))
                const hasShipment = (db.shipment || []).some((row) => String(row.order_id) === String(order.order_id) && String(row.shipment_id) !== String(editing?.shipment_id))
                return <option key={order.order_id} value={order.order_id}>#{order.order_id} · {fullName(customer)}{hasShipment ? ' · already shipped' : ''}</option>
              })}
            </SelectInput>
          </Field>
          <Field label="Transporter" required error={errors.transporter_id}>
            <SelectInput value={form.transporter_id} onChange={(event) => setForm({ ...form, transporter_id: event.target.value })} placeholder="Select transporter" options={(db.transporter || []).map((transporter) => ({ value: transporter.transporter_id, label: `${transporter.transporter_name} · ${transporter.vehicle_type}` }))} />
          </Field>
          <FormGrid>
            <Field label="Ship date" required error={errors.ship_date}>
              <TextInput type="date" value={form.ship_date} onChange={(event) => setForm({ ...form, ship_date: event.target.value })} />
            </Field>
            <Field label="Delivery date" error={errors.delivery_date}>
              <TextInput type="date" value={form.delivery_date} onChange={(event) => setForm({ ...form, delivery_date: event.target.value })} />
            </Field>
          </FormGrid>
          <Field label="Shipment status">
            <SelectInput value={form.shipment_status} onChange={(event) => setForm({ ...form, shipment_status: event.target.value })} options={SHIPMENT_STATUSES} />
          </Field>
          <p className="rounded-lg bg-[#F7F8F2] px-3 py-2 text-[10px] leading-4 text-mist">
            Marking a shipment delivered also marks the associated customer order as delivered.
          </p>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        loading={deleteLoading}
        title="Delete shipment?"
        description={`Delete SHIP-${deleting?.shipment_id}? The customer order will remain but will no longer have shipment tracking.`}
      />
    </div>
  )
}
