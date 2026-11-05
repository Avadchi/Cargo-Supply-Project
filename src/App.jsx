import { Component } from 'react'
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, Database, RefreshCw, Sparkles } from 'lucide-react'
import { DataProvider, useData } from './context/DataContext'
import { ToastProvider } from './context/ToastContext'
import { AppLayout } from './components/layout/AppLayout'
import Dashboard from './pages/Dashboard'
import Suppliers from './pages/Suppliers'
import Products from './pages/Products'
import Categories from './pages/Categories'
import Warehouses from './pages/Warehouses'
import Employees from './pages/Employees'
import Inventory from './pages/Inventory'
import PurchaseOrders from './pages/PurchaseOrders'
import Customers from './pages/Customers'
import Orders from './pages/Orders'
import Payments from './pages/Payments'
import Shipments from './pages/Shipments'
import Transporters from './pages/Transporters'
import DatabasePage from './pages/Database'

function BrandMark({ dark = false }) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-lime-500 text-ink-950">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.7">
          <path d="M4 8l8-4 8 4v8l-8 4-8-4V8z" strokeLinejoin="round" />
          <path d="M12 4v8m0 0l8-4m-8 4L4 8m8 12v-8" strokeLinejoin="round" />
        </svg>
      </div>
      <div>
        <p className={`font-display text-[21px] font-bold leading-none tracking-[-0.04em] ${dark ? 'text-white' : 'text-ink-950'}`}>kargo</p>
        <p className={`mt-1 font-mono text-[8px] uppercase tracking-[0.22em] ${dark ? 'text-white/35' : 'text-mist'}`}>Supply chain OS</p>
      </div>
    </div>
  )
}

function BootScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-6">
      <div className="w-full max-w-sm text-center">
        <div className="flex justify-center"><BrandMark /></div>
        <div className="mx-auto mt-8 h-1 w-48 overflow-hidden rounded-full bg-line">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-ink-800" />
        </div>
        <p className="mt-4 text-[11px] text-mist">Loading your supply network…</p>
      </div>
    </div>
  )
}

function ConnectionFailure() {
  const { error, refresh, loadDemo } = useData()
  return (
    <div className="grid min-h-screen bg-canvas lg:grid-cols-[1.1fr_1fr]">
      <div className="relative flex flex-col justify-between overflow-hidden bg-ink-950 p-8 text-white sm:p-12">
        <div className="hero-noise pointer-events-none absolute inset-0 opacity-40" />
        <div className="relative"><BrandMark dark /></div>
        <div className="relative max-w-lg">
          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-lime-400">Connection interrupted</p>
          <h1 className="mt-4 font-display text-[36px] font-semibold leading-[1.05] tracking-[-0.045em] sm:text-[46px]">
            The control tower can’t reach your database.
          </h1>
          <p className="mt-4 max-w-md text-[12.5px] leading-6 text-white/45">
            The credentials were found, but one or more Supabase tables could not be read. Check the table names, column permissions and Row Level Security policies.
          </p>
          <div className="mt-6 grid grid-cols-3 gap-3">
            {['16 tables', 'public schema', 'anon access'].map((item) => (
              <div key={item} className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-center font-mono text-[9px] text-white/40">{item}</div>
            ))}
          </div>
        </div>
        <p className="relative text-[9px] text-white/25">Kargo · Supply chain control tower</p>
      </div>
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FBE7E0] text-[#B84A2C]"><AlertTriangle size={18} /></div>
          <h2 className="mt-4 font-display text-[20px] font-semibold text-ink-950">Supabase connection failed</h2>
          <p className="mt-1 text-[12px] leading-5 text-mist">The app stopped short of showing partial data so you can fix the issue safely.</p>
          <pre className="mt-4 max-h-32 overflow-auto rounded-xl border border-[#E8C8BC] bg-[#FDF4F0] p-3 font-mono text-[9.5px] leading-4 text-[#8A4A35]">{error}</pre>
          <div className="mt-4 rounded-xl border border-line bg-white p-4">
            <p className="text-[11px] font-semibold text-ink-900">Quick checks</p>
            <ul className="mt-2 space-y-1.5 text-[10.5px] leading-4 text-mist">
              <li>• Table names match the supplied ER diagram exactly.</li>
              <li>• Row Level Security permits the anon role to select these tables.</li>
              <li>• VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are from the same project.</li>
            </ul>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <button className="btn-primary" onClick={refresh}><RefreshCw size={14} /> Try again</button>
            <button className="btn-secondary" onClick={loadDemo}><Sparkles size={14} /> Continue with demo</button>
          </div>
          <Link to="/database" className="mt-3 inline-flex items-center gap-1 text-[10.5px] font-semibold text-ink-600 hover:text-ink-900" onClick={(event) => { event.preventDefault(); loadDemo() }}>
            <Database size={12} /> View database setup after switching to demo
          </Link>
        </div>
      </div>
    </div>
  )
}

function NotFound() {
  return (
    <div className="page-shell flex min-h-[70vh] flex-col items-center justify-center text-center">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-mist">404 / page not found</p>
      <h1 className="mt-3 font-display text-[40px] font-semibold tracking-[-0.04em] text-ink-950">Wrong turn on the route.</h1>
      <p className="mt-2 max-w-sm text-[12.5px] leading-6 text-mist">This page isn’t part of the supply chain workspace. Head back to the control tower.</p>
      <Link to="/" className="btn-primary mt-5"><ArrowLeft size={14} /> Back to dashboard</Link>
    </div>
  )
}

function AppContent() {
  const { loading, error, isSupabaseConfigured } = useData()
  if (loading) return <BootScreen />
  if (error && isSupabaseConfigured) return <ConnectionFailure />
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="suppliers" element={<Suppliers />} />
        <Route path="products" element={<Products />} />
        <Route path="categories" element={<Categories />} />
        <Route path="warehouses" element={<Warehouses />} />
        <Route path="employees" element={<Employees />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="purchase-orders" element={<PurchaseOrders />} />
        <Route path="customers" element={<Customers />} />
        <Route path="orders" element={<Orders />} />
        <Route path="payments" element={<Payments />} />
        <Route path="shipments" element={<Shipments />} />
        <Route path="transporters" element={<Transporters />} />
        <Route path="database" element={<DatabasePage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || 'Unexpected interface error' }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-canvas px-6 text-center">
          <div className="max-w-md">
            <BrandMark />
            <h1 className="mt-6 font-display text-[24px] font-semibold text-ink-950">Something went off-route.</h1>
            <p className="mt-2 text-[12px] leading-5 text-mist">{this.state.message}</p>
            <button className="btn-primary mt-5" onClick={() => window.location.reload()}>Reload workspace</button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <DataProvider>
          <ToastProvider>
            <AppContent />
          </ToastProvider>
        </DataProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
