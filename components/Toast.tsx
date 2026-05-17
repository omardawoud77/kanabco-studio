'use client';

import { createContext, useContext, useState, useCallback, useRef } from 'react';

type ToastCtx = (msg: string) => void;
const Ctx = createContext<ToastCtx | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<NodeJS.Timeout | null>(null);

  const show = useCallback((m: string) => {
    setMsg(m);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(null), 2000);
  }, []);

  return (
    <Ctx.Provider value={show}>
      {children}
      <div className={`toast ${msg ? 'show' : ''}`}>{msg}</div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
