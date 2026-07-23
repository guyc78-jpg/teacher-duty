import React, { useEffect, useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";

export default function DetailSection({ icon: Icon, title, defaultOpen = false, loader, children }) {
  const [open, setOpen] = useState(defaultOpen);
  const [data, setData] = useState(loader ? undefined : null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !loader || data !== undefined) return;
    let alive = true;
    loader().then(result => { if (alive) setData(result); }).catch(err => { if (alive) setError(err.message || "הטעינה נכשלה"); });
    return () => { alive = false; };
  }, [open, loader, data]);

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <button type="button" onClick={() => setOpen(v => !v)} className="flex w-full items-center gap-2 px-4 py-3 text-right transition-colors hover:bg-muted/50">
        {Icon && <Icon className="h-4 w-4 shrink-0 text-primary" />}
        <span className="flex-1 text-sm font-semibold">{title}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="border-t border-border p-4">
          {error ? <p role="alert" className="text-sm text-destructive">{error}</p>
            : loader && data === undefined ? <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            : children(data)}
        </div>
      )}
    </section>
  );
}