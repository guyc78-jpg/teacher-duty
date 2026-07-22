import React, { useState } from "react";
import { AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import CloseButton from "@/components/ui/close-button";

export default function PublishReviewDialog({ validation, busy, onClose, onPublish }) {
  const [reason, setReason] = useState("");
  const blocked = validation.errors.length > 0;
  return <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"><button className="absolute inset-0 bg-foreground/40" aria-label="סגירת בדיקה" onClick={onClose} /><div className="relative max-h-[85vh] w-full overflow-y-auto rounded-t-2xl bg-background p-4 sm:max-w-lg sm:rounded-2xl"><div className="flex items-center justify-between"><h2 className="text-lg font-bold">בדיקת תקינות מלאה</h2><CloseButton onClick={onClose} /></div>
    <div className="mt-3 space-y-3">{blocked ? <Result icon={AlertTriangle} title={`${validation.errors.length} שגיאות חוסמות`} items={validation.errors} tone="text-destructive" /> : <p className="flex items-center gap-2 text-sm text-success"><CheckCircle />אין שגיאות חוסמות</p>}{validation.warnings.length > 0 && <Result icon={AlertTriangle} title={`${validation.warnings.length} אזהרות`} items={validation.warnings} tone="text-warning" />}{validation.warnings.length > 0 && !blocked && <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="סיבת עקיפת האזהרות (חובה)" />}</div>
    <Button className="mt-4 w-full" disabled={blocked || busy || (validation.warnings.length > 0 && !reason.trim())} onClick={() => onPublish(reason)}>{busy ? <><Loader2 className="animate-spin" />מפרסם...</> : "פרסום מפורש"}</Button>
  </div></div>;
}
function Result({ icon: Icon, title, items, tone }) { return <div><h3 className={`flex items-center gap-2 text-sm font-bold ${tone}`}><Icon className="h-4 w-4" />{title}</h3><div className="mt-1 max-h-36 space-y-1 overflow-y-auto">{items.map((item, index) => <p key={`${item.type}-${index}`} className="text-xs text-muted-foreground">{item.message}</p>)}</div></div>; }