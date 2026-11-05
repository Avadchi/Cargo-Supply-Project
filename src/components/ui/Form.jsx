import { cx } from '../../lib/utils'

export function Field({ label, hint, error, required, children, className }) {
  return (
    <div className={className}>
      {label && (
        <label className="field-label">
          {label}
          {required && <span className="ml-1 text-clay">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="mt-1 text-[11px] font-medium text-[#B84A2C]">{error}</p>
      ) : (
        hint && <p className="mt-1 text-[10.5px] leading-4 text-mist">{hint}</p>
      )}
    </div>
  )
}

export function TextInput({ className, ...props }) {
  return <input className={cx('input', className)} {...props} />
}

export function SelectInput({ options = [], placeholder, className, children, ...props }) {
  return (
    <select className={cx('select', className)} {...props}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((option) =>
        typeof option === 'string' ? (
          <option key={option} value={option}>
            {option}
          </option>
        ) : (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ),
      )}
      {children}
    </select>
  )
}

export function TextArea({ className, ...props }) {
  return <textarea className={cx('textarea', className)} {...props} />
}

export function FormGrid({ children, className }) {
  return <div className={cx('grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2', className)}>{children}</div>
}

export function FormSection({ title, description, children, className }) {
  return (
    <div className={cx('', className)}>
      {(title || description) && (
        <div className="mb-3 border-b border-line pb-2.5">
          <h3 className="font-display text-[13px] font-semibold text-ink-950">{title}</h3>
          {description && <p className="mt-0.5 text-[10.5px] text-mist">{description}</p>}
        </div>
      )}
      {children}
    </div>
  )
}
