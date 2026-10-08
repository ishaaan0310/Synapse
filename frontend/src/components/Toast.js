import React, { createContext, useCallback, useContext, useState } from 'react';

const ToastContext = createContext(() => {});

let nextId = 1;

// Small notification popups: toast.success('Saved'), toast.error('Oops')
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const show = useCallback((message, type = 'info') => {
    const id = nextId++;
    setToasts((list) => [...list.slice(-3), { id, message, type }]);
    setTimeout(() => remove(id), 3500);
  }, [remove]);

  const toast = React.useMemo(() => ({
    success: (m) => show(m, 'success'),
    error: (m) => show(m, 'error'),
    info: (m) => show(m, 'info')
  }), [show]);

  return (
    <ToastContext.Provider value={toast}>
      {children}

      <div className="toast-container" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <span>{t.type === 'success' ? '✅' : t.type === 'error' ? '⚠️' : 'ℹ️'}</span>
            <span>{t.message}</span>
            <button type="button" onClick={() => remove(t.id)} aria-label="Dismiss">×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
