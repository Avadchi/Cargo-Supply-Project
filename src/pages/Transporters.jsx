import { useMemo, useState } from 'react'
import { Pencil, Phone, Plus, Ship, Trash2, Truck, Users } from 'lucide-react'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import { formatDate, numeric } from '../lib/utils'
import { VEHICLE_TYPES } from '../lib/constants'
import { PageHeader, SearchInput, EmptyState, Avatar } from '../components/ui/Bits'
import { Modal } from '../components/ui/Modal'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { Field, FormGrid, SelectInput, TextInput } from '../components/ui/Form'
import { StatusBadge } from '../components/ui/StatusBadge'

const blankTransporter = { transporter_name: '', phone: '', vehicle_type: 'Truck' }

export default function Transporters() {
  const { db, create, update, remove } = useData()
  const toast = useToast()

  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(blankTransporter)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const transporters = useMemo(() => {
    const term = search.trim().toLowerCase()
    return (db.transporter || [])
      .map((transporter) => {
        const shipments = (db.shipment || []).filter((row) => String(row.transporter_id) === String(transporter.transporter_id))
        const delivered = shipments.filter((row) => row.shipment_status === 'Delivered')
        const active = shipments.filter((row) => !['Delivered', 'Returned'].includes(row.shipment_status))
        return { ...transporter, shipments, delivered, active, lastShipment: [...shipments].sort((a, b) => new Date(b.ship_date) - new Date(a.ship_date))[0] }
      })
      .filter((transporter) => !term || [transporter.transporter_name, transporter.phone, transporter.vehicle_type].filter(Boolean).some((value) => String(value).toLowerCase().includes(term)))
      .sort((a, b) => a.transporter_name.localeCompare(b.transporter_name))
  }, [db.transporter, db.shipment, search])

  const openCreate = () => {
    setEditing(null)
    setForm(blankTransporter)
    setErrors({})
    setFormOpen(true)
  }

  const openEdit = (transporter) => {
    setEditing(transporter)
    setForm({
      transporter_name: transporter.transporter_name || '',
      phone: transporter.phone || '',
      vehicle_type: transporter.vehicle_type || 'Truck',
    })
    setErrors({})
    setFormOpen(true)
  }

  const handleSave = async () => {
    const next = {}
    if (!form.transporter_name.trim()) next.transporter_name = 'Transporter name is required.'
    if (!form.phone.trim()) next.phone = 'Phone number is required.'
    if (!form.vehicle_type) next.vehicle_type = 'Choose a vehicle type.'
    setErrors(next)
    if (Object.keys(next).length) return

    setSaving(true)
    const payload = {
      transporter_name: form.transporter_name.trim(),
      phone: form.phone.trim(),
      vehicle_type: form.vehicle_type,
    }
    try {
      if (editing) {
        await update('transporter', { transporter_id: editing.transporter_id }, payload)
        toast.success('Transporter updated.')
      } else {
        await create('transporter', payload)
        toast.success('Transporter added.')
      }
      setFormOpen(false)
    } catch (error) {
      toast.error(error.message || 'Could not save transporter.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    if ((db.shipment || []).some((row) => String(row.transporter_id) === String(deleting.transporter_id))) {
      toast.error('This transporter has shipment records and cannot be deleted.')
      setDeleting(null)
      return
    }
    setDeleteLoading(true)
    try {
      await remove('transporter', { transporter_id: deleting.transporter_id })
      toast.success('Transporter deleted.')
      setDeleting(null)
    } catch (error) {
      toast.error(error.message || 'Could not delete transporter.')
    } finally {
      setDeleteLoading(false)
    }
  }

  const totalShipments = (db.shipment || []).length
  const activeShipments = (db.shipment || []).filter((row) => !['Delivered', 'Returned'].includes(row.shipment_status)).length
  const vehicleCoverage = new Set((db.transporter || []).map((row) => row.vehicle_type).filter(Boolean)).size

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Logistics / carriers"
        title="Transporters"
        description="Maintain the carriers who move customer orders, including contact numbers and vehicle capability."
      >
        <button className="btn-primary" onClick={openCreate}><Plus size={15} /> Add transporter</button>
      </PageHeader>

      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <div className="panel flex items-center gap-3 p-4"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F1F3EB] text-ink-600"><Users size={16} /></div><div><p className="mini-label">Carriers</p><p className="mt-1 font-display text-[18px] font-semibold leading-none text-ink-950">{transporters.length}</p></div></div>
        <div className="panel flex items-center gap-3 p-4"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F1F3EB] text-ink-600"><Ship size={16} /></div><div><p className="mini-label">Shipments handled</p><p className="mt-1 font-display text-[18px] font-semibold leading-none text-ink-950">{totalShipments}</p></div></div>
        <div className="panel flex items-center gap-3 p-4"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E8F2EE] text-ink-600"><Truck size={16} /></div><div><p className="mini-label">Active now</p><p className="mt-1 font-display text-[18px] font-semibold leading-none text-ink-950">{activeShipments}</p></div></div>
        <div className="panel flex items-center gap-3 p-4"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F1F3EB] text-ink-600"><Truck size={16} /></div><div><p className="mini-label">Vehicle types</p><p className="mt-1 font-display text-[18px] font-semibold leading-none text-ink-950">{vehicleCoverage}</p></div></div>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput value={search} onChange={setSearch} placeholder="Search transporter, phone or vehicle…" className="w-full sm:max-w-xs" />
        <p className="font-mono text-[10px] text-mist">{transporters.length} carriers</p>
      </div>

      {transporters.length === 0 ? (
        <div className="panel"><EmptyState icon={Truck} title="No transporters yet" description="Add a carrier to begin assigning outbound shipments." action={<button className="btn-primary" onClick={openCreate}><Plus size={14} /> Add transporter</button>} /></div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {transporters.map((transporter) => (
            <article key={transporter.transporter_id} className="panel group p-5 transition hover:-translate-y-0.5 hover:shadow-lift">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <Avatar name={transporter.transporter_name} size="md" tone={transporter.transporter_id % 3 === 0 ? 'clay' : transporter.transporter_id % 2 ? 'green' : 'blue'} />
                  <div className="min-w-0">
                    <h3 className="truncate font-display text-[14px] font-semibold text-ink-950">{transporter.transporter_name}</h3>
                    <p className="mt-0.5 flex items-center gap-1 text-[9.5px] text-mist"><Truck size={9} /> {transporter.vehicle_type}</p>
                  </div>
                </div>
                <div className="flex gap-0.5 opacity-0 transition group-hover:opacity-100">
                  <button className="icon-btn" onClick={() => openEdit(transporter)} title="Edit"><Pencil size={13} /></button>
                  <button className="icon-btn hover:bg-[#FBE7E0] hover:text-[#B84A2C]" onClick={() => setDeleting(transporter)} title="Delete"><Trash2 size={13} /></button>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-1.5 rounded-lg bg-[#F7F8F2] px-2.5 py-2 text-[10.5px] text-ink-700">
                <Phone size={11} className="text-mist" /> {transporter.phone}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 border-t border-line pt-3">
                <div><p className="mini-label">Shipments</p><p className="mt-1 font-mono text-[11px] font-medium text-ink-900">{transporter.shipments.length}</p></div>
                <div><p className="mini-label">Active</p><p className="mt-1 font-mono text-[11px] font-medium text-ink-900">{transporter.active.length}</p></div>
                <div><p className="mini-label">Delivered</p><p className="mt-1 font-mono text-[11px] font-medium text-ink-900">{transporter.delivered.length}</p></div>
              </div>
              {transporter.active.length > 0 && (
                <div className="mt-3 flex items-center justify-between rounded-lg bg-[#EFF5EA] px-2.5 py-1.5">
                  <span className="text-[9.5px] font-medium text-[#527B32]">Currently on the road</span>
                  <StatusBadge status="In transit" />
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Edit transporter' : 'Add transporter'}
        subtitle="Carrier identity, contact and vehicle capability."
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setFormOpen(false)} disabled={saving}>Cancel</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Add transporter'}</button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Transporter name" required error={errors.transporter_name}>
            <TextInput value={form.transporter_name} onChange={(event) => setForm({ ...form, transporter_name: event.target.value })} placeholder="e.g. BlueRoute Logistics" />
          </Field>
          <FormGrid>
            <Field label="Phone" required error={errors.phone}>
              <TextInput value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="+91 98xxx xxxxx" />
            </Field>
            <Field label="Vehicle type" required error={errors.vehicle_type}>
              <SelectInput value={form.vehicle_type} onChange={(event) => setForm({ ...form, vehicle_type: event.target.value })} options={VEHICLE_TYPES} />
            </Field>
          </FormGrid>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        loading={deleteLoading}
        title="Delete transporter?"
        description={`Delete "${deleting?.transporter_name}"? Transporters with shipment records cannot be deleted.`}
      />
    </div>
  )
}
