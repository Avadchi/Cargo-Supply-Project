export function cx(...classes) {
  return classes.filter(Boolean).join(' ')
}

export function formatCurrency(value, compact = false) {
  const amount = Number(value || 0)
  if (compact) {
    if (Math.abs(amount) >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`
    if (Math.abs(amount) >= 100000) return `₹${(amount / 100000).toFixed(2)}L`
    if (Math.abs(amount) >= 1000) return `₹${(amount / 1000).toFixed(1)}k`
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatNumber(value) {
  return new Intl.NumberFormat('en-IN').format(Number(value || 0))
}

export function formatDate(value, style = 'medium') {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  if (style === 'short') {
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
  }
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatDateTime(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export function nowISO() {
  return new Date().toISOString()
}

export function daysAgo(days) {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString().slice(0, 10)
}

export function initials(first = '', last = '') {
  return `${first?.[0] || ''}${last?.[0] || ''}`.toUpperCase() || '?'
}

export function fullName(person, firstKey = 'first_name', lastKey = 'last_name') {
  if (!person) return '—'
  return `${person[firstKey] || ''} ${person[lastKey] || ''}`.trim() || '—'
}

export function pct(part, whole) {
  if (!whole) return 0
  return Math.round((Number(part || 0) / Number(whole)) * 100)
}

export function numeric(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function sortBy(array, key, direction = 'asc') {
  return [...array].sort((a, b) => {
    const av = a[key]
    const bv = b[key]
    if (typeof av === 'number' && typeof bv === 'number') {
      return direction === 'asc' ? av - bv : bv - av
    }
    return direction === 'asc'
      ? String(av ?? '').localeCompare(String(bv ?? ''))
      : String(bv ?? '').localeCompare(String(av ?? ''))
  })
}

export function stockStatus(quantity, reorderLevel) {
  const qty = numeric(quantity)
  const level = numeric(reorderLevel)
  if (qty <= 0) return 'Out of stock'
  if (qty <= level) return 'Low'
  return 'In stock'
}

export function orderTotal(order, items) {
  return items
    .filter((item) => Number(item.order_id) === Number(order.order_id))
    .reduce((sum, item) => sum + numeric(item.quantity) * numeric(item.unit_price), 0)
}

export function poTotal(po, items) {
  return items
    .filter((item) => Number(item.po_id) === Number(po.po_id))
    .reduce((sum, item) => sum + numeric(item.quantity) * numeric(item.unit_cost), 0)
}

export function downloadCSV(filename, rows, columns) {
  const header = columns.map((column) => `"${column.label}"`).join(',')
  const body = rows
    .map((row) =>
      columns
        .map((column) => {
          const value = typeof column.value === 'function' ? column.value(row) : row[column.value]
          return `"${String(value ?? '').replaceAll('"', '""')}"`
        })
        .join(','),
    )
    .join('\n')
  const blob = new Blob([`${header}\n${body}`], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}

// A date that is safe to render in <input type="date">
export function toDateInput(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

export function addDays(value, days) {
  const date = value ? new Date(value) : new Date()
  date.setDate(date.getDate() + Number(days))
  return date.toISOString().slice(0, 10)
}
