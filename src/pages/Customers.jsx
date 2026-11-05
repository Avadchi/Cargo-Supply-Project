import { useMemo, useState } from 'react'
import { Mail, MapPin, Pencil, Phone, Plus, ShoppingBag, Trash2, UserRound, Users } from 'lucide-react'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import { useLookups } from '../hooks/useLookups'
import { formatCurrency, formatDate, fullName, numeric, orderTotal } from '../lib/utils'
import { INDIAN_STATES } from '../lib/constants'
import { PageHeader, SearchInput, EmptyState, Avatar, DetailRow } from '../components/ui/Bits'
import { Modal, Drawer } from '../components/ui/Modal'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { Field, FormGrid, SelectInput, TextInput } from '../components/ui/Form'
import { StatusBadge } from '../components/ui/StatusBadge'

const blankCustomer = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  street: '',
  city: '',
  state: 'Maharashtra',
  pincode: '',
}

export default function Customers() {
  const { db, create, update, remove } = useData()
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(blankCustomer)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [viewing, setViewing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const customers = useMemo(() => {
    const term = search.trim().toLowerCase()
    return (db.customer || [])
      .map((customer) => {
        const orders = (db.customer_order || []).filter((order) => String(order.customer_id) === String(customer.customer_id))
        const activeOrders = orders.filter((order) => order.order_status !== 'Cancelled')
        const spend = activeOrders.reduce((sum, order) => sum + orderTotal(order, db.order_item || []), 0)
        const lastOrder = [...orders].sort((a, b) => new Date(b.order_date) - new Date(a.order_date))[0]
        return { ...customer, orders, activeOrders, spend, lastOrder }
      })
      .filter((customer) => !term || [customer.first_name, customer.last_name, customer.email, customer.phone, customer.city].filter(Boolean).some((value) => String(value).toLowerCase().includes(term)))
      .sort((a, b) => a.first_name.localeCompare(b.first_name))
  }, [db.customer, db.customer_order, db.order_item, search])

  const metrics = useMemo(() => {
    const totalSpend = customers.reduce((sum, customer) => sum + customer.spend, 0)
    return {
      total: (db.customer || []).length,
      paying: customers.filter((customer) => customer.orders.length > 0).length,
      repeat: customers.filter((customer) => customer.orders.length > 1).length,
      cities: new Set((db.customer || []).map((customer) => customer.city).filter(Boolean)).size,
      spend: totalSpend,
    }
  }, [db.customer, customers])

  const openCreate = () => {
    setEditing(null)
    setForm(blankCustomer)
    setErrors({})
    setFormOpen(true)
  }

  const openEdit = (customer) => {
    setEditing(customer)
    setForm({
      first_name: customer.first_name || '',
      last_name: customer.last_name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      street: customer.street || '',
      city: customer.city || '',
      state: customer.state || 'Maharashtra',
      pincode: customer.pincode || '',
    })
    setErrors({})
    setFormOpen(true)
    setViewing(null)
  }

  const handleSave = async () => {
    const next = {}
    if (!form.first_name.trim()) next.first_name = 'First name is required.'
    if (!form.last_name.trim()) next.last_name = 'Last name is required.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = 'Enter a valid email address.'
    if ((db.customer || []).some((customer) => customer.email?.toLowerCase() === form.email.trim().toLowerCase() && String(customer.customer_id) !== String(editing?.customer_id))) next.email = 'This email is already registered.'
    if (!form.phone.trim()) next.phone = 'Phone number is required.'
    if (!form.street.trim()) next.street = 'Street address is required.'
    if (!form.city.trim()) next.city = 'City is required.'
    if (!/^\d{6}$/.test(form.pincode.trim())) next.pincode = 'Pincode must be 6 digits.'
    setErrors(next)
    if (Object.keys(next).length) return

    setSaving(true)
    const payload = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim(),
      street: form.street.trim(),
      city: form.city.trim(),
      state: form.state,
      pincode: form.pincode.trim(),
    }
    try {
      if (editing) {
        await update('customer', { customer_id: editing.customer_id }, payload)
        toast.success('Customer updated.')
      } else {
        await create('customer', payload)
        toast.success('Customer added.')
      }
      setFormOpen(false)
    } catch (error) {
      toast.error(error.message || 'Could not save customer.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    if ((db.customer_order || []).some((order) => String(order.customer_id) === String(deleting.customer_id))) {
      toast.error('This customer has orders and cannot be deleted. Keep the record for order history.')
      setDeleting(null)
      return
    }
    setDeleteLoading(true)
    try {
      await remove('customer', { customer_id: deleting.customer_id })
      toast.success('Customer deleted.')
      setDeleting(null)
    } catch (error) {
      toast.error(error.message || 'Could not delete customer.')
    } finally {
      setDeleteLoading(false)
    }
  }

  const viewingCustomer = viewing ? customers.find((row) => String(row.customer_id) === String(viewing.customer_id)) : null

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Relationships / customers"
        title="Customers"
        description="Keep customer identities, contact details and delivery addresses connected to every order and payment."
      >
        <button className="btn-primary" onClick={openCreate}><Plus size={15} /> Add customer</button>
      </PageHeader>

      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <div className="panel flex items-center gap-3 p-4"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F1F3EB] text-ink-600"><Users size={16} /></div><div><p className="mini-label">Customers</p><p className="mt-1 font-display text-[18px] font-semibold leading-none text-ink-950">{metrics.total}</p></div></div>
        <div className="panel flex items-center gap-3 p-4"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F1F3EB] text-ink-600"><UserRound size={16} /></div><div><p className="mini-label">Active buyers</p><p className="mt-1 font-display text-[18px] font-semibold leading-none text-ink-950">{metrics.paying}</p></div></div>
        <div className="panel flex items-center gap-3 p-4"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F1F3EB] text-ink-600"><ShoppingBag size={16} /></div><div><p className="mini-label">Repeat buyers</p><p className="mt-1 font-display text-[18px] font-semibold leading-none text-ink-950">{metrics.repeat}</p></div></div>
        <div className="panel flex items-center gap-3 p-4"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F1F3EB] text-ink-600"><MapPin size={16} /></div><div><p className="mini-label">Lifetime value</p><p className="mt-1 font-display text-[18px] font-semibold leading-none text-ink-950">{formatCurrency(metrics.spend, true)}</p></div></div>
      </div>

      <div className="panel overflow-hidden">
        <div className="flex flex-col gap-2 border-b border-line px-4 py-3.5 sm:flex-row sm:items-center">
          <SearchInput value={search} onChange={setSearch} placeholder="Search customers, email or city…" className="w-full sm:max-w-xs" />
          <span className="ml-auto font-mono text-[10px] text-mist">{customers.length} customers · {metrics.cities} cities</span>
        </div>

        {customers.length === 0 ? (
          <EmptyState icon={Users} title="No customers found" description="Add a customer to start recording orders and payments." action={<button className="btn-primary" onClick={openCreate}><Plus size={14} /> Add customer</button>} />
        ) : (
          <div className="table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Contact</th>
                  <th>Location</th>
                  <th>Orders</th>
                  <th>Lifetime value</th>
                  <th>Last order</th>
                  <th className="w-20 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.customer_id} className="cursor-pointer" onClick={() => setViewing(customer)}>
                    <td>
                      <div className="flex items-center gap-3">
                        <Avatar name={fullName(customer)} size="sm" tone={customer.customer_id % 3 === 0 ? 'violet' : customer.customer_id % 2 ? 'green' : 'blue'} />
                        <div className="min-w-0">
                          <p className="truncate text-[12px] font-semibold text-ink-900">{fullName(customer)}</p>
                          <p className="mt-0.5 font-mono text-[9px] text-mist">CUS-{String(customer.customer_id).padStart(3, '0')}</p>
                        </div>
                      </div>
                    </td>
                    <td><p className="text-[10.5px] text-ink-800">{customer.email}</p><p className="mt-0.5 flex items-center gap-1 text-[9.5px] text-mist"><Phone size={9} /> {customer.phone}</p></td>
                    <td><p className="text-[11px] text-ink-800">{customer.city}</p><p className="text-[9px] text-mist">{customer.state}</p></td>
                    <td><span className="rounded-md bg-[#F1F3EB] px-2 py-1 font-mono text-[10px] text-ink-700">{customer.orders.length}</span></td>
                    <td><span className="font-mono text-[11px] font-medium text-ink-900">{formatCurrency(customer.spend, true)}</span></td>
                    <td><span className="text-[10.5px] text-mist">{customer.lastOrder ? formatDate(customer.lastOrder.order_date, 'short') : '—'}</span></td>
                    <td>
                      <div className="flex justify-end gap-0.5" onClick={(event) => event.stopPropagation()}>
                        <button className="icon-btn" onClick={() => openEdit(customer)} title="Edit"><Pencil size={13} /></button>
                        <button className="icon-btn hover:bg-[#FBE7E0] hover:text-[#B84A2C]" onClick={() => setDeleting(customer)} title="Delete"><Trash2 size={13} /></button>
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
        title={editing ? 'Edit customer' : 'Add customer'}
        subtitle="Customer identity, contact and delivery address."
        size="lg"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setFormOpen(false)} disabled={saving}>Cancel</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Add customer'}</button>
          </>
        }
      >
        <div className="space-y-4">
          <FormGrid>
            <Field label="First name" required error={errors.first_name}>
              <TextInput value={form.first_name} onChange={(event) => setForm({ ...form, first_name: event.target.value })} />
            </Field>
            <Field label="Last name" required error={errors.last_name}>
              <TextInput value={form.last_name} onChange={(event) => setForm({ ...form, last_name: event.target.value })} />
            </Field>
            <Field label="Email" required error={errors.email}>
              <TextInput type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="customer@email.com" />
            </Field>
            <Field label="Phone" required error={errors.phone}>
              <TextInput value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="+91 98xxx xxxxx" />
            </Field>
            <Field label="Street address" required error={errors.street} className="sm:col-span-2">
              <TextInput value={form.street} onChange={(event) => setForm({ ...form, street: event.target.value })} placeholder="Building, street and area" />
            </Field>
            <Field label="City" required error={errors.city}>
              <TextInput value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} />
            </Field>
            <Field label="State">
              <SelectInput value={form.state} onChange={(event) => setForm({ ...form, state: event.target.value })} options={INDIAN_STATES} />
            </Field>
            <Field label="Pincode" required error={errors.pincode}>
              <TextInput value={form.pincode} onChange={(event) => setForm({ ...form, pincode: event.target.value.replace(/\D/g, '').slice(0, 6) })} placeholder="6-digit pincode" inputMode="numeric" />
            </Field>
          </FormGrid>
        </div>
      </Modal>

      <Drawer
        open={Boolean(viewingCustomer)}
        onClose={() => setViewing(null)}
        title={viewingCustomer ? fullName(viewingCustomer) : 'Customer'}
        subtitle={viewingCustomer ? `CUS-${String(viewingCustomer.customer_id).padStart(3, '0')} · ${viewingCustomer.city}` : ''}
        footer={
          <>
            <button className="btn-danger" onClick={() => setDeleting(viewingCustomer)}><Trash2 size={14} /> Delete</button>
            <button className="btn-secondary" onClick={() => openEdit(viewingCustomer)}><Pencil size={14} /> Edit customer</button>
          </>
        }
      >
        {viewingCustomer && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 rounded-xl border border-line bg-paper p-4">
              <Avatar name={fullName(viewingCustomer)} size="lg" tone="lime" />
              <div className="min-w-0">
                <p className="font-display text-[16px] font-semibold text-ink-950">{fullName(viewingCustomer)}</p>
                <p className="mt-0.5 truncate text-[11px] text-mist">{viewingCustomer.email}</p>
                <p className="mt-1 flex items-center gap-1 text-[10px] text-ink-600"><Phone size={10} /> {viewingCustomer.phone}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-line bg-paper p-3"><p className="mini-label">Orders</p><p className="mt-1.5 font-mono text-[13px] font-medium text-ink-900">{viewingCustomer.orders.length}</p></div>
              <div className="rounded-xl border border-line bg-paper p-3"><p className="mini-label">Lifetime value</p><p className="mt-1.5 font-mono text-[12px] font-medium text-ink-900">{formatCurrency(viewingCustomer.spend, true)}</p></div>
              <div className="rounded-xl border border-line bg-paper p-3"><p className="mini-label">Last order</p><p className="mt-1.5 text-[10.5px] font-medium text-ink-900">{viewingCustomer.lastOrder ? formatDate(viewingCustomer.lastOrder.order_date, 'short') : '—'}</p></div>
            </div>
            <div>
              <p className="kicker mb-2">Delivery address</p>
              <dl>
                <DetailRow label="Street">{viewingCustomer.street}</DetailRow>
                <DetailRow label="City / State">{viewingCustomer.city}, {viewingCustomer.state}</DetailRow>
                <DetailRow label="Pincode">{viewingCustomer.pincode}</DetailRow>
              </dl>
            </div>
            <div>
              <p className="kicker mb-2">Order history</p>
              <div className="divide-y divide-line rounded-xl border border-line">
                {viewingCustomer.orders.slice(0, 6).map((order) => (
                  <div key={order.order_id} className="flex items-center gap-3 px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-[10.5px] font-medium text-ink-900">#{order.order_id}</p>
                      <p className="text-[9px] text-mist">{formatDate(order.order_date, 'short')}</p>
                    </div>
                    <p className="font-mono text-[10.5px] text-ink-800">{formatCurrency(orderTotal(order, db.order_item || []), true)}</p>
                    <StatusBadge status={order.order_status} />
                  </div>
                ))}
                {viewingCustomer.orders.length === 0 && <p className="px-4 py-5 text-center text-[11px] text-mist">No orders yet.</p>}
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
        title="Delete customer?"
        description={`Delete ${deleting ? fullName(deleting) : 'this customer'}? Customers with order history cannot be deleted.`}
      />
    </div>
  )
}
