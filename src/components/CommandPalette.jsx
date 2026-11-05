import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Boxes,
  Building2,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  Package,
  Search,
  Ship,
  ShoppingBag,
  Tags,
  Truck,
  UserRound,
  Users,
  Warehouse,
} from 'lucide-react'
import { useData } from '../context/DataContext'
import { useLookups } from '../hooks/useLookups'
import { fullName } from '../lib/utils'
import { Modal } from './ui/Modal'

const pages = [
  { label: 'Dashboard', to: '/', icon: LayoutDashboard },
  { label: 'Customer orders', to: '/orders', icon: ShoppingBag },
  { label: 'Inventory', to: '/inventory', icon: Boxes },
  { label: 'Purchase orders', to: '/purchase-orders', icon: ClipboardList },
  { label: 'Payments', to: '/payments', icon: CreditCard },
  { label: 'Shipments', to: '/shipments', icon: Ship },
  { label: 'Suppliers', to: '/suppliers', icon: Building2 },
  { label: 'Products', to: '/products', icon: Package },
  { label: 'Categories', to: '/categories', icon: Tags },
  { label: 'Warehouses', to: '/warehouses', icon: Warehouse },
  { label: 'Employees', to: '/employees', icon: Users },
  { label: 'Customers', to: '/customers', icon: UserRound },
  { label: 'Transporters', to: '/transporters', icon: Truck },
]

export function CommandPalette({ open, onClose }) {
  const { db } = useData()
  const { customerById } = useLookups()
  const [query, setQuery] = useState('')
  const inputRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (open) {
      setQuery('')
      window.setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  const results = useMemo(() => {
    const term = query.trim().toLowerCase()
    const nav = pages.filter((page) => !term || page.label.toLowerCase().includes(term)).slice(0, 6)
    if (!term) return { nav, records: [] }
    const records = []
    ;(db.customer_order || [])
      .filter((order) => String(order.order_id).includes(term) || fullName(customerById.get(String(order.customer_id))).toLowerCase().includes(term))
      .slice(0, 4)
      .forEach((order) => records.push({ group: 'Orders', label: `Order #${order.order_id}`, detail: fullName(customerById.get(String(order.customer_id))), to: `/orders?view=${order.order_id}`, icon: ShoppingBag }))
    ;(db.product || [])
      .filter((product) => product.product_name.toLowerCase().includes(term) || String(product.product_id).includes(term))
      .slice(0, 4)
      .forEach((product) => records.push({ group: 'Products', label: product.product_name, detail: `PRD-${product.product_id}`, to: '/products', icon: Package }))
    ;(db.customer || [])
      .filter((customer) => fullName(customer).toLowerCase().includes(term) || customer.email?.toLowerCase().includes(term))
      .slice(0, 3)
      .forEach((customer) => records.push({ group: 'Customers', label: fullName(customer), detail: customer.city, to: '/customers', icon: UserRound }))
    ;(db.supplier || [])
      .filter((supplier) => supplier.supplier_name.toLowerCase().includes(term) || supplier.email?.toLowerCase().includes(term))
      .slice(0, 3)
      .forEach((supplier) => records.push({ group: 'Suppliers', label: supplier.supplier_name, detail: supplier.city, to: '/suppliers', icon: Building2 }))
    ;(db.warehouse || [])
      .filter((warehouse) => warehouse.warehouse_name.toLowerCase().includes(term) || warehouse.city?.toLowerCase().includes(term))
      .slice(0, 2)
      .forEach((warehouse) => records.push({ group: 'Warehouses', label: warehouse.warehouse_name, detail: warehouse.city, to: '/warehouses', icon: Warehouse }))
    return { nav, records }
  }, [query, db, customerById])

  const go = (to) => {
    onClose()
    navigate(to)
  }

  const total = results.nav.length + results.records.length

  return (
    <Modal open={open} onClose={onClose} title="Search workspace" subtitle="Jump to a module or find an order, product, customer or supplier." size="md">
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-mist" />
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Type to search…"
          className="input h-11 pl-10 text-[13px]"
        />
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded border border-line bg-paper px-1.5 py-0.5 font-mono text-[8px] text-mist">ESC</kbd>
      </div>

      <div className="mt-4 max-h-[50vh] overflow-y-auto">
        {total === 0 ? (
          <div className="px-3 py-10 text-center">
            <p className="text-[12px] font-medium text-ink-800">No results for “{query}”</p>
            <p className="mt-1 text-[10.5px] text-mist">Try a customer name, order number or product keyword.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {results.records.length > 0 && (
              <div>
                <p className="kicker mb-1.5 px-2">Records</p>
                <div className="space-y-0.5">
                  {results.records.map((record, index) => {
                    const Icon = record.icon
                    return (
                      <button key={`${record.group}-${index}`} onClick={() => go(record.to)} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-[#F7F8F2]">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F1F3EB] text-ink-600"><Icon size={13} /></span>
                        <div className="min-w-0 flex-1"><p className="truncate text-[11.5px] font-medium text-ink-900">{record.label}</p><p className="truncate text-[9.5px] text-mist">{record.group} · {record.detail}</p></div>
                        <span className="font-mono text-[8px] uppercase tracking-wider text-mist">open</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
            {results.nav.length > 0 && (
              <div>
                <p className="kicker mb-1.5 px-2">Navigate</p>
                <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
                  {results.nav.map((page) => {
                    const Icon = page.icon
                    return (
                      <button key={page.to} onClick={() => go(page.to)} className="flex items-center gap-2 rounded-lg border border-line bg-paper px-2.5 py-2 text-left transition hover:border-ink-600/30 hover:bg-white">
                        <Icon size={13} className="text-mist" />
                        <span className="truncate text-[10.5px] font-medium text-ink-800">{page.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="mt-4 flex items-center gap-3 border-t border-line pt-3 text-[9px] text-mist">
        <span><kbd className="rounded border border-line bg-paper px-1 py-0.5 font-mono text-[8px]">⌘ K</kbd> open</span>
        <span><kbd className="rounded border border-line bg-paper px-1 py-0.5 font-mono text-[8px]">ESC</kbd> close</span>
        <span className="ml-auto">Searches live data across the workspace</span>
      </div>
    </Modal>
  )
}
