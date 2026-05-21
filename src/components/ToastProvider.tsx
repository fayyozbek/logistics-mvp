import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

type ToastItem = {
  id: string;
  type: ToastType;
  message: string;
};

export type ToastContextValue = {
  showToast: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const AUTO_DISMISS_MS = 4000;

const toastTone: Record<ToastType, { bg: string; border: string; color: string }> = {
  success: { bg: '#F0FDF4', border: '#BBF7D0', color: '#15803D' },
  error: { bg: '#FEF2F2', border: '#FECACA', color: '#B91C1C' },
  info: { bg: '#EFF6FF', border: '#BFDBFE', color: '#1D4ED8' },
};

function ToastItemView({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const tone = toastTone[toast.type];

  useEffect(() => {
    const timer = window.setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      className="toast-item"
      role="status"
      style={{
        background: tone.bg,
        border: `1px solid ${tone.border}`,
        color: tone.color,
      }}
    >
      <span className="toast-item__message">{toast.message}</span>
      <button
        type="button"
        className="toast-item__close"
        onClick={onDismiss}
        aria-label="Закрыть уведомление"
        style={{ color: tone.color }}
      >
        <X size={16} />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const trimmed = message.trim();
    if (!trimmed) return;

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    setToasts((current) => [...current, { id, type, message: trimmed }]);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-container" aria-live="polite" aria-relevant="additions">
        {toasts.map((toast) => (
          <ToastItemView key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

export function toastErrors(showToast: ToastContextValue['showToast'], errors: string[]) {
  errors.forEach((message) => showToast(message, 'error'));
}
