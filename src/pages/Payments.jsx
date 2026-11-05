import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowDownToLine, CircleDollarSign, CreditCard, Pencil, Plus, Receipt, Trash2, Wallet } from 'lucide-react'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import { useLookups } from '../hooks/useLookups'
import { downloadCSV, formatCurrency, formatDate, formatNumber, fullName, numeric, orderTotal, todayISO } from '../lib/utils'
import { PAYMENT_METHODS } from '../lib/constants'
import { PageHeader, SearchInput, EmptyState, Avatar } from '../components/ui/Bits'
import { Modal } from '../components/ui/Modal'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { Field, FormGrid, SelectInput, TextInput } from '../components/ui/Form'
import { StatusBadge } from '../components/ui/StatusBadge'

const blankPayment = { order_id: '', amount: '', payment_method: 'UPI', payment_date: todayISO() }

export default function Payments() {
  const { db, create, update, remove, nextId } = useData()
  const { customerById, orderById } = useLookups()
  const toast = useToast()
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const [methodFilter, setMethodFilter] = useState('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(blankPayment)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const orderFinancials = useMemo(() => {
    const map = {}
    ;(db.customer_order || []).forEach((order) => {
      map[String(order.order_id)] = {
        total: orderTotal(order, db.order_item || []),
        paid: (db.payment || []).filter((payment) => String(payment.order_id) === String(order.order_id)).reduce((sum, payment) => sum + numeric(payment.amount), 0),
        customer: customerById.get(String(order.customer_id)),
      }
    })
    return map
  }, [db.customer_order, db.order_item, db.payment, customerById])

  const payments = useMemo(() => {
    const term = search.trim().toLowerCase()
    return (db.payment || [])
      .map((payment) => {
        const order = orderById.get(String(payment.order_id))
        const customer = customerById.get(String(order?.customer_id))
        return { ...payment, order, customer }
      })
      .filter((payment) => methodFilter === 'all' || payment.payment_method === methodFilter)
      .filter((payment) => !term || [payment.payment_id, payment.order_id, payment.payment_method, fullName(payment.customer), payment.customer?.email].filter(Boolean).some((value) => String(value).toLowerCase().includes(term)))
      .sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date))
  }, [db.payment, orderById, customerById, search, methodFilter])

  const metrics = useMemo(() => {
    const total = (db.payment || []).reduce((sum, payment) => sum + numeric(payment.amount), 0)
    const orderValue = Object.values(orderFinancials).reduce((sum, row) => sum + row.total, 0)
    const collectedOrders = Object.values(orderFinancials).reduce((sum, row) => sum + row.paid, 0)
    return {
      total,
      count: (db.payment || []).length,
      avg: (db.payment || []).length ? total / (db.payment || []).length : 0,
      outstanding: Math.max(0, orderValue - collectedOrders),
    }
  }, [db.payment, orderFinancials])

  const remainingForOrder = (orderId, excludePaymentId = null) => {
    const financials = orderFinancials[String(orderId)]
    if (!financials) return 0
    const alreadyPaid = (db.payment || [])
      .filter((payment) => String(payment.order_id) === String(orderId) && String(payment.payment_id) !== String(excludePaymentId))
      .reduce((sum, payment) => sum + numeric(payment.amount), 0)
    return Math.max(0, financials.total - alreadyPaid)
  }

  const openCreate = () => {
    setEditing(null)
    setForm({ ...blankPayment, payment_date: todayISO() })
    setErrors({})
    setFormOpen(true)
  }

  const openEdit = (payment) => {
    setEditing(payment)
    setForm({
      order_id: String(payment.order_id),
      amount: String(payment.amount),
      payment_method: payment.payment_method || 'UPI',
      payment_date: payment.payment_date || todayISO(),
    })
    setErrors({})
    setFormOpen(true)
  }

  const selectOrder = (orderId) => {
    const remaining = remainingForOrder(orderId, editing?.payment_id)
    setForm((previous) => ({ ...previous, order_id: orderId, amount: remaining ? String(Math.round(remaining)) : previous.amount }))
  }

  const handleSave = async () => {
    const next = {}
    if (!form.order_id) next.order_id = 'Choose an order.'
    if (!form.amount || numeric(form.amount) <= 0) next.amount = 'Amount must be greater than zero.'
    const remaining = form.order_id ? remainingForOrder(form.order_id, editing?.payment_id) : 0
    if (form.order_id && numeric(form.amount) > remaining + 0.01) next.amount = `Amount cannot exceed the outstanding balance of ${formatCurrency(remaining)}.`
    if (!form.payment_date) next.payment_date = 'Payment date is required.'
    setErrors(next)
    if (Object.keys(next).length) return

    setSaving(true)
    const payload = {
      order_id: Number(form.order_id),
      amount: Number(form.amount),
      payment_method: form.payment_method,
      payment_date: form.payment_date,
    }
    try {
      if (editing) {
        await update('payment', { payment_id: editing.payment_id }, payload)
        toast.success('Payment updated.')
      } else {
        await create('payment', { payment_id: nextId('payment', 'payment_id'), ...payload })
        toast.success('Payment recorded.')
      }
      setFormOpen(false)
    } catch (error) {
      toast.error(error.message || 'Could not save payment.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    setDeleteLoading(true)
    try {
      await remove('payment', { payment_id: deleting.payment_id })
      toast.success('Payment deleted.')
      setDeleting(null)
    } catch (error) {
      toast.error(error.message || 'Could not delete payment.')
    } finally {
      setDeleteLoading(false)
    }
  }

  const outstandingOrders = (db.customer_order || []).filter((order) => remainingForOrder(order.order_id, editing?.payment_id) > 0.01)
  const selectedOrder = form.order_id ? orderById.get(String(form.order_id)) : null
  const selectedRemaining = form.order_id ? remainingForOrder(form.order_id, editing?.payment_id) : 0

  const exportPayments = () => {
    downloadCSV('kargo-payments.csv', payments, [
      { label: 'Payment', value: 'payment_id' },
      { label: 'Order', value: 'order_id' },
      { label: 'Customer', value: (row) => fullName(row.customer) },
      { label: 'Amount', value: 'amount' },
      { label: 'Method', value: 'payment_method' },
      { label: 'Date', value: 'payment_date' },
    ])
    toast.success('Payments exported.')
  }

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Finance / receivables"
        title="Payments"
        description="Associate payment records with customer orders, monitor outstanding balances and keep the receivables ledger complete."
      >
        <button className="btn-secondary" onClick={exportPayments}><ArrowDownToLine size={14} /> Export</button>
        <button className="btn-primary" onClick={openCreate}><Plus size={15} /> Record payment</button>
      </PageHeader>

      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <div className="panel flex items-center gap-3 p-4"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F1F3EB] text-ink-600"><CircleDollarSign size={16} /></div><div><p className="mini-label">Collected</p><p className="mt-1 font-display text-[18px] font-semibold leading-none text-ink-950">{formatCurrency(metrics.total, true)}</p></div></div>
        <div className="panel flex items-center gap-3 p-4"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F1F3EB] text-ink-600"><Receipt size={16} /></div><div><p className="mini-label">Payments</p><p className="mt-1 font-display text-[18px] font-semibold leading-none text-ink-950">{metrics.count}</p></div></div>
        <div className="panel flex items-center gap-3 p-4"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F1F3EB] text-ink-600"><Wallet size={16} /></div><div><p className="mini-label">Average payment</p><p className="mt-1 font-display text-[18px] font-semibold leading-none text-ink-950">{formatCurrency(metrics.avg, true)}</p></div></div>
        <div className="panel flex items-center gap-3 p-4"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FBF3E2] text-[#A77822]"><CreditCard size={16} /></div><div><p className="mini-label">Outstanding</p><p className="mt-1 font-display text-[18px] font-semibold leading-none text-ink-950">{formatCurrency(metrics.outstanding, true)}</p></div></div>
      </div>

      <div className="panel overflow-hidden">
        <div className="flex flex-col gap-2 border-b border-line px-4 py-3.5 sm:flex-row sm:items-center">
          <SearchInput value={search} onChange={setSearch} placeholder="Search payment, order or customer…" className="w-full sm:max-w-xs" />
          <SelectInput className="h-9 w-full text-[12px] sm:w-auto" value={methodFilter} onChange={(event) => setMethodFilter(event.target.value)}>
            <option value="all">All methods</option>
            {PAYMENT_METHODS.map((method) => <option key={method} value={method}>{method}</option>)}
          </SelectInput>
          <span className="ml-auto font-mono text-[10px] text-mist">{payments.length} payments</span>
        </div>

        {payments.length === 0 ? (
          <EmptyState icon={CreditCard} title="No payments recorded" description="Record a payment against a customer order to start the ledger." action={<button className="btn-primary" onClick={openCreate}><Plus size={14} /> Record payment</button>} />
        ) : (
          <div className="table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Payment</th>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Method</th>
                  <th>Date</th>
                  <th>Order balance</th>
                  <th className="text-right">Amount</th>
                  <th className="w-20 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => {
                  const financials = orderFinancials[String(payment.order_id)]
                  const balance = financials ? Math.max(0, financials.total - financials.paid) : 0
                  return (
                    <tr key={payment.payment_id} className="cursor-pointer" onClick={() => navigate(`/orders?view=${payment.order_id}`)}>
                      <td><span className="font-mono text-[11px] font-semibold text-ink-900">PAY-{payment.payment_id}</span></td>
                      <td><span className="font-mono text-[10.5px] text-ink-700">#{payment.order_id}</span></td>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <Avatar name={fullName(payment.customer)} size="xs" tone="green" />
                          <div className="min-w-0"><p className="max-w-[150px] truncate text-[11px] font-medium text-ink-900">{fullName(payment.customer)}</p><p className="text-[9px] text-mist">{formatDate(payment.order?.order_date, 'short')}</p></div>
                        </div>
                      </td>
                      <td><span className="rounded-md bg-[#F1F3EB] px-2 py-1 text-[9.5px] text-ink-700">{payment.payment_method}</span></td>
                      <td><span className="text-[10.5px] text-mist">{formatDate(payment.payment_date, 'short')}</span></td>
                      <td>{balance <= 0.01 ? <StatusBadge status="Paid" /> : <span className="font-mono text-[10.5px] text-[#946714]">{formatCurrency(balance)}</span>}</td>
                      <td className="text-right"><span className="font-mono text-[11.5px] font-semibold text-ink-900">{formatCurrency(payment.amount)}</span></td>
                      <td>
                        <div className="flex justify-end gap-0.5" onClick={(event) => event.stopPropagation()}>
                          <button className="icon-btn" onClick={() => openEdit(payment)} title="Edit"><Pencil size={13} /></button>
                          <button className="icon-btn hover:bg-[#FBE7E0] hover:text-[#B84A2C]" onClick={() => setDeleting(payment)} title="Delete"><Trash2 size={13} /></button>
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
        title={editing ? 'Edit payment' : 'Record payment'}
        subtitle={editing ? `Updating PAY-${editing.payment_id}` : 'Associate a payment with a customer order.'}
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setFormOpen(false)} disabled={saving}>Cancel</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Record payment'}</button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Customer order" required error={errors.order_id} hint={selectedOrder ? `Order value ${formatCurrency(orderFinancials[String(form.order_id)]?.total || 0)} · outstanding ${formatCurrency(selectedRemaining)}` : undefined}>
            <SelectInput value={form.order_id} onChange={(event) => selectOrder(event.target.value)} placeholder="Select an order">
              {outstandingOrders.map((order) => {
                const customer = customerById.get(String(order.customer_id))
                const remaining = remainingForOrder(order.order_id, editing?.payment_id)
                return <option key={order.order_id} value={order.order_id}>#{order.order_id} · {fullName(customer)} · {formatCurrency(remaining)} due</option>
              })}
              {editing && !outstandingOrders.some((order) => String(order.order_id) === String(form.order_id)) && form.order_id && (
                <option value={form.order_id}>#{form.order_id} · {fullName(selectedOrder ? customerById.get(String(selectedOrder.customer_id)) : null)} · paid</option>
              )}
            </SelectInput>
          </Field>
          <Field label="Amount (₹)" required error={errors.amount}>
            <TextInput type="number" min="0" step="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} />
          </Field>
          <FormGrid>
            <Field label="Payment method">
              <SelectInput value={form.payment_method} onChange={(event) => setForm({ ...form, payment_method: event.target.value })} options={PAYMENT_METHODS} />
            </Field>
            <Field label="Payment date" required error={errors.payment_date}>
              <TextInput type="date" value={form.payment_date} onChange={(event) => setForm({ ...form, payment_date: event.target.value })} />
            </Field>
          </FormGrid>
          <div className="rounded-lg bg-[#F7F8F2] px-3 py-2 text-[10.5px] text-mist">
            {numeric(form.amount) > 0 && selectedRemaining > 0 ? (
              <>New balance after payment: <span className="font-mono font-medium text-ink-800">{formatCurrency(Math.max(0, selectedRemaining - numeric(form.amount)))}</span></>
            ) : (
              <>Select an order with an outstanding balance to record a payment.</>
            )}
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        loading={deleteLoading}
        title="Delete payment?"
        description={`Delete payment PAY-${deleting?.payment_id}? The order balance will increase accordingly.`}
      />
    </div>
  )
}
