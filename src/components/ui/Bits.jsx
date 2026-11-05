import { Search } from 'lucide-react'
import { cx } from '../../lib/utils'

export function PageHeader({ eyebrow, title, description, children, className }) {
  return (
    <div className={cx('mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="max-w-2xl">
        {eyebrow && <p className="kicker mb-2">{eyebrow}</p>}
        <h1 className="font-display text-[27px] font-semibold leading-tight tracking-[-0.035em] text-ink-950 sm:text-[31px]">
          {title}
        </h1>
        {description && <p className="mt-1.5 max-w-xl text-[13px] leading-6 text-mist">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  )
}

export function SearchInput({ value, onChange, placeholder = 'Search…', className }) {
  return (
    <div className={cx('relative', className)}>
      <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mist" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="input h-9 pl-9 text-[12.5px]"
      />
    </div>
  )
}

export function Avatar({ name, size = 'md', tone = 'green' }) {
  const letters = (name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
  const sizes = { xs: 'h-6 w-6 text-[9px]', sm: 'h-8 w-8 text-[10px]', md: 'h-9 w-9 text-[11px]', lg: 'h-12 w-12 text-[14px]' }
  const tones = {
    green: 'bg-[#E4EFE5] text-ink-700',
    lime: 'bg-lime-300 text-ink-800',
    clay: 'bg-[#F8E3D8] text-[#A95735]',
    blue: 'bg-[#E4EDF8] text-[#37618F]',
    violet: 'bg-[#ECE8F8] text-[#63548E]',
  }
  return (
    <span className={cx('inline-flex shrink-0 items-center justify-center rounded-full font-semibold', sizes[size], tones[tone])}>
      {letters}
    </span>
  )
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      {Icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-line bg-paper text-mist">
          <Icon size={21} strokeWidth={1.6} />
        </div>
      )}
      <h3 className="font-display text-[15px] font-semibold text-ink-900">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-[12.5px] leading-5 text-mist">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function SectionCard({ title, subtitle, action, children, className, bodyClassName }) {
  return (
    <section className={cx('panel overflow-hidden', className)}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-3.5">
          <div>
            <h2 className="section-title">{title}</h2>
            {subtitle && <p className="mt-0.5 text-[11.5px] text-mist">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  )
}

export function DetailRow({ label, children, className }) {
  return (
    <div className={cx('flex items-start justify-between gap-6 border-b border-line py-2.5 last:border-0', className)}>
      <dt className="text-[12px] text-mist">{label}</dt>
      <dd className="text-right text-[12.5px] font-medium text-ink-900">{children || '—'}</dd>
    </div>
  )
}

export function Spinner({ className }) {
  return (
    <span
      className={cx('inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent', className)}
      aria-hidden="true"
    />
  )
}
