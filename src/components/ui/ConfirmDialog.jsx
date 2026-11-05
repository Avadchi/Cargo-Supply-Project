import { Modal } from './Modal'
import { Spinner } from './Bits'
import { AlertTriangle } from 'lucide-react'

export function ConfirmDialog({ open, onClose, onConfirm, title, description, confirmLabel = 'Delete', loading, danger = true }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title || 'Delete this record?'}
      size="sm"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button className={danger ? 'btn-danger' : 'btn-primary'} onClick={onConfirm} disabled={loading}>
            {loading && <Spinner />}
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="flex gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FBE7E0] text-[#B84A2C]">
          <AlertTriangle size={18} />
        </div>
        <div className="pt-1">
          <p className="text-[13px] leading-6 text-ink-800">
            {description || 'This action cannot be undone. Related records may prevent deletion.'}
          </p>
        </div>
      </div>
    </Modal>
  )
}
