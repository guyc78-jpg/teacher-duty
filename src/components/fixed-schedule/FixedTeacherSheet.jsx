import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, Search, X } from "lucide-react";
import { manageFixedSchedule } from "@/functions/manageFixedSchedule";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import CloseButton from "@/components/ui/close-button";
import FixedTeacherSkeleton from "@/components/fixed-schedule/FixedTeacherSkeleton";
import { DIVISION_LABELS } from "@/lib/dutyUtils";

const dayNames = ["ראשון", "שני", "שלישי", "רביעי", "חמישי"];
export default function FixedTeacherSheet({ context, day, template, onClose, onSaved }) {
  const initialSelected = context.assignment?.teacher_ids || [];
  const [items, setItems] = useState([]), [details, setDetails] = useState({}), [selected, setSelected] = useState(initialSelected), [query, setQuery] = useState(""), [reason, setReason] = useState(""), [searching, setSearching] = useState(true), [saving, setSaving] = useState(false), [error, setError] = useState("");
  const requestId = useRef(0), payload = useMemo(() => ({ day_of_week: day, break_type: context.brk.break_type, station_id: context.station.id }), [day, context.brk.break_type, context.station.id]);
  useEffect(() => {
    const controller = new AbortController(), currentRequest = ++requestId.current;
    const timer = window.setTimeout(async () => {
      setSearching(true); setError("");
      try {
        const response = await manageFixedSchedule({ action: "candidates", ...payload, query: query.trim(), selected_ids: initialSelected }, { signal: controller.signal });
        if (currentRequest !== requestId.current) return;
        const candidates = response.data.candidates || [];
        setItems(candidates); setDetails(current => ({ ...current, ...Object.fromEntries(candidates.map(item => [item.id, item])) }));
      } catch (failure) {
        if (currentRequest === requestId.current && failure.name !== "CanceledError" && failure.name !== "AbortError") setError(failure.response?.data?.error || failure.message);
      } finally { if (currentRequest === requestId.current) setSearching(false); }
    }, query ? 250 : 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query, payload]);
  const required = context.station.staffing_requirements?.[context.brk.break_type] || 1, chosen = selected.map(id => details[id]).filter(Boolean), availableItems = items.filter(item => !selected.includes(item.id));
  const toggle = item => { if (!item.available) return; setSelected(current => current.includes(item.id) ? current.filter(id => id !== item.id) : current.length < required ? [...current, item.id] : current); setError(""); };
  const save = async () => { setSaving(true); setError(""); try { const response = await manageFixedSchedule({ action: "save_slot", ...payload, teacher_ids: selected, override_reason: reason, expected_updated_date: template.updated_date }); onSaved(response.data); } catch (failure) { setError(failure.response?.data?.error || failure.message); } finally { setSaving(false); } };
  return <div className="fixed inset-0 z-50 flex items-end justify-center"><button aria-label="סגירה" className="absolute inset-0 bg-foreground/40" onClick={onClose} /><div className="relative flex max-h-[85vh] w-full max-w-2xl flex-col rounded-t-2xl bg-background shadow-2xl"><header className="border-b p-4"><div className="flex items-start justify-between gap-3"><div><h2 className="font-bold">{context.station.name}</h2><p className="text-sm text-muted-foreground">יום {dayNames[day]} · {context.brk.name} · {context.station.area || "ללא אזור"}</p><p className="mt-1 text-xs">נדרשים {required} מורים · נבחרו {selected.length}</p></div><CloseButton onClick={onClose} /></div></header><div className="min-h-0 flex-1 overflow-y-auto p-4">
    {!!chosen.length && <div className="mb-3 space-y-2"><h3 className="text-sm font-semibold">מורים שנבחרו</h3>{chosen.map(item => <button key={item.id} onClick={() => setSelected(current => current.filter(id => id !== item.id))} className="flex w-full items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-2 text-right"><Check className="h-4 w-4 text-primary" /><span className="flex-1 whitespace-normal break-words font-medium">{item.full_name}</span><X className="h-4 w-4" /></button>)}</div>}
    <label className="relative block"><Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pr-9" value={query} onChange={event => setQuery(event.target.value)} placeholder="חיפוש לפי שם או מקצוע" /></label>
    {searching ? <FixedTeacherSkeleton /> : <div className="mt-3 space-y-2">{availableItems.map((item, index) => <button key={item.id} disabled={!item.available} onClick={() => toggle(item)} className="w-full rounded-xl border p-3 text-right disabled:bg-muted disabled:opacity-60"><div className="flex items-start gap-2"><div className="min-w-0 flex-1"><p className="whitespace-normal break-words font-semibold">{index < 3 && item.available ? "מומלץ · " : ""}{item.full_name}</p><p className="text-xs text-muted-foreground">{item.subject} · {DIVISION_LABELS[item.division] || "ללא חטיבה"}</p></div><span className={`rounded-full px-2 py-0.5 text-xs ${item.available ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>{item.available ? "זמין" : "לא זמין"}</span></div><p className="mt-2 text-xs">תורנויות {item.duty_count}/{item.quota || "—"} · עומס ביום {item.day_load_hours} שעות</p><p className={`mt-1 text-xs ${item.available ? "text-warning" : "text-destructive"}`}>{item.available ? (item.warnings.join(" · ") || "התאמה טובה") : item.reasons.join(" · ")}</p></button>)}{!availableItems.length && <p className="py-10 text-center text-sm text-muted-foreground">לא נמצאו מורים מתאימים</p>}</div>}
    {chosen.some(item => item.warnings.length) && <Input className="mt-3" value={reason} onChange={event => setReason(event.target.value)} placeholder="סיבת חריגה (חובה)" />}{error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
  </div><footer className="sticky bottom-0 grid grid-cols-2 gap-2 border-t bg-background p-4"><Button variant="outline" onClick={onClose}>ביטול</Button><Button disabled={saving} onClick={save}>{saving ? "שומר..." : "שמירת שיבוץ"}</Button></footer></div></div>;
}