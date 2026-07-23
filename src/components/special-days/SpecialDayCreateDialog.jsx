import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SpecialDayCreateDialog({ items, templates, busy, onClose, onCreate }) {
  const [form, setForm] = useState({ name: "", type: "other", date: "", mode: "blank", source_id: "" });
  const options = form.mode === "template" ? templates : items;
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center" onClick={onClose}>
    <div className="w-full max-w-lg space-y-3 rounded-xl bg-background p-4 shadow-xl" onClick={e => e.stopPropagation()}>
      <h2 className="text-lg font-bold">יצירת יום מיוחד</h2>
      <Input placeholder="שם האירוע" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
      <div className="grid grid-cols-2 gap-2"><select className="h-10 rounded-md border bg-background px-3" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}><option value="purim">פורים</option><option value="memorial">יום הזיכרון</option><option value="semester_end">סיום מחצית</option><option value="year_end">סיום שנה</option><option value="ceremony">טקס</option><option value="other">אחר</option></select><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
      <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">{[["blank","דף ריק"],["template","תבנית"],["duplicate","שכפול"]].map(([v,l]) => <button key={v} className={`rounded-md p-2 text-sm ${form.mode === v ? "bg-background shadow-sm" : "text-muted-foreground"}`} onClick={() => setForm({ ...form, mode: v, source_id: "" })}>{l}</button>)}</div>
      {form.mode !== "blank" && <select className="h-10 w-full rounded-md border bg-background px-3" value={form.source_id} onChange={e => setForm({ ...form, source_id: e.target.value })}><option value="">בחר מקור</option>{options.map(x => <option key={x.id} value={x.id}>{x.name}{x.date ? ` · ${x.date}` : ""}</option>)}</select>}
      <div className="flex gap-2"><Button className="flex-1" disabled={busy || !form.name || !form.date || (form.mode !== "blank" && !form.source_id)} onClick={() => onCreate({ mode: form.mode, source_id: form.source_id, data: form })}>{busy ? "יוצר..." : "יצירה"}</Button><Button variant="outline" onClick={onClose}>ביטול</Button></div>
    </div>
  </div>;
}