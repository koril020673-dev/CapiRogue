import React, { useEffect } from 'react';
import { useGameStore } from '../store/useGameStore.js';

export default function Toast() {
  const toasts      = useGameStore(s => s.toasts);
  const removeToast = useGameStore(s => s.removeToast);

  useEffect(() => {
    if (toasts.length === 0) return;
    const latest = toasts[toasts.length - 1];
    const timer = setTimeout(() => removeToast(latest.id), 2800);
    return () => clearTimeout(timer);
  }, [toasts]);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`} onClick={() => removeToast(t.id)}>
          {t.msg}
        </div>
      ))}
    </div>
  );
}
