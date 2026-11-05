import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpRight,
  Boxes,
  CircleDollarSign,
  Clock3,
  PackageCheck,
  Plus,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  Truck,
  Warehouse as WarehouseIcon,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useData } from '../context/DataContext'
import { useLookups } from '../hooks/useLookups'
import { formatCurrency, formatDate, formatNumber, numeric, orderTotal, pct, stockStatus } from '../lib/utils'
import { PageHeader, SectionCard, EmptyState } from '../components/ui/Bits'
import { StatusBadge } from '../components/ui/StatusBadge'

const CHART_COLORS = ['#10241C', '#C2F05C', '#E8794A', '#9AA89F', '#4F83CB', '#7F6BC3', '#D49A2A', '#A76A52']

function KpiCard({ icon: Icon, label, value, detail, tone = 'default', chart }) {
  const tones = {
    default: 'bg-white',
    dark: 'bg-ink-900 text-white border-ink-900',
    lime: 'bg-lime-400 border-lime-400',
  }
  const isDark = tone === 'dark'
  const isLime = tone === 'lime'
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-line p-4 shadow-card sm:p-5 ${tones[tone]}`}>
      {tone === 'dark' && <div className="hero-noise pointer-events-none absolute inset-0 opacity-30" />}
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className={`font-mono text-[9px] font-medium uppercase tracking-[0.14em] ${isDark ? 'text-white/40' : isLime ? 'text-ink-700/70' : 'text-mist'}`}>
            {label}
          </p>
          <p className={`mt-2.5 font-display text-[25px] font-semibold leading-none tracking-[-0.04em] ${isDark ? 'text-white' : 'text-ink-950'}`}>
            {value}
          </p>
          <p className={`mt-2 text-[10.5px] ${isDark ? 'text-white/45' : isLime ? 'text-ink-700/70' : 'text-mist'}`}>{detail}</p>
        </div>
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${isDark ? 'bg-white/10 text-lime-400' : isLime ? 'bg-ink-900/10 text-ink-800' : 'bg-[#F1F3EB] text-ink-600'}`}>
          <Icon size={15} strokeWidth={1.8} />
        </div>
      </div>
      {chart && <div className="relative mt-3 h-7">{chart}</div>}
    </div>
  )
}

