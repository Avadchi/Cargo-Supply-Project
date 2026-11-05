import { useMemo, useState } from 'react'
import {
  Building2,
  Check,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Search,
  Star,
  Trash2,
  Unlink,
  Users,
} from 'lucide-react'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import { useLookups } from '../hooks/useLookups'
import { formatCurrency, formatDate, numeric, todayISO } from '../lib/utils'
import { INDIAN_STATES } from '../lib/constants'
import { PageHeader, SearchInput, EmptyState, DetailRow, Avatar } from '../components/ui/Bits'
import { Modal, Drawer } from '../components/ui/Modal'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { Field, FormGrid, FormSection, SelectInput, TextArea, TextInput } from '../components/ui/Form'
import { StatusBadge } from '../components/ui/StatusBadge'

const blankSupplier = {
  supplier_name: '',
  email: '',
  street: '',
  city: '',
  state: 'Maharashtra',
  pincode: '',
  rating: '4.5',
  reg_date: todayISO(),
}

export default function Suppliers() {
  const { db, create, update, remove } = useData()
  const { phonesBySupplier, productsBySupplier } = useLookups()
  const toast = useToast()

  const [search, setSearch] = useState('')
  const [ratingFilter, setRatingFilter] = useState('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(blankSupplier)
  const [phones, setPhones] = useState([''])
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [viewing, setViewing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkForm, setLinkForm] = useState({ product_id: '', supply_price: '', lead_time: '3' })
  const [linkSaving, setLinkSaving] = useState(false)

  const suppliers = useMemo(() => {
    const term = search.trim().toLowerCase()
    return [...(db.supplier || [])]
      .filter((supplier) => {
        if (!term) return true
        return [supplier.supplier_name, supplier.email, supplier.city, supplier.state]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term))
      })
      .filter((supplier) => {
        if (ratingFilter === 'all') return true
        if (ratingFilter === 'high') return numeric(supplier.rating) >= 4.5
        if (ratingFilter === 'mid') return numeric(supplier.rating) >= 4 && numeric(supplier.rating) < 4.5
        if (ratingFilter === 'low') return numeric(supplier.rating) < 4
        return true
      })
      .sort((a, b) => a.supplier_name.localeCompare(b.supplier_name))
  }, [db.supplier, search, ratingFilter])

  const openCreate = () => {
    setEditing(null)
    setForm({ ...blankSupplier, reg_date: todayISO() })
    setPhones([''])
    setErrors({})
    setFormOpen(true)
  }

  const openEdit = (supplier) => {
    setEditing(supplier)
    setForm({
      supplier_name: supplier.supplier_name || '',
      email: supplier.email || '',
      street: supplier.street || '',
      city: supplier.city || '',
      state: supplier.state || 'Maharashtra',
      pincode: supplier.pincode || '',
      rating: String(supplier.rating ?? '4.5'),
      reg_date: supplier.reg_date || todayISO(),
    })
    setPhones(phonesBySupplier[String(supplier.supplier_id)]?.length ? [...phonesBySupplier[String(supplier.supplier_id)]] : [''])
    setErrors({})
    setFormOpen(true)
    setViewing(null)
  }

  const validate = () => {
    const next = {}
    if (!form.supplier_name.trim()) next.supplier_name = 'Supplier name is required.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = 'Enter a valid email address.'
    if (!form.street.trim()) next.street = 'Street address is required.'
    if (!form.city.trim()) next.city = 'City is required.'
    if (!/^\d{6}$/.test(form.pincode.trim())) next.pincode = 'Pincode must be 6 digits.'
    if (numeric(form.rating) < 0 || numeric(form.rating) > 5) next.rating = 'Rating must be between 0 and 5.'
    if (!form.reg_date) next.reg_date = 'Registration date is required.'
    if (!phones.some((phone) => phone.trim())) next.phones = 'Add at least one phone number.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    const payload = {
      supplier_name: form.supplier_name.trim(),
      email: form.email.trim().toLowerCase(),
      street: form.street.trim(),
      city: form.city.trim(),
      state: form.state,
      pincode: form.pincode.trim(),
      rating: Number(form.rating),
      reg_date: form.reg_date,
    }
    const cleanPhones = [...new Set(phones.map((phone) => phone.trim()).filter(Boolean))]

    try {
      if (editing) {
        await update('supplier', { supplier_id: editing.supplier_id }, payload)
        const oldPhones = phonesBySupplier[String(editing.supplier_id)] || []
        const removed = oldPhones.filter((phone) => !cleanPhones.includes(phone))
        const added = cleanPhones.filter((phone) => !oldPhones.includes(phone))
        for (const phone of removed) {
          await remove('supplier_phone', { supplier_id: editing.supplier_id, phone_no: phone })
        }
        if (added.length) {
          await create('supplier_phone', added.map((phone) => ({ supplier_id: editing.supplier_id, phone_no: phone })))
        }
        toast.success('Supplier updated.')
      } else {
        const [supplier] = await create('supplier', payload)
        await create('supplier_phone', cleanPhones.map((phone) => ({ supplier_id: supplier.supplier_id, phone_no: phone })))
        toast.success('Supplier added to the network.')
      }
      setFormOpen(false)
      setViewing(null)
    } catch (error) {
      toast.error(error.message || 'Could not save supplier.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    const hasOrders = (db.purchase_order || []).some((po) => String(po.supplier_id) === String(deleting.supplier_id))
    const hasProducts = (db.supplier_product || []).some((row) => String(row.supplier_id) === String(deleting.supplier_id))
    if (hasOrders || hasProducts) {
      toast.error('This supplier is referenced by purchase orders or supplied products. Unlink those records first.')
      setDeleting(null)
      return
    }
    setDeleteLoading(true)
    try {
      const supplierPhones = phonesBySupplier[String(deleting.supplier_id)] || []
      for (const phone of supplierPhones) {
        await remove('supplier_phone', { supplier_id: deleting.supplier_id, phone_no: phone })
      }
      await remove('supplier', { supplier_id: deleting.supplier_id })
      toast.success('Supplier deleted.')
      setDeleting(null)
      setViewing(null)
    } catch (error) {
      toast.error(error.message || 'Could not delete supplier.')
    } finally {
      setDeleteLoading(false)
    }
  }

  const openLink = () => {
    setLinkForm({ product_id: '', supply_price: '', lead_time: '3' })
    setLinkOpen(true)
  }

  const handleLinkProduct = async () => {
    if (!viewing) return
    if (!linkForm.product_id || !linkForm.supply_price) {
      toast.error('Choose a product and enter the agreed supply price.')
      return
    }
    const alreadyLinked = (db.supplier_product || []).some(
      (row) => String(row.supplier_id) === String(viewing.supplier_id) && String(row.product_id) === String(linkForm.product_id),
    )
    if (alreadyLinked) {
      toast.error('That product is already linked to this supplier.')
      return
    }
    setLinkSaving(true)
    try {
      await create('supplier_product', {
        supplier_id: viewing.supplier_id,
        product_id: Number(linkForm.product_id),
        supply_price: Number(linkForm.supply_price),
        lead_time: Number(linkForm.lead_time),
      })
      toast.success('Product linked to supplier.')
      setLinkOpen(false)
    } catch (error) {
      toast.error(error.message || 'Could not link product.')
    } finally {
      setLinkSaving(false)
    }
  }

  const unlinkProduct = async (row) => {
    try {
      await remove('supplier_product', { supplier_id: row.supplier_id, product_id: row.product_id })
      toast.success('Supplier product link removed.')
    } catch (error) {
      toast.error(error.message || 'Could not remove link.')
    }
  }

  const viewingSupplier = viewing ? (db.supplier || []).find((row) => String(row.supplier_id) === String(viewing.supplier_id)) : null
  const viewingPhones = viewingSupplier ? phonesBySupplier[String(viewingSupplier.supplier_id)] || [] : []
  const viewingProducts = viewingSupplier ? productsBySupplier[String(viewingSupplier.supplier_id)] || [] : []
  const availableProducts = (db.product || []).filter(
    (product) => !viewingProducts.some((row) => String(row.product_id) === String(product.product_id)),
  )

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Supply network / vendors"
        title="Supplier management"
        description="Maintain vendor identities, contact details, addresses, performance ratings and the product catalogue each supplier can fulfil."
      >
        <button className="btn-primary" onClick={openCreate}>
          <Plus size={15} /> Add supplier
        </button>
      </PageHeader>

      <div className="panel overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
            <SearchInput value={search} onChange={setSearch} placeholder="Search suppliers, email or city…" className="w-full sm:max-w-xs" />
            <SelectInput
              className="h-9 w-full text-[12px] sm:w-auto"
              value={ratingFilter}
              onChange={(event) => setRatingFilter(event.target.value)}
            >
              <option value="all">All ratings</option>
              <option value="high">4.5 and above</option>
              <option value="mid">4.0 – 4.4</option>
              <option value="low">Below 4.0</option>
            </SelectInput>
          </div>
          <div className="flex items-center gap-3 text-[10.5px] text-mist">
            <span className="font-mono">{suppliers.length} suppliers</span>
            <span className="h-3 w-px bg-line" />
            <span>{viewingProducts.length ? `${(db.supplier_product || []).length} catalogue links` : `${(db.supplier_product || []).length} catalogue links`}</span>
          </div>
        </div>

        {suppliers.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No suppliers found"
            description={search ? 'Try a different search term or clear the rating filter.' : 'Add your first supplier to start building the network.'}
            action={<button className="btn-primary" onClick={openCreate}><Plus size={14} /> Add supplier</button>}
          />
        ) : (
          <div className="table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Supplier</th>
                  <th>Contact</th>
                  <th>Location</th>
                  <th>Rating</th>
                  <th>Products</th>
                  <th>Registered</th>
                  <th className="w-20 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((supplier) => {
                  const phoneCount = (phonesBySupplier[String(supplier.supplier_id)] || []).length
                  const productCount = (productsBySupplier[String(supplier.supplier_id)] || []).length
                  return (
                    <tr key={supplier.supplier_id} className="cursor-pointer" onClick={() => setViewing(supplier)}>
                      <td>
                        <div className="flex items-center gap-3">
                          <Avatar name={supplier.supplier_name} size="sm" tone={Number(supplier.supplier_id) % 2 ? 'green' : 'blue'} />
                          <div className="min-w-0">
                            <p className="truncate text-[12px] font-semibold text-ink-900">{supplier.supplier_name}</p>
                            <p className="mt-0.5 font-mono text-[9px] text-mist">SUP-{String(supplier.supplier_id).padStart(3, '0')}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <p className="text-[11.5px] text-ink-800">{supplier.email}</p>
                        <p className="mt-0.5 flex items-center gap-1 text-[9.5px] text-mist">
                          <Phone size={9} /> {phoneCount} phone{phoneCount === 1 ? '' : 's'}
                        </p>
                      </td>
                      <td>
                        <p className="text-[11.5px] text-ink-800">{supplier.city}</p>
                        <p className="text-[9.5px] text-mist">{supplier.state} · {supplier.pincode}</p>
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <Star size={12} className="fill-[#E9B35E] text-[#E9B35E]" />
                          <span className="font-mono text-[11px] font-medium text-ink-900">{Number(supplier.rating || 0).toFixed(1)}</span>
                        </div>
                      </td>
                      <td>
                        <span className="rounded-md bg-[#F1F3EB] px-2 py-1 font-mono text-[10px] text-ink-700">{productCount} linked</span>
                      </td>
                      <td><span className="text-[10.5px] text-mist">{formatDate(supplier.reg_date, 'short')}</span></td>
                      <td>
                        <div className="flex justify-end gap-0.5" onClick={(event) => event.stopPropagation()}>
                          <button className="icon-btn" onClick={() => openEdit(supplier)} title="Edit supplier">
                            <Pencil size={13} />
                          </button>
                          <button className="icon-btn hover:bg-[#FBE7E0] hover:text-[#B84A2C]" onClick={() => setDeleting(supplier)} title="Delete supplier">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Edit supplier' : 'Add supplier'}
        subtitle={editing ? `Updating SUP-${String(editing.supplier_id).padStart(3, '0')}` : 'Register a new vendor in your supply network.'}
        size="lg"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setFormOpen(false)} disabled={saving}>Cancel</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Add supplier'}
            </button>
          </>
        }
      >
        <div className="space-y-6">
          <FormSection title="Business identity" description="Core supplier record and performance rating.">
            <FormGrid>
              <Field label="Supplier name" required error={errors.supplier_name} className="sm:col-span-2">
                <TextInput
                  value={form.supplier_name}
                  onChange={(event) => setForm({ ...form, supplier_name: event.target.value })}
                  placeholder="e.g. Meridian Agro Supplies"
                />
              </Field>
              <Field label="Email address" required error={errors.email}>
                <TextInput
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                  placeholder="orders@supplier.in"
                />
              </Field>
              <Field label="Registration date" required error={errors.reg_date}>
                <TextInput type="date" value={form.reg_date} onChange={(event) => setForm({ ...form, reg_date: event.target.value })} />
              </Field>
              <Field label="Performance rating" hint="0 – 5, one decimal place." error={errors.rating}>
                <TextInput
                  type="number"
                  min="0"
                  max="5"
                  step="0.1"
                  value={form.rating}
                  onChange={(event) => setForm({ ...form, rating: event.target.value })}
                />
              </Field>
            </FormGrid>
          </FormSection>

          <FormSection title="Address" description="Used for purchase order delivery and vendor records.">
            <FormGrid>
              <Field label="Street address" required error={errors.street} className="sm:col-span-2">
                <TextInput
                  value={form.street}
                  onChange={(event) => setForm({ ...form, street: event.target.value })}
                  placeholder="Building, street and area"
                />
              </Field>
              <Field label="City" required error={errors.city}>
                <TextInput value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} placeholder="City" />
              </Field>
              <Field label="State">
                <SelectInput value={form.state} onChange={(event) => setForm({ ...form, state: event.target.value })} options={INDIAN_STATES} />
              </Field>
              <Field label="Pincode" required error={errors.pincode}>
                <TextInput
                  value={form.pincode}
                  onChange={(event) => setForm({ ...form, pincode: event.target.value.replace(/\D/g, '').slice(0, 6) })}
                  placeholder="6-digit pincode"
                  inputMode="numeric"
                />
              </Field>
            </FormGrid>
          </FormSection>

          <FormSection title="Phone numbers" description="A supplier can hold multiple contact numbers.">
            <div className="space-y-2">
              {phones.map((phone, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-mist" />
                    <input
                      className="input pl-9"
                      value={phone}
                      onChange={(event) => {
                        const next = [...phones]
                        next[index] = event.target.value
                        setPhones(next)
                      }}
                      placeholder="+91 98201 44521"
                    />
                  </div>
                  <button
                    className="icon-btn h-10 w-10 hover:bg-[#FBE7E0] hover:text-[#B84A2C]"
                    onClick={() => setPhones(phones.length === 1 ? [''] : phones.filter((_, i) => i !== index))}
                    title="Remove phone"
                    type="button"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {errors.phones && <p className="text-[11px] font-medium text-[#B84A2C]">{errors.phones}</p>}
              <button type="button" className="btn-ghost h-8 px-2 text-[11.5px]" onClick={() => setPhones([...phones, ''])}>
                <Plus size={13} /> Add another number
              </button>
            </div>
          </FormSection>
        </div>
      </Modal>

      <Drawer
        open={Boolean(viewingSupplier)}
        onClose={() => setViewing(null)}
        title={viewingSupplier?.supplier_name || 'Supplier'}
        subtitle={viewingSupplier ? `SUP-${String(viewingSupplier.supplier_id).padStart(3, '0')} · registered ${formatDate(viewingSupplier.reg_date)}` : ''}
        footer={
          <>
            <button className="btn-danger" onClick={() => setDeleting(viewingSupplier)}><Trash2 size={14} /> Delete</button>
            <button className="btn-secondary" onClick={() => openEdit(viewingSupplier)}><Pencil size={14} /> Edit</button>
            <button className="btn-primary" onClick={openLink}><Plus size={14} /> Link product</button>
          </>
        }
      >
        {viewingSupplier && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 rounded-xl border border-line bg-paper p-4">
              <Avatar name={viewingSupplier.supplier_name} size="lg" tone="lime" />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-ink-900">{viewingSupplier.supplier_name}</p>
                <p className="mt-0.5 truncate text-[11px] text-mist">{viewingSupplier.email}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="flex items-center gap-1 text-[10.5px] font-semibold text-ink-800">
                    <Star size={11} className="fill-[#E9B35E] text-[#E9B35E]" /> {Number(viewingSupplier.rating || 0).toFixed(1)}
                  </span>
                  <span className="h-3 w-px bg-line" />
                  <span className="text-[10px] text-mist">{viewingProducts.length} catalogue items</span>
                </div>
              </div>
            </div>

            <div>
              <p className="kicker mb-2">Contact & address</p>
              <dl>
                <DetailRow label="Email">{viewingSupplier.email}</DetailRow>
                <DetailRow label="Phone">
                  <div className="flex flex-col items-end gap-0.5">
                    {viewingPhones.map((phone) => <span key={phone}>{phone}</span>)}
                  </div>
                </DetailRow>
                <DetailRow label="Street">{viewingSupplier.street}</DetailRow>
                <DetailRow label="City / State">{viewingSupplier.city}, {viewingSupplier.state}</DetailRow>
                <DetailRow label="Pincode">{viewingSupplier.pincode}</DetailRow>
                <DetailRow label="Registered">{formatDate(viewingSupplier.reg_date)}</DetailRow>
              </dl>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="kicker">Supplied products</p>
                <button className="text-[10.5px] font-semibold text-ink-600 hover:text-ink-900" onClick={openLink}>+ Link</button>
              </div>
              {viewingProducts.length === 0 ? (
                <div className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-[11.5px] text-mist">
                  No products linked yet.
                </div>
              ) : (
                <div className="divide-y divide-line rounded-xl border border-line">
                  {viewingProducts.map((row) => (
                    <div key={row.product_id} className="flex items-center gap-3 px-3 py-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F1F3EB] text-ink-600">
                        <PackageIcon />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11px] font-semibold text-ink-900">{row.product?.product_name || `Product ${row.product_id}`}</p>
                        <p className="text-[9.5px] text-mist">Lead time {row.lead_time} days</p>
                      </div>
                      <p className="font-mono text-[10.5px] text-ink-800">{formatCurrency(row.supply_price)}</p>
                      <button className="icon-btn h-6 w-6 hover:bg-[#FBE7E0] hover:text-[#B84A2C]" onClick={() => unlinkProduct(row)} title="Unlink product">
                        <Unlink size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl bg-[#F7F8F2] p-4">
              <p className="kicker mb-2">Purchase history</p>
              {(() => {
                const poRows = (db.purchase_order || []).filter((po) => String(po.supplier_id) === String(viewingSupplier.supplier_id)).slice(0, 4)
                if (!poRows.length) return <p className="text-[11px] text-mist">No purchase orders yet.</p>
                return (
                  <div className="space-y-2">
                    {poRows.map((po) => (
                      <div key={po.po_id} className="flex items-center justify-between">
                        <div>
                          <span className="font-mono text-[10.5px] font-medium text-ink-900">PO-{po.po_id}</span>
                          <span className="ml-2 text-[9.5px] text-mist">{formatDate(po.po_date, 'short')}</span>
                        </div>
                        <StatusBadge status={po.po_status} />
                      </div>
                    ))}
                  </div>
                )
              })()}
            </div>
          </div>
        )}
      </Drawer>

      <Modal
        open={linkOpen}
        onClose={() => setLinkOpen(false)}
        title="Link supplier product"
        subtitle="Add a product this supplier can fulfil, with agreed pricing and lead time."
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setLinkOpen(false)} disabled={linkSaving}>Cancel</button>
            <button className="btn-primary" onClick={handleLinkProduct} disabled={linkSaving}>{linkSaving ? 'Linking…' : 'Link product'}</button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Product" required>
            <SelectInput
              value={linkForm.product_id}
              onChange={(event) => {
                const product = (db.product || []).find((row) => String(row.product_id) === event.target.value)
                setLinkForm({
                  ...linkForm,
                  product_id: event.target.value,
                  supply_price: product ? String(Math.round(numeric(product.unit_price) * 0.82)) : linkForm.supply_price,
                })
              }}
              placeholder="Select a product"
              options={availableProducts.map((product) => ({ value: product.product_id, label: `${product.product_name} · ${formatCurrency(product.unit_price)}` }))}
            />
          </Field>
          <FormGrid>
            <Field label="Supply price (₹)" required>
              <TextInput type="number" min="0" step="0.01" value={linkForm.supply_price} onChange={(event) => setLinkForm({ ...linkForm, supply_price: event.target.value })} />
            </Field>
            <Field label="Lead time (days)" required>
              <TextInput type="number" min="1" value={linkForm.lead_time} onChange={(event) => setLinkForm({ ...linkForm, lead_time: event.target.value })} />
            </Field>
          </FormGrid>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        loading={deleteLoading}
        title="Delete supplier?"
        description={`Delete "${deleting?.supplier_name}" and its phone numbers? This cannot be undone. Suppliers referenced by purchase orders or product links cannot be deleted.`}
      />
    </div>
  )
}

function PackageIcon() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 8l-9-5-9 5v8l9 5 9-5V8z" />
      <path d="M3.3 7.7L12 12.5l8.7-4.8M12 22V12.5" />
    </svg>
  )
}
