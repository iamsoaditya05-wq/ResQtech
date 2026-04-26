import { useState, useCallback } from 'react';

let _addToast = null;

export function useToastProvider() {
  const [toasts, setToasts] = useState([]);

  const add = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), duration);
    return id;
  }, []);

  _addToast = add;

  const remove = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  return { toasts, add, remove };
}

// Call from anywhere without hooks
export function toast(message, type = 'info', duration = 4000) {
  if (_addToast) _addToast(message, type, duration);
}
