import { useMemo, useState } from 'react'
import { Boxes, Layers3, Pencil, Plus, Tags, Trash2 } from 'lucide-react'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import { formatCurrency, formatNumber, numeric } from '../lib/utils'
import { PageHeader, SearchInput, EmptyState } from '../components/ui/Bits'
import { Modal } from '../components/ui/Modal'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { Field, TextArea, TextInput } from '../components/ui/Form'

const tones = [
  ['#E8EFE2', '#40603A'],
  ['#E9EEF4', '#3D5E7A'],
  ['#F4EBE3', '#8A5A3C'],
  ['#F1EAF4', '#6C4A74'],
  ['#EEF0E6', '#5F6844'],
  ['#F5EEE0', '#826331'],
  ['#E7F0ED', '#39675A'],
]

export default function Categories() {
  const { db, create, update, remove, nextId } = useData()
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ category_name: '', description: '' })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const categories = useMemo(() => {
    const term = search.trim().toLowerCase()
    return (db.category || [])
      .filter((category) => !term || category.category_name.toLowerCase().includes(term) || category.description?.toLowerCase().includes(term))
      .map((category) => {
        const products = (db.product || []).filter((product) => String(product.category_id) === String(category.category_id))
        const inventory = (db.inventory || []).filter((row) => products.some((product) => String(product.product_id) === String(row.product_id)))
        const units = inventory.reduce((sum, row) => sum + numeric(row.quantity_on_hand), 0)
        const value = inventory.reduce((sum, row) => {
          const product = products.find((rowProduct) => String(rowProduct.product_id) === String(row.product_id))
          return sum + numeric(row.quantity_on_hand) * numeric(product?.unit_price)
        }, 0)
        return { ...category, products, units, value }
      })
      .sort((a, b) => a.category_name.localeCompare(b.category_name))
  }, [db.category, db.product, db.inventory, search])

  const openCreate = () => {
    setEditing(null)
    setForm({ category_name: '', description: '' })
    setErrors({})
    setFormOpen(true)
  }

  const openEdit = (category) => {
    setEditing(category)
    setForm({ category_name: category.category_name, description: category.description || '' })
    setErrors({})
    setFormOpen(true)
  }

  const handleSave = async () => {
    const next = {}
    if (!form.category_name.trim()) next.category_name = 'Category name is required.'
    const duplicate = (db.category || []).some(
      (category) =>
        category.category_name.toLowerCase() === form.category_name.trim().toLowerCase() &&
        String(category.category_id) !== String(editing?.category_id),
    )
    if (duplicate) next.category_name = 'A category with this name already exists.'
    setErrors(next)
    if (Object.keys(next).length) return

    setSaving(true)
    try {
      if (editing) {
        await update('category', { category_id: editing.category_id }, {
          category_name: form.category_name.trim(),
          description: form.description.trim(),
        })
        toast.success('Category updated.')
      } else {
        await create('category', {
          category_id: nextId('category', 'category_id'),
          category_name: form.category_name.trim(),
          description: form.description.trim(),
        })
        toast.success('Category created.')
      }
      setFormOpen(false)
    } catch (error) {
      toast.error(error.message || 'Could not save category.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    if (deleting.products.length) {
      toast.error('Move or delete the products in this category first.')
      setDeleting(null)
      return
    }
    setDeleteLoading(true)
    try {
      await remove('category', { category_id: deleting.category_id })
      toast.success('Category deleted.')
      setDeleting(null)
    } catch (error) {
      toast.error(error.message || 'Could not delete category.')
    } finally {
      setDeleteLoading(false)
    }
  }

  const totalProducts = (db.product || []).length
  const activeCategories = new Set((db.product || []).map((product) => String(product.category_id))).size
  const unassigned = (db.product || []).filter((product) => !product.category_id).length

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Catalogue / taxonomy"
        title="Product categories"
        description="Organise the catalogue into merchandising groups and keep every product findable across warehouse and purchasing workflows."
      >
        <button className="btn-primary" onClick={openCreate}><Plus size={15} /> New category</button>
      </PageHeader>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="panel flex items-center gap-3 px-4 py-3.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F1F3EB] text-ink-600"><Tags size={16} /></div>
          <div><p className="mini-label">Categories</p><p className="mt-1 font-display text-[18px] font-semibold leading-none text-ink-950">{categories.length}</p></div>
        </div>
        <div className="panel flex items-center gap-3 px-4 py-3.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F1F3EB] text-ink-600"><Boxes size={16} /></div>
          <div><p className="mini-label">Products assigned</p><p className="mt-1 font-display text-[18px] font-semibold leading-none text-ink-950">{totalProducts - unassigned}</p></div>
        </div>
        <div className="panel flex items-center gap-3 px-4 py-3.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F1F3EB] text-ink-600"><Layers3 size={16} /></div>
          <div><p className="mini-label">Active categories</p><p className="mt-1 font-display text-[18px] font-semibold leading-none text-ink-950">{activeCategories}</p></div>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput value={search} onChange={setSearch} placeholder="Search categories…" className="w-full sm:max-w-xs" />
        <p className="font-mono text-[10px] text-mist">{categories.length} categories</p>
      </div>

      {categories.length === 0 ? (
        <div className="panel"><EmptyState icon={Tags} title="No categories yet" description="Create a category to organise your product catalogue." action={<button className="btn-primary" onClick={openCreate}><Plus size={14} /> New category</button>} /></div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {categories.map((category, index) => {
            const [bg, fg] = tones[index % tones.length]
            return (
              <article key={category.category_id} className="panel group flex flex-col p-5 transition hover:-translate-y-0.5 hover:shadow-lift">
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: bg, color: fg }}>
                    <Tags size={17} strokeWidth={1.8} />
                  </div>
                  <div className="flex gap-0.5 opacity-0 transition group-hover:opacity-100">
                    <button className="icon-btn" onClick={() => openEdit(category)} title="Edit category"><Pencil size={13} /></button>
                    <button className="icon-btn hover:bg-[#FBE7E0] hover:text-[#B84A2C]" onClick={() => setDeleting(category)} title="Delete category"><Trash2 size={13} /></button>
                  </div>
                </div>
                <h3 className="mt-4 font-display text-[16px] font-semibold tracking-[-0.01em] text-ink-950">{category.category_name}</h3>
                <p className="mt-1 line-clamp-2 min-h-[32px] text-[11.5px] leading-4 text-mist">{category.description || 'No description provided.'}</p>
                <div className="mt-5 grid grid-cols-3 gap-2 border-t border-line pt-3.5">
                  <div><p className="mini-label">Products</p><p className="mt-1 font-mono text-[12px] font-medium text-ink-900">{category.products.length}</p></div>
                  <div><p className="mini-label">Units</p><p className="mt-1 font-mono text-[12px] font-medium text-ink-900">{formatNumber(category.units)}</p></div>
                  <div><p className="mini-label">Value</p><p className="mt-1 font-mono text-[11px] font-medium text-ink-900">{formatCurrency(category.value, true)}</p></div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {category.products.slice(0, 3).map((product) => (
                    <span key={product.product_id} className="max-w-full truncate rounded-md bg-[#F5F6F0] px-1.5 py-1 text-[9px] text-ink-700">{product.product_name}</span>
                  ))}
                  {category.products.length > 3 && <span className="rounded-md bg-[#F5F6F0] px-1.5 py-1 text-[9px] text-mist">+{category.products.length - 3} more</span>}
                </div>
              </article>
            )
          })}
        </div>
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Edit category' : 'New category'}
        subtitle="Categories group products across the catalogue and reports."
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setFormOpen(false)} disabled={saving}>Cancel</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Create category'}</button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Category name" required error={errors.category_name}>
            <TextInput value={form.category_name} onChange={(event) => setForm({ ...form, category_name: event.target.value })} placeholder="e.g. Grains & Staples" />
          </Field>
          <Field label="Description" hint="Optional, up to 200 characters.">
            <TextArea maxLength={200} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="What belongs in this category?" />
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        loading={deleteLoading}
        title="Delete category?"
        description={`Delete "${deleting?.category_name}"? Categories containing products cannot be deleted.`}
      />
    </div>
  )
}
