import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import { getBreakValidationError } from "@/lib/breakValidation";

export default function BreakModal({ item, breaks, nextOrder, onClose, onSaved, Modal }) {
  const [form, setForm] = useState(item.id ? { active_days: [0,1,2,3,4], ...item } : { break_type: "small", name: "", start_time: "", end_time: "", active_days: [0,1,2,3,4], is_active: true, sort_order: nextOrder });
  const [saving, setSaving] = useState(false);
  const days = ["ראשון", "שני", "שלישי", "רביעי", "חמישי"];
  const error = getBreakValidationError(form, breaks, item.id);
  const set = (key, value) => setForm(current => ({ ...current, [key]: value }));
  const toggleDay = day => set("active_days", form.active_days.includes(day) ? form.active_days.filter(value => value !== day) : [...form.active_days, day]);

  const submit = async () => {
    if (error) return;
    setSaving(true);
    if (item.id) await base44.entities.Break.update(item.id, form);
    else await base44.entities.Break.create(form);
    setSaving(false);
    onSaved();
  };

  return (
    <Modal title={item.id ? "עריכת הפסקה" : "הפסקה חדשה"} onClose={onClose}>
      <div className="space-y-3">
        <div><Label>שם</Label><Input aria-label="שם הפסקה" value={form.name} onChange={event => set("name", event.target.value)} /></div>
        <div><Label>סוג</Label><select aria-label="סוג הפסקה" value={form.break_type} onChange={event => set("break_type", event.target.value)} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"><option value="big">גדולה</option><option value="medium">בינונית</option><option value="small">קטנה</option></select></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>התחלה</Label><Input aria-label="שעת התחלה" type="time" value={form.start_time} onChange={event => set("start_time", event.target.value)} /></div>
          <div><Label>סיום</Label><Input aria-label="שעת סיום" type="time" value={form.end_time} onChange={event => set("end_time", event.target.value)} /></div>
        </div>
        <div><Label>ימים פעילים</Label><div className="mt-1 flex flex-wrap gap-1">{days.map((day, index) => <button type="button" key={day} onClick={() => toggleDay(index)} className={`rounded px-2 py-1 text-xs ${form.active_days.includes(index) ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{day}</button>)}</div></div>
        {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
        <Button onClick={submit} disabled={saving || Boolean(error)} className="h-11 w-full">{saving ? "שומר..." : "שמור"}</Button>
      </div>
    </Modal>
  );
}