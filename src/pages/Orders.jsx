import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  ArrowDownToLine,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  CreditCard,
  Mail,
  MapPin,
  Package,
  Pencil,
  Plus,
  Receipt,
  Ship,
  ShoppingBag,
  Trash2,
  Truck,
  X,
} from 'lucide-react'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import { useLookups } from '../hooks/useLookups'
import {
  downloadCSV,
  formatCurrency,
  formatDate,
  formatNumber,
  fullName,
  numeric,
  orderTotal,
  todayISO,
} from '../lib/utils'
import { ORDER_STATUSES, PAYMENT_METHODS, SHIPMENT_STATUSES } from '../lib/constants'
import { PageHeader, SearchInput, EmptyState, DetailRow, Avatar } from '../components/ui/Bits'
import { Modal, Drawer } from '../components/ui/Modal'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { Field, FormGrid, SelectInput, TextArea, TextInput } from '../components/ui/Form'
import { StatusBadge } from '../components/ui/StatusBadge'

const blankOrder = { customer_id: '', warehouse_id: '', order_date: todayISO(), order_status: 'Pending' }
const blankLine = { product_id: '', quantity: '', unit_price: '' }

export default function Orders() {
  const { db, create, update, remove, nextId } = useData()
  const { customerById, warehouseById, productById, transporterById, customerName, warehouseName, paymentsByOrder, shipmentByOrder } = useLookups()
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(blankOrder)
  const [lines, setLines] = useState([{ ...blankLine }])
  const [errors, setErrors] = useState({})
  const [lineErrors, setLineErrors] = useState([])
  const [saving, setSaving] = useState(false)
  const [viewing, setViewing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const [paymentOpen, setPaymentOpen] = useState(false)
  const [paymentForm, setPaymentForm] = useState({ amount: '', payment_method: 'UPI', payment_date: todayISO() })
  const [paymentSaving, setPaymentSaving] = useState(false)
  const [shipmentOpen, setShipmentOpen] = useState(false)
  const [shipmentForm, setShipmentForm] = useState({ transporter_id: '', ship_date: todayISO(), delivery_date: '', shipment_status: 'Pending' })
  const [shipmentSaving, setShipmentSaving] = useState(false)

  const orders = useMemo(() => {
    const term = search.trim().toLowerCase()
    return (db.customer_order || [])
      .map((order) => {
        const items = (db.order_item || []).filter((item) => String(item.order_id) === String(order.order_id)).map((item) => ({ ...item, product: productById.get(String(item.product_id)) }))
        const payments = paymentsByOrder[String(order.order_id)] || []
        const paid = payments.reduce((sum, payment) => sum + numeric(payment.amount), 0)
        const total = orderTotal(order, db.order_item || [])
        const paymentStatus = paid <= 0.01 ? 'Unpaid' : paid < total - 0.01 ? 'Partial' : 'Paid'
        return {
          ...order,
          customer: customerById.get(String(order.customer_id)),
          warehouse: warehouseById.get(String(order.warehouse_id)),
          items,
          payments,
          shipment: shipmentByOrder[String(order.order_id)],
          paid,
          total,
          paymentStatus,
        }
      })
      .filter((order) => statusFilter === 'all' || order.order_status === statusFilter)
      .filter((order) => !term || [order.order_id, fullName(order.customer), order.customer?.email, order.warehouse?.warehouse_name, order.order_status].filter(Boolean).some((value) => String(value).toLowerCase().includes(term)))
      .sort((a, b) => new Date(b.order_date) - new Date(a.order_date))
  }, [db.customer_order, db.order_item, db.customer, db.payment, customerById, warehouseById, productById, paymentsByOrder, shipmentByOrder, search, statusFilter])

  const metrics = useMemo(() => {
    const all = (db.customer_order || []).map((order) => ({ ...order, total: orderTotal(order, db.order_item || []) }))
    const active = all.filter((order) => order.order_status !== 'Cancelled')
    const gross = active.reduce((sum, order) => sum + order.total, 0)
    const collected = (db.payment || []).reduce((sum, payment) => sum + numeric(payment.amount), 0)
    return {
      total: all.length,
      open: all.filter((order) => ['Pending', 'Confirmed', 'Processing', 'Packed'].includes(order.order_status)).length,
      gross,
      collected,
      avg: active.length ? gross / active.length : 0,
    }
  }, [db.customer_order, db.order_item, db.payment])

  const openCreate = () => {
    setEditing(null)
    setForm({ ...blankOrder, order_date: todayISO() })
    setLines([{ ...blankLine }])
    setErrors({})
    setLineErrors([])
    setFormOpen(true)
  }

  const openEdit = (order) => {
    setEditing(order)
    setForm({
      customer_id: String(order.customer_id),
      warehouse_id: String(order.warehouse_id),
      order_date: order.order_date || todayISO(),
      order_status: order.order_status,
    })
    setLines(order.items.length ? order.items.map((item) => ({ product_id: String(item.product_id), quantity: String(item.quantity), unit_price: String(item.unit_price) })) : [{ ...blankLine }])
    setErrors({})
    setLineErrors([])
    setFormOpen(true)
    setViewing(null)
  }

  useEffect(() => {
    const newParam = searchParams.get('new')
    const viewParam = searchParams.get('view')
    if (newParam === '1') {
      openCreate()
      setSearchParams({}, { replace: true })
    } else if (viewParam) {
      const order = (db.customer_order || []).find((row) => String(row.order_id) === String(viewParam))
      if (order) {
        const items = (db.order_item || []).filter((item) => String(item.order_id) === String(order.order_id)).map((item) => ({ ...item, product: productById.get(String(item.product_id)) }))
        setViewing({ ...order, items })
      }
      setSearchParams({}, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const updateLine = (index, patch) => {
    setLines((previous) => previous.map((line, lineIndex) => (lineIndex === index ? { ...line, ...patch } : line)))
  }

  const validate = () => {
    const next = {}
    if (!form.customer_id) next.customer_id = 'Choose a customer.'
    if (!form.warehouse_id) next.warehouse_id = 'Choose a fulfilment warehouse.'
    if (!form.order_date) next.order_date = 'Order date is required.'
    const nextLineErrors = lines.map((line) => {
      const lineError = {}
      if (!line.product_id) lineError.product_id = 'Choose a product.'
      if (!line.quantity || numeric(line.quantity) <= 0) lineError.quantity = 'Quantity must be greater than zero.'
      if (line.unit_price === '' || numeric(line.unit_price) < 0) lineError.unit_price = 'Enter a unit price.'
      return lineError
    })
    const productIds = lines.map((line) => String(line.product_id)).filter(Boolean)
    const duplicate = new Set(productIds).size !== productIds.length
    setErrors(next)
    setLineErrors(nextLineErrors)
    if (duplicate) toast.error('Each product can only appear once per order. Increase the quantity instead.')
    return Object.keys(next).length === 0 && !nextLineErrors.some((lineError) => Object.keys(lineError).length) && !duplicate
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    const orderId = editing ? editing.order_id : nextId('customer_order', 'order_id')
    try {
      if (editing) {
        await update('customer_order', { order_id: orderId }, {
          customer_id: Number(form.customer_id),
          warehouse_id: Number(form.warehouse_id),
          order_date: form.order_date,
          order_status: form.order_status,
        })
        const existing = (db.order_item || []).filter((item) => String(item.order_id) === String(orderId))
        for (const item of existing) {
          await remove('order_item', { order_id: orderId, line_no: item.line_no })
        }
      } else {
        await create('customer_order', {
          order_id: orderId,
          customer_id: Number(form.customer_id),
          warehouse_id: Number(form.warehouse_id),
          order_date: form.order_date,
          order_status: form.order_status,
        })
      }
      await create(
        'order_item',
        lines.map((line, index) => ({
          order_id: orderId,
          line_no: index + 1,
          product_id: Number(line.product_id),
          quantity: Number(line.quantity),
          unit_price: Number(line.unit_price),
        })),
      )
      toast.success(editing ? 'Order updated.' : 'Customer order created.')
      setFormOpen(false)
      setViewing(null)
    } catch (error) {
      toast.error(error.message || 'Could not save order.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    setDeleteLoading(true)
    try {
      for (const item of (db.order_item || []).filter((row) => String(row.order_id) === String(deleting.order_id))) {
        await remove('order_item', { order_id: deleting.order_id, line_no: item.line_no })
      }
      for (const payment of (db.payment || []).filter((row) => String(row.order_id) === String(deleting.order_id))) {
        await remove('payment', { payment_id: payment.payment_id })
      }
      const shipment = (db.shipment || []).find((row) => String(row.order_id) === String(deleting.order_id))
      if (shipment) await remove('shipment', { shipment_id: shipment.shipment_id })
      await remove('customer_order', { order_id: deleting.order_id })
      toast.success('Order deleted.')
      setDeleting(null)
      setViewing(null)
    } catch (error) {
      toast.error(error.message || 'Could not delete order.')
    } finally {
      setDeleteLoading(false)
    }
  }

  const openPayment = () => {
    const order = viewingOrder
    if (!order) return
    const remaining = Math.max(0, order.total - order.paid)
    setPaymentForm({ amount: String(Math.round(remaining)), payment_method: 'UPI', payment_date: todayISO() })
    setPaymentOpen(true)
  }

  const savePayment = async () => {
    if (!viewingOrder) return
    const amount = numeric(paymentForm.amount)
    const remaining = Math.max(0, viewingOrder.total - viewingOrder.paid)
    if (amount <= 0) return toast.error('Payment amount must be greater than zero.')
    if (amount > remaining + 0.01) return toast.error(`The outstanding balance is ${formatCurrency(remaining)}.`)
    setPaymentSaving(true)
    try {
      await create('payment', {
        payment_id: nextId('payment', 'payment_id'),
        order_id: viewingOrder.order_id,
        amount,
        payment_method: paymentForm.payment_method,
        payment_date: paymentForm.payment_date,
      })
      toast.success('Payment recorded against the order.')
      setPaymentOpen(false)
    } catch (error) {
      toast.error(error.message || 'Could not record payment.')
    } finally {
      setPaymentSaving(false)
    }
  }

  const openShipment = () => {
    setShipmentForm({ transporter_id: '', ship_date: todayISO(), delivery_date: '', shipment_status: 'Pending' })
    setShipmentOpen(true)
  }

  const saveShipment = async () => {
    if (!viewingOrder) return
    if (!shipmentForm.transporter_id) return toast.error('Choose a transporter.')
    if (!shipmentForm.ship_date) return toast.error('Ship date is required.')
    setShipmentSaving(true)
    try {
      await create('shipment', {
        shipment_id: nextId('shipment', 'shipment_id'),
        order_id: viewingOrder.order_id,
        transporter_id: Number(shipmentForm.transporter_id),
        ship_date: shipmentForm.ship_date,
        delivery_date: shipmentForm.delivery_date || null,
        shipment_status: shipmentForm.shipment_status,
      })
      toast.success('Shipment created for this order.')
      setShipmentOpen(false)
    } catch (error) {
      toast.error(error.message || 'Could not create shipment.')
    } finally {
      setShipmentSaving(false)
    }
  }

  const viewingOrder = viewing
    ? orders.find((order) => String(order.order_id) === String(viewing.order_id)) || (() => {
        const order = (db.customer_order || []).find((row) => String(row.order_id) === String(viewing.order_id))
        if (!order) return null
        const items = (db.order_item || []).filter((item) => String(item.order_id) === String(order.order_id)).map((item) => ({ ...item, product: productById.get(String(item.product_id)) }))
        const payments = paymentsByOrder[String(order.order_id)] || []
        const paid = payments.reduce((sum, payment) => sum + numeric(payment.amount), 0)
        return {
          ...order,
          items,
          payments,
          paid,
          total: orderTotal(order, db.order_item || []),
          customer: customerById.get(String(order.customer_id)),
          warehouse: warehouseById.get(String(order.warehouse_id)),
          shipment: shipmentByOrder[String(order.order_id)],
          paymentStatus: paid <= 0.01 ? 'Unpaid' : paid < orderTotal(order, db.order_item || []) - 0.01 ? 'Partial' : 'Paid',
        }
      })()
    : null

  const lineTotal = lines.reduce((sum, line) => sum + numeric(line.quantity) * numeric(line.unit_price), 0)
  const outstanding = viewingOrder ? Math.max(0, viewingOrder.total - viewingOrder.paid) : 0

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Operations / customer orders"
        title="Customer orders"
        description="Record orders, add line items, track payment against the balance and connect fulfilment to a shipment."
      >
        <button
          className="btn-secondary"
          onClick={() => {
            downloadCSV('kargo-orders.csv', orders, [
              { label: 'Order', value: 'order_id' },
              { label: 'Customer', value: (row) => fullName(row.customer) },
              { label: 'Warehouse', value: (row) => row.warehouse?.warehouse_name || '' },
              { label: 'Date', value: 'order_date' },
              { label: 'Status', value: 'order_status' },
              { label: 'Items', value: (row) => row.items.length },
              { label: 'Total', value: 'total' },
              { label: 'Paid', value: 'paid' },
            ])
            toast.success('Orders exported.')
          }}
        >
          <ArrowDownToLine size={14} /> Export
        </button>
        <button className="btn-primary" onClick={openCreate}><Plus size={15} /> New order</button>
      </PageHeader>

      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <div className="panel flex items-center gap-3 p-4"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F1F3EB] text-ink-600"><ShoppingBag size={16} /></div><div><p className="mini-label">Total orders</p><p className="mt-1 font-display text-[18px] font-semibold leading-none text-ink-950">{metrics.total}</p></div></div>
        <div className="panel flex items-center gap-3 p-4"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F1F3EB] text-ink-600"><ClipboardList size={16} /></div><div><p className="mini-label">Open orders</p><p className="mt-1 font-display text-[18px] font-semibold leading-none text-ink-950">{metrics.open}</p></div></div>
        <div className="panel flex items-center gap-3 p-4"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F1F3EB] text-ink-600"><CircleDollarSign size={16} /></div><div><p className="mini-label">Order value</p><p className="mt-1 font-display text-[18px] font-semibold leading-none text-ink-950">{formatCurrency(metrics.gross, true)}</p></div></div>
        <div className="panel flex items-center gap-3 p-4"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F1F3EB] text-ink-600"><Receipt size={16} /></div><div><p className="mini-label">Average order</p><p className="mt-1 font-display text-[18px] font-semibold leading-none text-ink-950">{formatCurrency(metrics.avg, true)}</p></div></div>
      </div>

      <div className="panel overflow-hidden">
        <div className="flex flex-col gap-2 border-b border-line px-4 py-3.5 sm:flex-row sm:items-center">
          <SearchInput value={search} onChange={setSearch} placeholder="Search order, customer or warehouse…" className="w-full sm:max-w-xs" />
          <SelectInput className="h-9 w-full text-[12px] sm:w-auto" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">All statuses</option>
            {ORDER_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
          </SelectInput>
          <span className="ml-auto font-mono text-[10px] text-mist">{orders.length} orders</span>
        </div>

        {orders.length === 0 ? (
          <EmptyState icon={ShoppingBag} title="No orders found" description="Create an order to begin recording customer demand and fulfilment." action={<button className="btn-primary" onClick={openCreate}><Plus size={14} /> New order</button>} />
        ) : (
          <div className="table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Warehouse</th>
                  <th>Date</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Payment</th>
                  <th>Order status</th>
                  <th className="w-20 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.order_id} className="cursor-pointer" onClick={() => setViewing(order)}>
                    <td><span className="font-mono text-[11px] font-semibold text-ink-900">#{order.order_id}</span>{order.shipment && <p className="mt-0.5 flex items-center gap-1 text-[9px] text-mist"><Truck size={9} /> {order.shipment.shipment_status}</p>}</td>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={fullName(order.customer)} size="xs" tone={order.order_id % 2 ? 'green' : 'blue'} />
                        <div className="min-w-0"><p className="max-w-[150px] truncate text-[11.5px] font-medium text-ink-900">{order.customer ? fullName(order.customer) : 'Unknown customer'}</p><p className="text-[9px] text-mist">{order.customer?.city}</p></div>
                      </div>
                    </td>
                    <td><p className="max-w-[135px] truncate text-[10.5px] text-ink-800">{order.warehouse?.warehouse_name || '—'}</p></td>
                    <td><span className="text-[10.5px] text-mist">{formatDate(order.order_date, 'short')}</span></td>
                    <td><span className="rounded-md bg-[#F1F3EB] px-2 py-1 font-mono text-[10px] text-ink-700">{order.items.length}</span></td>
                    <td><span className="font-mono text-[11px] font-medium text-ink-900">{formatCurrency(order.total)}</span></td>
                    <td><StatusBadge status={order.paymentStatus} /></td>
                    <td><StatusBadge status={order.order_status} /></td>
                    <td>
                      <div className="flex justify-end gap-0.5" onClick={(event) => event.stopPropagation()}>
                        <button className="icon-btn" onClick={() => openEdit(order)} title="Edit"><Pencil size={13} /></button>
                        <button className="icon-btn hover:bg-[#FBE7E0] hover:text-[#B84A2C]" onClick={() => setDeleting(order)} title="Delete"><Trash2 size={13} /></button>
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
        title={editing ? 'Edit customer order' : 'New customer order'}
        subtitle="Record the customer, fulfilment warehouse and each product being ordered."
        size="xl"
        footer={
          <>
            <div className="mr-auto hidden text-[11px] text-mist sm:block">Order total <span className="ml-1 font-mono text-[13px] font-semibold text-ink-900">{formatCurrency(lineTotal)}</span></div>
            <button className="btn-secondary" onClick={() => setFormOpen(false)} disabled={saving}>Cancel</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Create order'}</button>
          </>
        }
      >
        <div className="space-y-5">
          <FormGrid>
            <Field label="Customer" required error={errors.customer_id}>
              <SelectInput value={form.customer_id} onChange={(event) => setForm({ ...form, customer_id: event.target.value })} placeholder="Select customer" options={(db.customer || []).map((customer) => ({ value: customer.customer_id, label: `${fullName(customer)} · ${customer.city}` }))} />
            </Field>
            <Field label="Fulfilment warehouse" required error={errors.warehouse_id}>
              <SelectInput value={form.warehouse_id} onChange={(event) => setForm({ ...form, warehouse_id: event.target.value })} placeholder="Select warehouse" options={(db.warehouse || []).map((warehouse) => ({ value: warehouse.warehouse_id, label: warehouse.warehouse_name }))} />
            </Field>
            <Field label="Order date" required error={errors.order_date}>
              <TextInput type="date" value={form.order_date} onChange={(event) => setForm({ ...form, order_date: event.target.value })} />
            </Field>
            <Field label="Order status">
              <SelectInput value={form.order_status} onChange={(event) => setForm({ ...form, order_status: event.target.value })} options={ORDER_STATUSES} />
            </Field>
          </FormGrid>

          <div>
            <div className="mb-2.5 flex items-center justify-between border-b border-line pb-2.5">
              <div><h3 className="font-display text-[13px] font-semibold text-ink-950">Order line items</h3><p className="mt-0.5 text-[10.5px] text-mist">Each product is recorded with quantity and selling price.</p></div>
              <button className="btn-secondary h-8 px-3 text-[11px]" onClick={() => setLines([...lines, { ...blankLine }])} type="button"><Plus size={13} /> Add line</button>
            </div>
            <div className="space-y-2.5">
              {lines.map((line, index) => {
                const lineError = lineErrors[index] || {}
                return (
                  <div key={index} className="rounded-xl border border-line bg-[#FBFBF7] p-3">
                    <div className="flex items-center justify-between pb-2">
                      <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-mist">Line {String(index + 1).padStart(2, '0')}</span>
                      <button className="icon-btn h-6 w-6 hover:bg-[#FBE7E0] hover:text-[#B84A2C]" onClick={() => setLines(lines.length === 1 ? [{ ...blankLine }] : lines.filter((_, lineIndex) => lineIndex !== index))} type="button"><X size={13} /></button>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_100px_120px_92px]">
                      <Field error={lineError.product_id}>
                        <SelectInput className="h-9 text-[11.5px]" value={line.product_id} onChange={(event) => {
                          const product = productById.get(event.target.value)
                          updateLine(index, { product_id: event.target.value, unit_price: product ? String(product.unit_price) : '' })
                        }} placeholder="Select product" options={(db.product || []).map((product) => ({ value: product.product_id, label: product.product_name }))} />
                      </Field>
                      <Field error={lineError.quantity}>
                        <TextInput className="h-9 text-[11.5px]" type="number" min="1" placeholder="Qty" value={line.quantity} onChange={(event) => updateLine(index, { quantity: event.target.value })} />
                      </Field>
                      <Field error={lineError.unit_price}>
                        <TextInput className="h-9 text-[11.5px]" type="number" min="0" step="0.01" placeholder="Unit price" value={line.unit_price} onChange={(event) => updateLine(index, { unit_price: event.target.value })} />
                      </Field>
                      <div className="flex h-9 items-center justify-end rounded-lg bg-white px-2.5 font-mono text-[10.5px] font-medium text-ink-900">{formatCurrency(numeric(line.quantity) * numeric(line.unit_price))}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </Modal>

      <Drawer
        open={Boolean(viewingOrder)}
        onClose={() => setViewing(null)}
        title={viewingOrder ? `Order #${viewingOrder.order_id}` : 'Customer order'}
        subtitle={viewingOrder ? `${viewingOrder.customer ? fullName(viewingOrder.customer) : 'Customer'} · ${formatDate(viewingOrder.order_date)}` : ''}
        footer={
          <>
            <button className="btn-danger" onClick={() => setDeleting(viewingOrder)}><Trash2 size={14} /> Delete</button>
            <button className="btn-secondary" onClick={() => openEdit(viewingOrder)}><Pencil size={14} /> Edit order</button>
          </>
        }
      >
        {viewingOrder && (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-paper p-4">
              <div>
                <p className="mini-label">Order value</p>
                <p className="mt-1 font-display text-[24px] font-semibold leading-none tracking-[-0.03em] text-ink-950">{formatCurrency(viewingOrder.total)}</p>
                <p className="mt-1 text-[10px] text-mist">{viewingOrder.items.length} line items · {viewingOrder.warehouse?.warehouse_name}</p>
              </div>
              <div className="flex flex-col items-end gap-1.5"><StatusBadge status={viewingOrder.order_status} /><StatusBadge status={viewingOrder.paymentStatus} /></div>
            </div>

            <div>
              <p className="kicker mb-2">Customer</p>
              <div className="flex items-center gap-3 rounded-xl border border-line px-3 py-3">
                <Avatar name={viewingOrder.customer ? fullName(viewingOrder.customer) : '?'} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11.5px] font-semibold text-ink-900">{viewingOrder.customer ? fullName(viewingOrder.customer) : 'Unknown'}</p>
                  <p className="truncate text-[9.5px] text-mist">{viewingOrder.customer?.email}</p>
                </div>
                <div className="text-right text-[9.5px] text-mist"><p className="flex items-center gap-1"><Mail size={9} /> {viewingOrder.customer?.phone}</p><p className="mt-0.5 flex items-center gap-1"><MapPin size={9} /> {viewingOrder.customer?.city}</p></div>
              </div>
            </div>

            <div>
              <p className="kicker mb-2">Line items</p>
              <div className="overflow-hidden rounded-xl border border-line">
                <table className="w-full text-left">
                  <thead><tr className="bg-[#F7F7F1]"><th className="px-3 py-2 font-mono text-[8.5px] uppercase tracking-wider text-mist">Product</th><th className="px-2 py-2 text-right font-mono text-[8.5px] uppercase tracking-wider text-mist">Qty</th><th className="px-2 py-2 text-right font-mono text-[8.5px] uppercase tracking-wider text-mist">Unit</th><th className="px-3 py-2 text-right font-mono text-[8.5px] uppercase tracking-wider text-mist">Total</th></tr></thead>
                  <tbody>
                    {viewingOrder.items.map((item) => (
                      <tr key={item.line_no} className="border-t border-line">
                        <td className="px-3 py-2.5 text-[10.5px] font-medium text-ink-900">{item.product?.product_name || 'Unknown'}</td>
                        <td className="px-2 py-2.5 text-right font-mono text-[10px] text-ink-800">{formatNumber(item.quantity)}</td>
                        <td className="px-2 py-2.5 text-right font-mono text-[10px] text-ink-800">{formatCurrency(item.unit_price)}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-[10px] font-medium text-ink-900">{formatCurrency(numeric(item.quantity) * numeric(item.unit_price))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="kicker">Payment</p>
                {viewingOrder.paymentStatus !== 'Paid' && <button className="text-[10.5px] font-semibold text-ink-600 hover:text-ink-900" onClick={openPayment}>+ Record payment</button>}
              </div>
              <div className="rounded-xl border border-line p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2"><div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F1F3EB] text-ink-600"><CreditCard size={13} /></div><div><p className="text-[10.5px] font-semibold text-ink-900">Paid {formatCurrency(viewingOrder.paid)}</p><p className="text-[9px] text-mist">Outstanding {formatCurrency(outstanding)}</p></div></div>
                  <StatusBadge status={viewingOrder.paymentStatus} />
                </div>
                {viewingOrder.payments.length > 0 && (
                  <div className="mt-2.5 space-y-1.5 border-t border-line pt-2.5">
                    {viewingOrder.payments.map((payment) => (
                      <div key={payment.payment_id} className="flex items-center justify-between text-[9.5px] text-mist">
                        <span>{payment.payment_method} · {formatDate(payment.payment_date, 'short')}</span>
                        <span className="font-mono text-ink-800">{formatCurrency(payment.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {outstanding > 0 && <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#EEF0E8]"><div className="h-full rounded-full bg-lime-500" style={{ width: `${Math.min(100, (viewingOrder.paid / viewingOrder.total) * 100)}%` }} /></div>}
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="kicker">Shipment</p>
                {!viewingOrder.shipment && !['Cancelled', 'Returned'].includes(viewingOrder.order_status) && <button className="text-[10.5px] font-semibold text-ink-600 hover:text-ink-900" onClick={openShipment}>+ Create shipment</button>}
              </div>
              {viewingOrder.shipment ? (
                <div className="rounded-xl border border-line p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2"><div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#E8F2EE] text-ink-600"><Ship size={13} /></div><div><p className="text-[10.5px] font-semibold text-ink-900">{transporterById.get(String(viewingOrder.shipment.transporter_id))?.transporter_name || 'Transporter'}</p><p className="text-[9px] text-mist">Shipped {formatDate(viewingOrder.shipment.ship_date, 'short')}</p></div></div>
                    <StatusBadge status={viewingOrder.shipment.shipment_status} />
                  </div>
                  <div className="mt-2.5 grid grid-cols-2 gap-2 border-t border-line pt-2.5 text-[9.5px] text-mist"><span>Delivery: {viewingOrder.shipment.delivery_date ? formatDate(viewingOrder.shipment.delivery_date, 'short') : 'Pending'}</span><span className="text-right font-mono">SHIP-{viewingOrder.shipment.shipment_id}</span></div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-line px-4 py-5 text-center text-[11px] text-mist">No shipment has been created for this order.</div>
              )}
            </div>
          </div>
        )}
      </Drawer>

      <Modal
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        title="Record payment"
        subtitle={viewingOrder ? `Order #${viewingOrder.order_id} · outstanding ${formatCurrency(outstanding)}` : ''}
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setPaymentOpen(false)} disabled={paymentSaving}>Cancel</button>
            <button className="btn-primary" onClick={savePayment} disabled={paymentSaving}>{paymentSaving ? 'Saving…' : 'Record payment'}</button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Amount (₹)" required hint={`Maximum outstanding: ${formatCurrency(outstanding)}`}>
            <TextInput type="number" min="0" step="0.01" value={paymentForm.amount} onChange={(event) => setPaymentForm({ ...paymentForm, amount: event.target.value })} />
          </Field>
          <FormGrid>
            <Field label="Payment method">
              <SelectInput value={paymentForm.payment_method} onChange={(event) => setPaymentForm({ ...paymentForm, payment_method: event.target.value })} options={PAYMENT_METHODS} />
            </Field>
            <Field label="Payment date">
              <TextInput type="date" value={paymentForm.payment_date} onChange={(event) => setPaymentForm({ ...paymentForm, payment_date: event.target.value })} />
            </Field>
          </FormGrid>
        </div>
      </Modal>

      <Modal
        open={shipmentOpen}
        onClose={() => setShipmentOpen(false)}
        title="Create shipment"
        subtitle={viewingOrder ? `Dispatch order #${viewingOrder.order_id}` : ''}
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setShipmentOpen(false)} disabled={shipmentSaving}>Cancel</button>
            <button className="btn-primary" onClick={saveShipment} disabled={shipmentSaving}>{shipmentSaving ? 'Saving…' : 'Create shipment'}</button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Transporter" required>
            <SelectInput value={shipmentForm.transporter_id} onChange={(event) => setShipmentForm({ ...shipmentForm, transporter_id: event.target.value })} placeholder="Choose transporter" options={(db.transporter || []).map((transporter) => ({ value: transporter.transporter_id, label: `${transporter.transporter_name} · ${transporter.vehicle_type}` }))} />
          </Field>
          <FormGrid>
            <Field label="Ship date" required>
              <TextInput type="date" value={shipmentForm.ship_date} onChange={(event) => setShipmentForm({ ...shipmentForm, ship_date: event.target.value })} />
            </Field>
            <Field label="Delivery date">
              <TextInput type="date" value={shipmentForm.delivery_date} onChange={(event) => setShipmentForm({ ...shipmentForm, delivery_date: event.target.value })} />
            </Field>
          </FormGrid>
          <Field label="Shipment status">
            <SelectInput value={shipmentForm.shipment_status} onChange={(event) => setShipmentForm({ ...shipmentForm, shipment_status: event.target.value })} options={SHIPMENT_STATUSES} />
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        loading={deleteLoading}
        title="Delete customer order?"
        description={`Delete order #${deleting?.order_id} along with its line items, payments and shipment? This cannot be undone.`}
      />
    </div>
  )
}
