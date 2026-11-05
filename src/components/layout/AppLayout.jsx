import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Boxes,
  Building2,
  ChevronDown,
  CircleHelp,
  ClipboardList,
  CreditCard,
  Database,
  LayoutDashboard,
  Menu,
  Package,
  Search,
  Settings,
  Ship,
  ShoppingBag,
  Tags,
  Truck,
  UserRound,
  Users,
  Warehouse,
  X,
} from 'lucide-react'
import { useData } from '../../context/DataContext'
import { cx } from '../../lib/utils'
import { Avatar } from '../ui/Bits'
import { CommandPalette } from '../CommandPalette'

const navigation = [
  {
    label: 'Overview',
    items: [{ to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true }],
  },
  {
    label: 'Operations',
    items: [
      { to: '/orders', label: 'Customer orders', icon: ShoppingBag },
      { to: '/inventory', label: 'Inventory', icon: Boxes },
      { to: '/purchase-orders', label: 'Purchase orders', icon: ClipboardList },
      { to: '/payments', label: 'Payments', icon: CreditCard },
      { to: '/shipments', label: 'Shipments', icon: Ship },
    ],
  },
  {
    label: 'Supply network',
    items: [
      { to: '/suppliers', label: 'Suppliers', icon: Building2 },
      { to: '/products', label: 'Products', icon: Package },
      { to: '/categories', label: 'Categories', icon: Tags },
      { to: '/warehouses', label: 'Warehouses', icon: Warehouse },
      { to: '/employees', label: 'Employees', icon: Users },
      { to: '/customers', label: 'Customers', icon: UserRound },
      { to: '/transporters', label: 'Transporters', icon: Truck },
    ],
  },
  {
    label: 'System',
    items: [{ to: '/database', label: 'Database', icon: Database }],
  },
]

const pageMeta = {
  '/': ['Dashboard', 'Command centre'],
  '/orders': ['Customer orders', 'Operations'],
  '/inventory': ['Inventory', 'Operations'],
  '/purchase-orders': ['Purchase orders', 'Procurement'],
  '/payments': ['Payments', 'Finance'],
  '/shipments': ['Shipments', 'Logistics'],
  '/suppliers': ['Suppliers', 'Supply network'],
  '/products': ['Products', 'Catalogue'],
  '/categories': ['Categories', 'Catalogue'],
  '/warehouses': ['Warehouses', 'Network'],
  '/employees': ['Employees', 'People'],
  '/customers': ['Customers', 'Relationships'],
  '/transporters': ['Transporters', 'Logistics'],
  '/database': ['Database', 'System'],
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-lime-500 text-ink-950 shadow-[0_0_0_4px_rgba(212,250,124,0.08)]">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7">
          <path d="M4 8l8-4 8 4v8l-8 4-8-4V8z" strokeLinejoin="round" />
          <path d="M12 4v8m0 0l8-4m-8 4L4 8m8 12v-8" strokeLinejoin="round" />
        </svg>
      </div>
      <div>
        <p className="font-display text-[17px] font-bold leading-none tracking-[-0.03em] text-white">kargo</p>
        <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.22em] text-white/35">Supply chain OS</p>
      </div>
    </div>
  )
}

