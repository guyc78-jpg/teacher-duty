import React, { useRef } from "react";
import { Download, Eraser, Sparkles, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

const days = ["ראשון", "שני", "שלישי", "רביעי", "חמישי"];
const actionClass = "h-14 w-full justify-between rounded-xl border-border bg-card px-4 text-base font-semibold text-foreground shadow-sm hover:bg-muted";

export default function FixedScheduleToolbar({ day, setDay, busy, onAuto, onClear, onImport, onExport }) {
  const fileInput = useRef(null);
  const chooseFile = event => { const file = event.target.files?.[0]; if (file) onImport(file); event.target.value = ""; };
  return <div className="space-y-3"><div className="grid grid-cols-5 gap-1 rounded-xl bg-muted p-1">{days.map((label, index) => <button key={label} onClick={() => setDay(index)} className={`min-h-11 rounded-lg text-sm font-medium ${day === index ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"}`}>{label}</button>)}</div><div className="grid grid-cols-2 gap-2"><Button variant="outline" className={actionClass} disabled={busy} onClick={onAuto}><Sparkles />שיבוץ כל השבוע</Button><Button variant="outline" className={actionClass} disabled={busy} onClick={onExport}><Download />ייצוא נתונים</Button><Button variant="outline" className={actionClass} disabled={busy} onClick={() => fileInput.current?.click()}><Upload />ייבוא נתונים</Button><Button variant="outline" className="h-14 w-full justify-between rounded-xl border-destructive/40 bg-card px-4 text-base font-semibold text-destructive shadow-sm hover:bg-destructive/10 hover:text-destructive" disabled={busy} onClick={onClear}><Eraser />נקה יום</Button><input ref={fileInput} type="file" accept="application/json,.json" className="hidden" onChange={chooseFile} /></div></div>;
}