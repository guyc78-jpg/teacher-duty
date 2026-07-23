import React, { useState } from "react";
import { Copy, Eraser, Save, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const days = ["ראשון", "שני", "שלישי", "רביעי", "חמישי"];
export default function FixedScheduleToolbar({ day, setDay, busy, onSave, onAuto, onClear, onCopy }) {
  const [target, setTarget] = useState(day === 4 ? 0 : day + 1);
  return <div className="space-y-3"><div className="grid grid-cols-5 gap-1 rounded-xl bg-muted p-1">{days.map((label, index) => <button key={label} onClick={() => setDay(index)} className={`min-h-11 rounded-lg text-sm font-medium ${day === index ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"}`}>{label}</button>)}</div><div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap"><Button variant="outline" disabled={busy} onClick={onSave}><Save />שמור טיוטה</Button><Button variant="outline" disabled={busy} onClick={onAuto}><Sparkles />שיבוץ אוטומטי</Button><div className="flex min-w-0 gap-1"><select aria-label="יום יעד להעתקה" value={target} onChange={event => setTarget(Number(event.target.value))} className="min-w-0 flex-1 rounded-md border bg-background px-2 text-sm">{days.map((label, index) => <option key={label} value={index} disabled={index === day}>{label}</option>)}</select><Button variant="outline" disabled={busy || target === day} onClick={() => onCopy(target)}><Copy />העתק</Button></div><Button variant="outline" disabled={busy} onClick={onClear}><Eraser />נקה יום</Button></div></div>;
}