function SidebarContent({ onNavigate }) {
  const { mode, db, isSupabaseConfigured } = useData()
  const live = mode === 'supabase' && isSupabaseConfigured
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-[72px] shrink-0 items-center justify-between px-5">
        <Brand />
        <button className="icon-btn text-white/40 hover:bg-white/10 hover:text-white lg:hidden" onClick={onNavigate} aria-label="Close navigation">
          <X size={18} />
        </button>
      </div>

      <div className="mx-3 mb-4 mt-1 rounded-xl border border-white/[0.07] bg-white/[0.035] px-3 py-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium text-white/45">Workspace</span>
          <ChevronDown size={12} className="text-white/30" />
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-lime-500/15 font-display text-[9px] font-bold text-lime-400">
            K
          </span>
          <span className="text-[12px] font-semibold text-white/90">Kargo India</span>
          <span className={cx('ml-auto h-1.5 w-1.5 rounded-full', live ? 'bg-lime-400' : 'bg-[#E9B35E]')} />
        </div>
      </div>

      <nav className="dark-scroll min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        {navigation.map((group) => (
          <div key={group.label} className="mb-4">
            <p className="mb-1.5 px-3 font-mono text-[8px] font-medium uppercase tracking-[0.18em] text-white/25">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={onNavigate}
                    className={({ isActive }) => cx('nav-link', isActive && 'nav-link-active')}
                  >
                    <Icon size={15} strokeWidth={1.8} className="shrink-0" />
                    <span className="truncate">{item.label}</span>
                    {item.to === '/inventory' && (
                      <span className="ml-auto font-mono text-[9px] text-white/25">{db.inventory?.length || 0}</span>
                    )}
                    {item.to === '/orders' && (
                      <span className="ml-auto rounded-full bg-lime-500/15 px-1.5 py-0.5 font-mono text-[9px] text-lime-400">
                        {db.customer_order?.length || 0}
                      </span>
                    )}
                  </NavLink>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-white/[0.07] p-3">
        <div className="rounded-xl bg-white/[0.04] p-3">
          <div className="flex items-center gap-2">
            <span className={cx('h-2 w-2 rounded-full', live ? 'bg-lime-400' : 'bg-[#E9B35E]')} />
            <p className="text-[11px] font-semibold text-white/85">{live ? 'Supabase connected' : 'Demo workspace'}</p>
          </div>
          <p className="mt-1.5 text-[10px] leading-4 text-white/35">
            {live ? 'Reading and writing live data.' : 'Add your Supabase keys in .env to go live.'}
          </p>
          <NavLink
            to="/database"
            onClick={onNavigate}
            className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-lime-400 transition hover:text-lime-300"
          >
            {live ? 'Connection details' : 'Connect database'} <span aria-hidden>→</span>
          </NavLink>
        </div>
        <div className="mt-3 flex items-center gap-2.5 px-1 py-1">
          <Avatar name="Ishita Jain" size="sm" tone="lime" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-semibold text-white/85">Ishita Jain</p>
            <p className="truncate text-[9.5px] text-white/35">Data analyst</p>
          </div>
          <Settings size={14} className="text-white/30" />
        </div>
      </div>
    </div>
  )
}

function Topbar({ onMenu, onSearch }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { mode, isSupabaseConfigured } = useData()
  const [title, section] = pageMeta[pathname] || ['Kargo', 'Workspace']
  const live = mode === 'supabase' && isSupabaseConfigured

  return (
    <header className="sticky top-0 z-30 border-b border-line/80 bg-canvas/90 backdrop-blur-xl">
      <div className="flex h-[62px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button className="icon-btn -ml-1 lg:hidden" onClick={onMenu} aria-label="Open navigation">
          <Menu size={19} />
        </button>
        <div className="hidden items-center gap-2 text-[11px] sm:flex">
          <span className="text-mist">{section}</span>
          <span className="text-line">/</span>
          <span className="font-medium text-ink-800">{title}</span>
        </div>
        <button
          onClick={onSearch}
          className="ml-auto hidden h-8 w-full max-w-[260px] items-center gap-2 rounded-lg border border-line bg-white/70 px-2.5 text-left text-[11.5px] text-mist/80 transition hover:border-ink-600/30 hover:bg-white md:flex"
          aria-label="Search workspace"
        >
          <Search size={14} />
          <span>Search workspace…</span>
          <span className="ml-auto rounded border border-line bg-paper px-1.5 py-0.5 font-mono text-[8px] text-mist">⌘ K</span>
        </button>
        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <div className="hidden items-center gap-1.5 rounded-full border border-line bg-white/70 px-2.5 py-1.5 sm:flex">
            <span className={cx('h-1.5 w-1.5 rounded-full', live ? 'bg-[#66A53A]' : 'bg-[#D49A2A]')} />
            <span className="text-[10px] font-medium text-ink-700">{live ? 'Live' : 'Demo'}</span>
          </div>
          <button
            className="icon-btn hidden sm:inline-flex"
            title="Help & documentation"
            onClick={() => navigate('/database')}
          >
            <CircleHelp size={17} strokeWidth={1.7} />
          </button>
          <button className="btn-accent h-8 px-3 text-[11.5px]" onClick={() => navigate('/orders?new=1')}>
            <ShoppingBag size={13} />
            New order
          </button>
        </div>
      </div>
    </header>
  )
}

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => {
    setMobileOpen(false)
    window.scrollTo({ top: 0 })
  }, [pathname])

  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearchOpen((previous) => !previous)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <div className="min-h-screen bg-canvas">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] bg-ink-950 lg:block">
        <SidebarContent />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-ink-950/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />
          <aside className="absolute inset-y-0 left-0 w-[270px] animate-slideIn bg-ink-950">
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-[248px]">
        <Topbar onMenu={() => setMobileOpen(true)} onSearch={() => setSearchOpen(true)} />
        <main>
          <Outlet />
        </main>
      </div>
      <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  )
}
