import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const ConfirmContext = createContext(() => Promise.resolve(false));
export function useConfirm() { return useContext(ConfirmContext); }

export function ConfirmProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const resolver = useRef(null);
  const confirm = useCallback(options => new Promise(resolve => { resolver.current = resolve; setDialog(options); }), []);
  const close = result => { resolver.current?.(result); resolver.current = null; setDialog(null); };
  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {dialog && <ConfirmDialog {...dialog} onResolve={close} />}
    </ConfirmContext.Provider>
  );
}

function ConfirmDialog({ title, description, confirmLabel = "אישור", cancelLabel = "ביטול", variant = "destructive", onResolve }) {
  const danger = variant === "destructive";
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" role="alertdialog" aria-modal="true" aria-label={title} onClick={() => onResolve(false)}>
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-background shadow-xl" onClick={event => event.stopPropagation()}>
        <div className="flex flex-col items-center gap-3 p-5 text-center">
          <div className={`flex h-12 w-12 items-center justify-center rounded-full ${danger ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
            {danger ? <Trash2 className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
          </div>
          <h2 className="text-lg font-bold leading-6">{title}</h2>
          {description && <p className="text-sm leading-5 text-muted-foreground">{description}</p>}
        </div>
        <div className="grid grid-cols-2 gap-2 border-t border-border p-3">
          <Button variant="outline" className="min-h-11" onClick={() => onResolve(false)}>{cancelLabel}</Button>
          <Button variant={danger ? "destructive" : "default"} className="min-h-11" onClick={() => onResolve(true)}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}