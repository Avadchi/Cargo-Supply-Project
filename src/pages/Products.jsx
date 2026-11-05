import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowDownToLine,
  Boxes,
  Box,
  Layers3,
  Pencil,
  Plus,
  Tag,
  Trash2,
  Truck,
} from 'lucide-react'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import { useLookups } from '../hooks/useLookups'
import { downloadCSV, formatCurrency, formatDate, formatNumber, numeric, stockStatus } from '../lib/utils'
import { PageHeader, SearchInput, EmptyState, DetailRow, Avatar } from '../components/ui/Bits'
import { Modal, Drawer } from '../components/ui/Modal'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { Field, FormGrid, FormSection, SelectInput, TextArea, TextInput } from '../components/ui/Form'
import { StatusBadge } from '../components/ui/StatusBadge'

const blankProduct = {
  product_name: '',
  category_id: '',
  unit_price: '',
  reorder_level: '50',
  description: '',
}

export default function Products() {
  const { db, create, update, remove } = useData()
  const { categoryById, supplierById } = useLookups()
  const toast = useToast()
  const [searchParams] = useSearchParams()

  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [stockFilter, setStockFilter] = useState(searchParams.get('filter') === 'low' ? 'attention' : 'all')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(blankProduct)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [viewing, setViewing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    setStockFilter(searchParams.get('filter') === 'low' ? 'attention' : 'all')
  }, [searchParams])

  const products = useMemo(() => {
    const term = search.trim().toLowerCase()
    return (db.product || [])
      .map((product) => {
        const inventory = (db.inventory || []).filter((row) => String(row.product_id) === String(product.product_id))
        const totalStock = inventory.reduce((sum, row) => sum + numeric(row.quantity_on_hand), 0)
        const value = totalStock * numeric(product.unit_price)
        const lowSites = inventory.filter((row) => stockStatus(row.quantity_on_hand, product.reorder_level) !== 'In stock')
        const suppliers = (db.supplier_product || []).filter((row) => String(row.product_id) === String(product.product_id))
        const status = totalStock === 0 ? 'Out of stock' : lowSites.length ? 'Low' : 'In stock'
        const ordered = (db.order_item || []).filter((row) => String(row.product_id) === String(product.product_id)).reduce((sum, row) => sum + numeric(row.quantity), 0)
        return { ...product, inventory, totalStock, value, lowSites, suppliers, status, ordered }
      })
      .filter((product) => {
        if (!term) return true
        return [product.product_name, product.description, product.product_id].filter(Boolean).some((value) => String(value).toLowerCase().includes(term))
      })
      .filter((product) => categoryFilter === 'all' || String(product.category_id) === categoryFilter)
      .filter((product) => {
        if (stockFilter === 'all') return true
        if (stockFilter === 'attention') return product.status !== 'In stock'
        if (stockFilter === 'in') return product.status === 'In stock'
        return true
      })
      .sort((a, b) => a.product_name.localeCompare(b.product_name))
  }, [db.product, db.inventory, db.supplier_product, db.order_item, search, categoryFilter, stockFilter])

  const metrics = useMemo(() => {
    const rows = (db.product || []).map((product) => {
      const total = (db.inventory || [])
        .filter((row) => String(row.product_id) === String(product.product_id))
        .reduce((sum, row) => sum + numeric(row.quantity_on_hand), 0)
      return { ...product, total }
    })
    return {
      products: rows.length,
      units: rows.reduce((sum, row) => sum + row.total, 0),
      value: rows.reduce((sum, row) => sum + row.total * numeric(row.unit_price), 0),
      attention: rows.filter((product) => (db.inventory || []).some((row) => String(row.product_id) === String(product.product_id) && stockStatus(row.quantity_on_hand, product.reorder_level) !== 'In stock')).length,
    }
  }, [db.product, db.inventory])

  const openCreate = () => {
    setEditing(null)
    setForm({ ...blankProduct, category_id: (db.category || [])[0]?.category_id || '' })
    setErrors({})
    setFormOpen(true)
  }

  const openEdit = (product) => {
    setEditing(product)
    setForm({
      product_name: product.product_name || '',
      category_id: String(product.category_id || ''),
      unit_price: String(product.unit_price ?? ''),
      reorder_level: String(product.reorder_level ?? ''),
      description: product.description || '',
    })
    setErrors({})
    setFormOpen(true)
    setViewing(null)
  }

  const handleSave = async () => {
    const next = {}
    if (!form.product_name.trim()) next.product_name = 'Product name is required.'
    if (!form.category_id) next.category_id = 'Choose a category.'
    if (form.unit_price === '' || numeric(form.unit_price) < 0) next.unit_price = 'Enter a valid unit price.'
    if (form.reorder_level === '' || numeric(form.reorder_level) < 0) next.reorder_level = 'Enter a valid reorder level.'
    setErrors(next)
    if (Object.keys(next).length) return

    setSaving(true)
    const payload = {
      product_name: form.product_name.trim(),
      category_id: Number(form.category_id),
      unit_price: Number(form.unit_price),
      reorder_level: Number(form.reorder_level),
      description: form.description.trim(),
    }
    try {
      if (editing) {
        await update('product', { product_id: editing.product_id }, payload)
        toast.success('Product updated.')
      } else {
        await create('product', payload)
        toast.success('Product added to the catalogue.')
      }
      setFormOpen(false)
    } catch (error) {
      toast.error(error.message || 'Could not save product.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    const references =
      (db.inventory || []).some((row) => String(row.product_id) === String(deleting.product_id)) ||
      (db.order_item || []).some((row) => String(row.product_id) === String(deleting.product_id)) ||
      (db.po_item || []).some((row) => String(row.product_id) === String(deleting.product_id)) ||
      (db.supplier_product || []).some((row) => String(row.product_id) === String(deleting.product_id))
    if (references) {
      toast.error('This product has stock, order or supplier records. Remove those references before deleting.')
      setDeleting(null)
      return
    }
    setDeleteLoading(true)
    try {
      await remove('product', { product_id: deleting.product_id })
      toast.success('Product deleted.')
      setDeleting(null)
    } catch (error) {
      toast.error(error.message || 'Could not delete product.')
    } finally {
      setDeleteLoading(false)
    }
  }

  const viewingProduct = viewing
    ? products.find((product) => String(product.product_id) === String(viewing.product_id)) ||
      (() => {
        const product = (db.product || []).find((row) => String(row.product_id) === String(viewing.product_id))
        if (!product) return null
        const inventory = (db.inventory || []).filter((row) => String(row.product_id) === String(product.product_id))
        return { ...product, inventory, totalStock: inventory.reduce((sum, row) => sum + numeric(row.quantity_on_hand), 0) }
      })()
    : null

  const exportProducts = () => {
    downloadCSV('kargo-products.csv', products, [
      { label: 'Product ID', value: 'product_id' },
      { label: 'Product', value: 'product_name' },
      { label: 'Category', value: (row) => categoryById.get(String(row.category_id))?.category_name || '' },
      { label: 'Unit price', value: 'unit_price' },
      { label: 'Reorder level', value: 'reorder_level' },
      { label: 'Stock on hand', value: 'totalStock' },
    ])
    toast.success('Product list exported.')
  }

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Catalogue / products"
        title="Product catalogue"
        description="Manage product descriptions, pricing, categories and reorder thresholds across the entire supply network."
      >
        <button className="btn-secondary" onClick={exportProducts}><ArrowDownToLine size={14} /> Export</button>
        <button className="btn-primary" onClick={openCreate}><Plus size={15} /> Add product</button>
      </PageHeader>

      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          { icon: Box, label: 'Products', value: formatNumber(metrics.products), hint: `${(db.category || []).length} categories` },
          { icon: Boxes, label: 'Units on hand', value: formatNumber(metrics.units), hint: 'Across all warehouses' },
          { icon: Tag, label: 'Catalogue value', value: formatCurrency(metrics.value, true), hint: 'At current unit price' },
          { icon: AlertTriangle, label: 'Needs attention', value: formatNumber(metrics.attention), hint: 'Below reorder threshold' },
        ].map((item) => {
          const Icon = item.icon
          return (
            <div key={item.label} className="panel flex items-start gap-3 p-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F1F3EB] text-ink-600"><Icon size={15} /></div>
              <div className="min-w-0">
                <p className="mini-label">{item.label}</p>
                <p className="mt-1 font-display text-[18px] font-semibold leading-none text-ink-950">{item.value}</p>
                <p className="mt-1 truncate text-[9.5px] text-mist">{item.hint}</p>
              </div>
            </div>
          )
        })}
      </div>

      <div className="panel overflow-hidden">
        <div className="flex flex-col gap-2 border-b border-line px-4 py-3.5 sm:flex-row sm:items-center">
          <SearchInput value={search} onChange={setSearch} placeholder="Search products or descriptions…" className="w-full sm:max-w-xs" />
          <SelectInput className="h-9 w-full text-[12px] sm:w-auto" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
            <option value="all">All categories</option>
            {(db.category || []).map((category) => <option key={category.category_id} value={category.category_id}>{category.category_name}</option>)}
          </SelectInput>
          <SelectInput className="h-9 w-full text-[12px] sm:w-auto" value={stockFilter} onChange={(event) => setStockFilter(event.target.value)}>
            <option value="all">All stock levels</option>
            <option value="in">In stock</option>
            <option value="attention">Needs attention</option>
          </SelectInput>
          <span className="ml-auto font-mono text-[10px] text-mist">{products.length} results</span>
        </div>

        {products.length === 0 ? (
          <EmptyState icon={Box} title="No products found" description="Try a different search, category or stock filter." action={<button className="btn-primary" onClick={openCreate}><Plus size={14} /> Add product</button>} />
        ) : (
          <div className="table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Unit price</th>
                  <th>Reorder level</th>
                  <th>On hand</th>
                  <th>Suppliers</th>
                  <th>Status</th>
                  <th className="w-20 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.product_id} className="cursor-pointer" onClick={() => setViewing(product)}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-[#F8F9F3] text-ink-600">
                          <Box size={15} strokeWidth={1.7} />
                        </div>
                        <div className="min-w-0">
                          <p className="max-w-[240px] truncate text-[12px] font-semibold text-ink-900">{product.product_name}</p>
                          <p className="mt-0.5 font-mono text-[9px] text-mist">PRD-{product.product_id}</p>
                        </div>
                      </div>
                    </td>
                    <td><span className="rounded-md bg-[#F1F3EB] px-2 py-1 text-[9.5px] font-medium text-ink-700">{categoryById.get(String(product.category_id))?.category_name || 'Uncategorised'}</span></td>
                    <td><span className="font-mono text-[11.5px] font-medium text-ink-900">{formatCurrency(product.unit_price)}</span></td>
                    <td><span className="font-mono text-[11px] text-mist">{formatNumber(product.reorder_level)}</span></td>
                    <td>
                      <p className="font-mono text-[11.5px] font-medium text-ink-900">{formatNumber(product.totalStock)}</p>
                      <p className="text-[9px] text-mist">{product.lowSites.length} site{product.lowSites.length === 1 ? '' : 's'} need attention</p>
                    </td>
                    <td><span className="text-[10.5px] text-mist">{product.suppliers.length} linked</span></td>
                    <td><StatusBadge status={product.status} /></td>
                    <td>
                      <div className="flex justify-end gap-0.5" onClick={(event) => event.stopPropagation()}>
                        <button className="icon-btn" onClick={() => openEdit(product)} title="Edit product"><Pencil size={13} /></button>
                        <button className="icon-btn hover:bg-[#FBE7E0] hover:text-[#B84A2C]" onClick={() => setDeleting(product)} title="Delete product"><Trash2 size={13} /></button>
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
        title={editing ? 'Edit product' : 'Add product'}
        subtitle={editing ? `Updating PRD-${editing.product_id}` : 'Add a new item to the product catalogue.'}
        size="lg"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setFormOpen(false)} disabled={saving}>Cancel</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Add product'}</button>
          </>
        }
      >
        <div className="space-y-6">
          <FormSection title="Product details" description="How this item appears across orders and inventory.">
            <FormGrid>
              <Field label="Product name" required error={errors.product_name} className="sm:col-span-2">
                <TextInput value={form.product_name} onChange={(event) => setForm({ ...form, product_name: event.target.value })} placeholder="e.g. Basmati Rice 25kg" />
              </Field>
              <Field label="Category" required error={errors.category_id}>
                <SelectInput value={form.category_id} onChange={(event) => setForm({ ...form, category_id: event.target.value })} placeholder="Select category" options={(db.category || []).map((category) => ({ value: category.category_id, label: category.category_name }))} />
              </Field>
              <Field label="Unit price (₹)" required error={errors.unit_price}>
                <TextInput type="number" min="0" step="0.01" value={form.unit_price} onChange={(event) => setForm({ ...form, unit_price: event.target.value })} placeholder="0.00" />
              </Field>
              <Field label="Reorder level" required error={errors.reorder_level} hint="Alert when warehouse stock falls to or below this quantity.">
                <TextInput type="number" min="0" value={form.reorder_level} onChange={(event) => setForm({ ...form, reorder_level: event.target.value })} />
              </Field>
            </FormGrid>
          </FormSection>
          <FormSection title="Description">
            <Field label="Product description">
              <TextArea maxLength={200} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Pack size, specification or handling notes…" />
            </Field>
          </FormSection>
        </div>
      </Modal>

      <Drawer
        open={Boolean(viewingProduct)}
        onClose={() => setViewing(null)}
        title={viewingProduct?.product_name || 'Product'}
        subtitle={viewingProduct ? `PRD-${viewingProduct.product_id} · ${categoryById.get(String(viewingProduct.category_id))?.category_name || 'Uncategorised'}` : ''}
        footer={
          <>
            <button className="btn-danger" onClick={() => setDeleting(viewingProduct)}><Trash2 size={14} /> Delete</button>
            <button className="btn-secondary" onClick={() => openEdit(viewingProduct)}><Pencil size={14} /> Edit product</button>
          </>
        }
      >
        {viewingProduct && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-line bg-paper p-3"><p className="mini-label">Unit price</p><p className="mt-1.5 font-mono text-[13px] font-medium text-ink-900">{formatCurrency(viewingProduct.unit_price)}</p></div>
              <div className="rounded-xl border border-line bg-paper p-3"><p className="mini-label">On hand</p><p className="mt-1.5 font-mono text-[13px] font-medium text-ink-900">{formatNumber(viewingProduct.totalStock)}</p></div>
              <div className="rounded-xl border border-line bg-paper p-3"><p className="mini-label">Reorder</p><p className="mt-1.5 font-mono text-[13px] font-medium text-ink-900">{formatNumber(viewingProduct.reorder_level)}</p></div>
            </div>
            <div>
              <p className="kicker mb-2">Description</p>
              <p className="text-[12px] leading-6 text-ink-700">{viewingProduct.description || 'No description recorded.'}</p>
            </div>
            <div>
              <p className="kicker mb-2">Stock by warehouse</p>
              <div className="divide-y divide-line rounded-xl border border-line">
                {viewingProduct.inventory.length === 0 && <p className="px-4 py-5 text-center text-[11px] text-mist">No inventory records.</p>}
                {viewingProduct.inventory.map((row) => {
                  const warehouse = (db.warehouse || []).find((item) => String(item.warehouse_id) === String(row.warehouse_id))
                  const status = stockStatus(row.quantity_on_hand, viewingProduct.reorder_level)
                  return (
                    <div key={row.warehouse_id} className="flex items-center gap-3 px-3 py-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F1F3EB] text-ink-600"><Layers3 size={13} /></div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11px] font-semibold text-ink-900">{warehouse?.warehouse_name || 'Unknown warehouse'}</p>
                        <p className="text-[9.5px] text-mist">{warehouse?.city} · updated {formatDate(row.last_updated, 'short')}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-[11px] font-medium text-ink-900">{formatNumber(row.quantity_on_hand)}</p>
                        <StatusBadge status={status} className="mt-1" />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            <div>
              <p className="kicker mb-2">Approved suppliers</p>
              <div className="divide-y divide-line rounded-xl border border-line">
                {(db.supplier_product || []).filter((row) => String(row.product_id) === String(viewingProduct.product_id)).map((row) => {
                  const supplier = supplierById.get(String(row.supplier_id))
                  return (
                    <div key={row.supplier_id} className="flex items-center gap-3 px-3 py-2.5">
                      <Avatar name={supplier?.supplier_name} size="xs" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11px] font-semibold text-ink-900">{supplier?.supplier_name || 'Unknown supplier'}</p>
                        <p className="text-[9.5px] text-mist">Lead time {row.lead_time} days</p>
                      </div>
                      <p className="font-mono text-[10.5px] text-ink-800">{formatCurrency(row.supply_price)}</p>
                    </div>
                  )
                })}
                {!(db.supplier_product || []).some((row) => String(row.product_id) === String(viewingProduct.product_id)) && (
                  <p className="px-4 py-5 text-center text-[11px] text-mist">No suppliers linked to this product.</p>
                )}
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
        title="Delete product?"
        description={`Delete "${deleting?.product_name}"? Products referenced by stock, orders or suppliers cannot be deleted.`}
      />
    </div>
  )
}
