import React from "react";
import { AlertCircle, CheckCircle2, Plus } from "lucide-react";

const tones = {
  covered: "bg-success/5 text-success",
  partial: "bg-warning/10 text-warning",
  empty: "bg-destructive/5 text-destructive"
};

export default function WeekTableCell({ ids, visibleIds, required, teachersById, active, onAdd, onEdit }) {
  if (!active) return <div className="flex min-h-28 items-center justify-center bg-muted/30 text-xs text-muted-foreground">לא פעיל</div>;
  const status = ids.length >= required ? "covered" : ids.length ? "partial" : "empty";
  const label = status === "covered" ? "כיסוי מלא" : `חסרים ${Math.max(required - ids.length, 0)}`;
  return (
    <div className={`min-h-28 p-2.5 ${tones[status]}`}>
      <div className="mb-2 flex items-center justify-between gap-2 text-xs font-bold">
        <span className="flex items-center gap-1">{status === "covered" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}{label}</span>
        <span dir="ltr">{ids.length}/{required}</span>
      </div>
      <div className="space-y-1.5">
        {visibleIds.map(id => <button key={id} type="button" onClick={() => onEdit(id)} className="block min-h-9 w-full rounded-md border border-current/20 bg-background/80 px-2 py-1 text-right text-xs font-semibold text-foreground transition-colors hover:border-primary hover:text-primary">{teachersById.get(id)?.full_name || "מורה"}</button>)}
        {ids.length > 0 && visibleIds.length === 0 && <p className="py-1 text-center text-xs text-muted-foreground">אין התאמה לסינון</p>}
        {ids.length < required && <button type="button" onClick={onAdd} className="flex min-h-9 w-full items-center justify-center gap-1 rounded-md border border-dashed border-current/40 px-2 text-xs font-bold hover:bg-background/70"><Plus className="h-3.5 w-3.5" />בחירת מורה</button>}
      </div>
    </div>
  );
}