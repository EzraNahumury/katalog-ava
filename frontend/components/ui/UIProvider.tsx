'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

// ============================================================
// Types
// ============================================================

type ConfirmOptions = {
  title: string;
  message?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary';
};

type ToastKind = 'success' | 'error' | 'info';

type Toast = {
  id: number;
  kind: ToastKind;
  title: string;
  message?: string;
  duration: number;
  leaving?: boolean;
};

type UIContextValue = {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
  toast: {
    success: (title: string, message?: string) => void;
    error: (title: string, message?: string) => void;
    info: (title: string, message?: string) => void;
  };
};

const UIContext = createContext<UIContextValue | null>(null);

// ============================================================
// Hook
// ============================================================

export function useUI(): UIContextValue {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI must be used within <UIProvider>');
  return ctx;
}
export const useConfirm = () => useUI().confirm;
export const useToast = () => useUI().toast;

// ============================================================
// Icons
// ============================================================

function IconWarning() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}
function IconInfo() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}
function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
function IconX() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
}

// ============================================================
// Provider
// ============================================================

type ConfirmState = ConfirmOptions & {
  resolve: (v: boolean) => void;
};

export function UIProvider({ children }: { children: ReactNode }) {
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({ ...opts, resolve });
    });
  }, []);

  const closeConfirm = useCallback((value: boolean) => {
    setConfirmState((s) => {
      if (s) s.resolve(value);
      return null;
    });
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((list) =>
      list.map((t) => (t.id === id ? { ...t, leaving: true } : t))
    );
    setTimeout(() => {
      setToasts((list) => list.filter((t) => t.id !== id));
    }, 250);
  }, []);

  const pushToast = useCallback(
    (kind: ToastKind, title: string, message?: string, duration = 4000) => {
      const id = ++idRef.current;
      setToasts((list) => [...list, { id, kind, title, message, duration }]);
      setTimeout(() => removeToast(id), duration);
    },
    [removeToast]
  );

  const toast = useMemo(
    () => ({
      success: (title: string, message?: string) => pushToast('success', title, message),
      error: (title: string, message?: string) => pushToast('error', title, message, 6000),
      info: (title: string, message?: string) => pushToast('info', title, message),
    }),
    [pushToast]
  );

  // ESC untuk cancel confirm
  useEffect(() => {
    if (!confirmState) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeConfirm(false);
      if (e.key === 'Enter') closeConfirm(true);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [confirmState, closeConfirm]);

  const value = useMemo(() => ({ confirm, toast }), [confirm, toast]);

  return (
    <UIContext.Provider value={value}>
      {children}

      {/* Confirm dialog */}
      {confirmState && (
        <div
          className="ui-backdrop"
          onClick={(e) => e.target === e.currentTarget && closeConfirm(false)}
        >
          <div className="ui-confirm">
            <div className={`ui-confirm-icon ${confirmState.variant === 'primary' ? 'info' : ''}`}>
              {confirmState.variant === 'primary' ? <IconInfo /> : <IconWarning />}
            </div>
            <h3>{confirmState.title}</h3>
            {confirmState.message && <p>{confirmState.message}</p>}
            <div className="ui-confirm-actions">
              <button
                className="ui-btn-cancel"
                onClick={() => closeConfirm(false)}
                autoFocus
              >
                {confirmState.cancelText || 'Batal'}
              </button>
              <button
                className={confirmState.variant === 'primary' ? 'ui-btn-primary' : 'ui-btn-danger'}
                onClick={() => closeConfirm(true)}
              >
                {confirmState.confirmText || 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast stack */}
      <div className="ui-toast-wrap">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`ui-toast ${t.kind} ${t.leaving ? 'leaving' : ''}`}
            style={{ position: 'relative', overflow: 'hidden' }}
          >
            <div className="ui-toast-icon">
              {t.kind === 'success' && <IconCheck />}
              {t.kind === 'error' && <IconX />}
              {t.kind === 'info' && <IconInfo />}
            </div>
            <div className="ui-toast-content">
              <p className="ui-toast-title">{t.title}</p>
              {t.message && <p className="ui-toast-message">{t.message}</p>}
            </div>
            <button
              className="ui-toast-close"
              onClick={() => removeToast(t.id)}
              aria-label="Tutup"
            >
              ×
            </button>
            {!t.leaving && (
              <div
                className="ui-toast-progress"
                style={{ animationDuration: `${t.duration}ms` }}
              />
            )}
          </div>
        ))}
      </div>
    </UIContext.Provider>
  );
}
