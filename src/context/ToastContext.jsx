import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'

const ToastContext = createContext(null)

let nextToastId = 1

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts((previous) => previous.filter((toast) => toast.id !== id))
  }, [])

  const push = useCallback(
    (message, type = 'success') => {
      const id = nextToastId++
      setToasts((previous) => [...previous, { id, message, type }])
      window.setTimeout(() => dismiss(id), 4200)
    },
    [dismiss],
  )

  const toast = useMemo(
    () => ({
      success: (message) => push(message, 'success'),
      error: (message) => push(message, 'error'),
      info: (message) => push(message, 'info'),
    }),
    [push],
  )

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:items-end sm:pr-6">
        {toasts.map((item) => (
          <div
            key={item.id}
            className="pointer-events-auto flex w-full max-w-sm animate-fadeUp items-start gap-3 rounded-xl border border-line bg-white px-4 py-3 shadow-lift"
          >
            <div
              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                item.type === 'error'
                  ? 'bg-[#FBE7E0] text-[#B84A2C]'
                  : item.type === 'info'
                    ? 'bg-[#E7F0FE] text-[#2B5EA8]'
                    : 'bg-[#E2F7D5] text-[#39741D]'
              }`}
            >
              {item.type === 'error' ? (
                <AlertTriangle size={13} />
              ) : item.type === 'info' ? (
                <Info size={13} />
              ) : (
                <CheckCircle2 size={13} />
              )}
            </div>
            <p className="flex-1 pt-0.5 text-[12.5px] font-medium leading-5 text-ink-800">{item.message}</p>
            <button onClick={() => dismiss(item.id)} className="icon-btn -mr-1 -mt-0.5 h-6 w-6" aria-label="Dismiss">
              <X size={13} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