function ChartTooltip({ active, payload, label, money = false }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-line bg-white px-3 py-2 shadow-lift">
      <p className="mb-1 text-[10px] font-semibold text-ink-900">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="text-[11px] text-mist">
          <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full" style={{ background: entry.color }} />
          {entry.name}: <span className="font-semibold text-ink-800">{money ? formatCurrency(entry.value, true) : formatNumber(entry.value)}</span>
        </p>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const { db, mode, isSupabaseConfigured } = useData()
  const { customerName, warehouseName, warehouseById, productById, itemsByOrder, productName } = useLookups()
  const navigate = useNavigate()

  const metrics = useMemo(() => {
    const orders = db.customer_order || []
    const orderItems = db.order_item || []
    const payments = db.payment || []
    const inventory = db.inventory || []
    const products = db.product || []
    const openStatuses = ['Pending', 'Confirmed', 'Processing', 'Packed']
    const openOrders = orders.filter((order) => openStatuses.includes(order.order_status))
    const shipments = db.shipment || []
    const activeShipments = shipments.filter((shipment) => !['Delivered', 'Returned'].includes(shipment.shipment_status))

    const revenue = payments.reduce((sum, payment) => sum + numeric(payment.amount), 0)
    const stockValue = inventory.reduce((sum, row) => {
      const product = productById.get(String(row.product_id))
      return sum + numeric(row.quantity_on_hand) * numeric(product?.unit_price)
    }, 0)
    const units = inventory.reduce((sum, row) => sum + numeric(row.quantity_on_hand), 0)

    const lowStock = inventory
      .map((row) => {
        const product = productById.get(String(row.product_id))
        return {
          ...row,
          product,
          status: stockStatus(row.quantity_on_hand, product?.reorder_level),
          warehouse: warehouseById.get(String(row.warehouse_id)),
        }
      })
      .filter((row) => row.status !== 'In stock')
      .sort((a, b) => Number(a.quantity_on_hand) - Number(b.quantity_on_hand))

    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date()
      date.setDate(1)
      date.setMonth(date.getMonth() - (5 - index))
      return {
        key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
        label: date.toLocaleDateString('en-IN', { month: 'short' }),
        revenue: 0,
        orders: 0,
      }
    })

    orders.forEach((order) => {
      if (order.order_status === 'Cancelled') return
      const date = new Date(order.order_date)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const bucket = months.find((month) => month.key === key)
      if (!bucket) return
      const total = orderItems
        .filter((item) => String(item.order_id) === String(order.order_id))
        .reduce((sum, item) => sum + numeric(item.quantity) * numeric(item.unit_price), 0)
      bucket.revenue += total
      bucket.orders += 1
    })

    const statusMap = orders.reduce((map, order) => {
      map[order.order_status] = (map[order.order_status] || 0) + 1
      return map
    }, {})
    const statusData = Object.entries(statusMap).map(([name, value]) => ({ name, value }))

    const poSpendMap = {}
    ;(db.purchase_order || []).forEach((po) => {
      if (po.po_status === 'Cancelled') return
      const total = (db.po_item || [])
        .filter((item) => String(item.po_id) === String(po.po_id))
        .reduce((sum, item) => sum + numeric(item.quantity) * numeric(item.unit_cost), 0)
      const key = String(po.supplier_id)
      poSpendMap[key] = (poSpendMap[key] || 0) + total
    })
    const supplierSpend = Object.entries(poSpendMap)
      .map(([supplierId, value]) => ({
        name: (db.supplier || []).find((supplier) => String(supplier.supplier_id) === supplierId)?.supplier_name || 'Unknown',
        value,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)

    const warehouseUsage = (db.warehouse || []).map((warehouse) => {
      const used = inventory
        .filter((row) => String(row.warehouse_id) === String(warehouse.warehouse_id))
        .reduce((sum, row) => sum + numeric(row.quantity_on_hand), 0)
      return { ...warehouse, used, utilization: pct(used, warehouse.capacity) }
    })

    const recentOrders = [...orders]
      .sort((a, b) => new Date(b.order_date) - new Date(a.order_date))
      .slice(0, 6)

    const upcomingShipments = [...activeShipments]
      .sort((a, b) => new Date(a.ship_date) - new Date(b.ship_date))
      .slice(0, 4)

    const outOfStock = lowStock.filter((row) => row.status === 'Out of stock').length
    const delivered = orders.filter((order) => order.order_status === 'Delivered').length
    const fulfilment = pct(delivered, orders.filter((order) => order.order_status !== 'Cancelled').length)

    return {
      revenue,
      openOrders,
      stockValue,
      units,
      lowStock,
      months,
      statusData,
      supplierSpend,
      warehouseUsage,
      recentOrders,
      upcomingShipments,
      outOfStock,
      fulfilment,
      activeShipments,
      lowStockProducts: new Set(lowStock.map((row) => row.product_id)).size,
    }
  }, [db, productById, warehouseById])

  const weekGreeting = (() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  })()

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Supply chain control tower"
        title="Command centre"
        description={`${weekGreeting}, Ishita. Here is the current pulse of your supply network.`}
      >
        <div className="hidden rounded-xl border border-line bg-white px-3 py-2 text-right sm:block">
          <p className="mini-label">Today</p>
          <p className="mt-0.5 text-[12px] font-semibold text-ink-800">
            {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
          </p>
        </div>
        <button className="btn-secondary h-9 text-[12px]" onClick={() => navigate('/orders?new=1')}>
          <Plus size={14} /> Create order
        </button>
        <Link to="/purchase-orders" className="btn-primary h-9 text-[12px]">
          <ArrowDownToLine size={14} /> Purchase order
        </Link>
      </PageHeader>

      {mode === 'demo' && (
        <div className="mb-5 flex flex-col gap-3 rounded-xl border border-[#E7D5B1] bg-[#FFF9EB] px-4 py-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2.5">
            <Sparkles size={15} className="text-[#A77822]" />
            <p className="text-[11.5px] text-[#785A22]">
              You are exploring a fully seeded demo workspace. Add your Supabase keys in <code className="rounded bg-white/80 px-1 py-0.5 font-mono text-[10px]">.env</code> to switch to live data.
            </p>
          </div>
          <Link to="/database" className="ml-auto shrink-0 text-[11px] font-semibold text-[#8B651C] underline-offset-2 hover:underline">
            View connection setup →
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={CircleDollarSign}
          label="Collected revenue"
          value={formatCurrency(metrics.revenue, true)}
          detail={`${formatNumber((db.payment || []).length)} payment records`}
          tone="dark"
          chart={
            <div className="flex items-end gap-1">
              {metrics.months.map((month, index) => (
                <span
                  key={month.key}
                  className="flex-1 rounded-sm bg-lime-400/80"
                  style={{ height: `${Math.max(12, (month.revenue / Math.max(...metrics.months.map((m) => m.revenue), 1)) * 28)}px`, opacity: 0.35 + index * 0.11 }}
                />
              ))}
            </div>
          }
        />
        <KpiCard
          icon={ShoppingBag}
          label="Open orders"
          value={formatNumber(metrics.openOrders.length)}
          detail={`${metrics.fulfilment}% historic fulfilment rate`}
          chart={
            <div className="flex items-center gap-1.5">
              <span className="rounded-full bg-[#FFF3D8] px-2 py-1 text-[9px] font-semibold text-[#946714]">
                {metrics.openOrders.filter((order) => order.order_status === 'Processing').length} processing
              </span>
              <span className="rounded-full bg-[#E7F0FE] px-2 py-1 text-[9px] font-semibold text-[#2B5EA8]">
                {metrics.openOrders.filter((order) => order.order_status === 'Packed').length} packed
              </span>
            </div>
          }
        />
        <KpiCard
          icon={Boxes}
          label="Inventory value"
          value={formatCurrency(metrics.stockValue, true)}
          detail={`${formatNumber(metrics.units)} units on hand`}
          chart={
            <div className="flex gap-1">
              {[38, 58, 46, 72, 64, 84].map((value, index) => (
                <span key={index} className="flex-1 rounded-sm bg-ink-600/20" style={{ height: `${value * 0.28}px` }} />
              ))}
            </div>
          }
        />
        <KpiCard
          icon={AlertTriangle}
          label="Reorder alerts"
          value={formatNumber(metrics.lowStock.length)}
          detail={`${metrics.outOfStock} locations out of stock`}
          tone="lime"
          chart={
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/55 px-2 py-1 text-[9px] font-semibold text-ink-800">
                {metrics.lowStockProducts} products affected
              </span>
            </div>
          }
        />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-[1.6fr_1fr]">
        <SectionCard
          title="Order volume"
          subtitle="Revenue booked and orders placed over the last six months"
          action={
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-[10px] text-mist">
                <span className="h-2 w-2 rounded-full bg-ink-900" /> Revenue
              </span>
              <span className="flex items-center gap-1.5 text-[10px] text-mist">
                <span className="h-2 w-2 rounded-full bg-lime-500" /> Orders
              </span>
            </div>
          }
          bodyClassName="px-3 pb-2 pt-4 sm:px-4"
        >
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics.months} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10241C" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="#10241C" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 5" stroke="#E7E9DF" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#8C958E' }} axisLine={false} tickLine={false} dy={8} />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 9, fill: '#8C958E' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => formatCurrency(value, true)}
                />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fill: '#8C958E' }} axisLine={false} tickLine={false} width={26} />
                <Tooltip content={<ChartTooltip money />} cursor={{ stroke: '#C9CEC2', strokeDasharray: '4 4' }} />
                <Area yAxisId="left" type="monotone" dataKey="revenue" name="Revenue" stroke="#10241C" strokeWidth={2.2} fill="url(#revenueFill)" activeDot={{ r: 4, fill: '#10241C' }} isAnimationActive={false} />
                <Area yAxisId="right" type="monotone" dataKey="orders" name="Orders" stroke="#C2F05C" strokeWidth={2} fill="transparent" dot={{ r: 2.5, fill: '#C2F05C', strokeWidth: 0 }} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Order status" subtitle="Current distribution across all orders" bodyClassName="flex flex-col px-5 pb-4 pt-2">
          <div className="relative mx-auto h-[176px] w-full max-w-[270px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={metrics.statusData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={54}
                  outerRadius={78}
                  paddingAngle={2}
                  strokeWidth={0}
                  isAnimationActive={false}
                >
                  {metrics.statusData.map((entry, index) => (
                    <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <p className="font-display text-[24px] font-semibold leading-none text-ink-950">{db.customer_order?.length || 0}</p>
              <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.12em] text-mist">Total orders</p>
            </div>
          </div>
          <div className="mt-auto grid grid-cols-2 gap-x-4 gap-y-2">
            {metrics.statusData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: CHART_COLORS[index % CHART_COLORS.length] }} />
                <span className="truncate text-[10px] text-mist">{entry.name}</span>
                <span className="ml-auto font-mono text-[10px] font-medium text-ink-800">{entry.value}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-[1fr_1fr]">
        <SectionCard
          title="Warehouse utilisation"
          subtitle="Units on hand against configured capacity"
          action={<Link to="/warehouses" className="text-[10.5px] font-semibold text-ink-600 hover:text-ink-900">Manage →</Link>}
          bodyClassName="p-4 space-y-3.5"
        >
          {metrics.warehouseUsage.map((warehouse) => (
            <div key={warehouse.warehouse_id}>
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#F1F3EB] text-ink-600">
                    <WarehouseIcon size={13} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[11.5px] font-semibold text-ink-900">{warehouse.warehouse_name}</p>
                    <p className="text-[9.5px] text-mist">{warehouse.city}</p>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-mono text-[10.5px] font-medium text-ink-800">{warehouse.utilization}%</p>
                  <p className="text-[8.5px] text-mist">{formatNumber(warehouse.used)} / {formatNumber(warehouse.capacity)}</p>
                </div>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[#EEF0E8]">
                <div
                  className={`h-full rounded-full ${warehouse.utilization > 80 ? 'bg-clay' : 'bg-ink-800'}`}
                  style={{ width: `${Math.min(100, warehouse.utilization)}%` }}
                />
              </div>
            </div>
          ))}
        </SectionCard>

        <SectionCard
          title="Reorder watchlist"
          subtitle="Warehouse lines at or below their reorder level"
          action={<Link to="/inventory?filter=low" className="text-[10.5px] font-semibold text-ink-600 hover:text-ink-900">Open inventory →</Link>}
          bodyClassName="divide-y divide-line"
        >
          {metrics.lowStock.length === 0 ? (
            <EmptyState icon={PackageCheck} title="All stock levels are healthy" description="No inventory line has crossed its reorder threshold." />
          ) : (
            metrics.lowStock.slice(0, 5).map((row) => (
              <div key={`${row.warehouse_id}-${row.product_id}`} className="flex items-center gap-3 px-4 py-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#FBF3E2] text-[#A77822]">
                  <AlertTriangle size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11.5px] font-semibold text-ink-900">{row.product?.product_name || productName(row.product_id)}</p>
                  <p className="mt-0.5 truncate text-[9.5px] text-mist">
                    {row.warehouse?.warehouse_name} · reorder at {row.product?.reorder_level}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <StatusBadge status={row.status} />
                  <p className="mt-1 font-mono text-[9px] text-mist">{formatNumber(row.quantity_on_hand)} units</p>
                </div>
              </div>
            ))
          )}
        </SectionCard>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-[1.55fr_1fr]">
        <SectionCard
          title="Recent customer orders"
          subtitle="Latest orders across every warehouse"
          action={<Link to="/orders" className="text-[10.5px] font-semibold text-ink-600 hover:text-ink-900">View all →</Link>}
          bodyClassName="table-shell"
        >
          <table className="data-table min-w-[600px]">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Warehouse</th>
                <th>Date</th>
                <th>Status</th>
                <th className="text-right">Value</th>
              </tr>
            </thead>
            <tbody>
              {metrics.recentOrders.map((order) => (
                <tr key={order.order_id} className="cursor-pointer" onClick={() => navigate(`/orders?view=${order.order_id}`)}>
                  <td><span className="font-mono text-[11px] font-medium text-ink-900">#{order.order_id}</span></td>
                  <td>
                    <p className="text-[11.5px] font-medium text-ink-900">{customerName(order.customer_id)}</p>
                  </td>
                  <td><p className="text-[10.5px] text-mist">{warehouseName(order.warehouse_id)}</p></td>
                  <td><span className="text-[10.5px] text-mist">{formatDate(order.order_date, 'short')}</span></td>
                  <td><StatusBadge status={order.order_status} /></td>
                  <td className="text-right font-mono text-[11px] font-medium text-ink-900">
                    {formatCurrency(orderTotal(order, db.order_item || []), true)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>

        <SectionCard
          title="Inbound supplier spend"
          subtitle="Purchase order value by supplier"
          action={<Link to="/suppliers" className="text-[10.5px] font-semibold text-ink-600 hover:text-ink-900">Suppliers →</Link>}
          bodyClassName="px-3 pb-2 pt-4"
        >
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.supplierSpend} layout="vertical" margin={{ top: 0, right: 14, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 5" stroke="#E7E9DF" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={104}
                  tick={{ fontSize: 9, fill: '#68736C' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => (value.length > 15 ? `${value.slice(0, 14)}…` : value)}
                />
                <Tooltip content={<ChartTooltip money />} cursor={{ fill: '#F5F6F0' }} />
                <Bar dataKey="value" name="Spend" fill="#C2F05C" radius={[0, 4, 4, 0]} barSize={13} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-[1fr_1.55fr]">
        <SectionCard
          title="Active shipments"
          subtitle={`${metrics.activeShipments.length} shipments on the road`}
          action={<Link to="/shipments" className="text-[10.5px] font-semibold text-ink-600 hover:text-ink-900">Track all →</Link>}
          bodyClassName="divide-y divide-line"
        >
          {metrics.upcomingShipments.length === 0 ? (
            <EmptyState icon={Truck} title="Nothing in transit" description="Active shipments will appear here." />
          ) : (
            metrics.upcomingShipments.map((shipment) => (
              <div key={shipment.shipment_id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#E8F2EE] text-ink-600">
                  <Truck size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11.5px] font-semibold text-ink-900">Order #{shipment.order_id}</p>
                  <p className="mt-0.5 text-[9.5px] text-mist">Ships {formatDate(shipment.ship_date, 'short')}</p>
                </div>
                <StatusBadge status={shipment.shipment_status} />
              </div>
            ))
          )}
        </SectionCard>

        <SectionCard
          title="Procurement pipeline"
          subtitle="Open purchase orders awaiting completion"
          action={<Link to="/purchase-orders" className="text-[10.5px] font-semibold text-ink-600 hover:text-ink-900">Open procurement →</Link>}
          bodyClassName="table-shell"
        >
          <table className="data-table min-w-[520px]">
            <thead>
              <tr>
                <th>PO</th>
                <th>Supplier</th>
                <th>Warehouse</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {(db.purchase_order || [])
                .filter((po) => ['Draft', 'Pending', 'Approved'].includes(po.po_status))
                .slice(0, 4)
                .map((po) => {
                  const supplier = (db.supplier || []).find((row) => String(row.supplier_id) === String(po.supplier_id))
                  return (
                    <tr key={po.po_id} className="cursor-pointer" onClick={() => navigate('/purchase-orders')}>
                      <td><span className="font-mono text-[11px] font-medium text-ink-900">#{po.po_id}</span></td>
                      <td><p className="max-w-[150px] truncate text-[11px] text-ink-800">{supplier?.supplier_name || '—'}</p></td>
                      <td><p className="max-w-[130px] truncate text-[10.5px] text-mist">{warehouseName(po.warehouse_id)}</p></td>
                      <td><StatusBadge status={po.po_status} /></td>
                      <td><span className="text-[10.5px] text-mist">{formatDate(po.po_date, 'short')}</span></td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </SectionCard>
      </div>
    </div>
  )
}
