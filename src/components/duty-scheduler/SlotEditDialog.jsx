import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Ban, CheckCircle2, Loader2, Trash2 } from "lucide-react";
import { manageDailySchedule } from "@/functions/manageDailySchedule";
import { Button } from "@/components/ui/button";
import CloseButton from "@/components/ui/close-button";
import { heDate } from "@/lib/scheduleViewUtils";

export default function SlotEditDialog({ context, stations, getSlotIds, onClose, onSaved }) {
  const { mode, date, brk } = context;
  const [stationId, setStationId] = useState(context.stationId || "");
  const [teacherId, setTeacherId] = useState(context.teacherId || "");
  const [candidates, setCandidates] = useState(null);
  const [scope, setScope] = useState("date");
  const [reason, setReason] = useState("");
  const [needsReason, setNeedsReason] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const activeStations = useMemo(() => stations.filter(s => s.active_break_types?.includes(brk.break_type)), [stations, brk.break_type]);

  useEffect(() => {
    if (!stationId) return;
    let live = true;
    setCandidates(null);
    manageDailySchedule({ action: "candidates", date, break_type: brk.break_type, station_id: stationId })
      .then(result => { if (live) setCandidates(result.data.candidates); })
      .catch(err => { if (live) { setCandidates([]); setError(err.response?.data?.error || err.message); } });
    return () => { live = false; };
  }, [stationId, date, brk.break_type]);

  const selected = candidates?.find(item => item.id === teacherId);
  const showReason = needsReason || (selected?.warnings?.length > 0);

  const saveSlot = async (targetStation, ids) => {
    const result = await manageDailySchedule({ action: "save_slot", date, break_type: brk.break_type, station_id: targetStation, teacher_ids: ids, scope, override_reason: reason });
    onSaved(result.data.saved);
  };
  const run = async work => {
    setBusy(true); setError("");
    try { await work(); onClose(); }
    catch (err) { const data = err.response?.data || {}; if (data.requires_reason) setNeedsReason(true); setError(data.error || err.message); }
    finally { setBusy(false); }
  };
  const submit = () => run(async () => {
    if (mode === "edit" && context.stationId && context.stationId !== stationId) {
      await saveSlot(context.stationId, getSlotIds(date, brk.break_type, context.stationId).filter(id => id !== context.teacherId));
      await saveSlot(stationId, [...getSlotIds(date, brk.break_type, stationId).filter(id => id !== teacherId), teacherId]);
    } else {
      const ids = getSlotIds(date, brk.break_type, stationId).filter(id => id !== context.teacherId && id !== teacherId);
      await saveSlot(stationId, [...ids, teacherId]);
    }
  });
  const remove = () => run(() => saveSlot(context.stationId, getSlotIds(date, brk.break_type, context.stationId).filter(id => id !== context.teacherId)));

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-border bg-background shadow-xl sm:rounded-2xl">
        <header className="flex items-center justify-between gap-2 border-b border-border p-4">
          <div className="min-w-0">
            <h2 className="font-bold">{mode === "create" ? "הוספת שיבוץ" : "עריכת שיבוץ"}</h2>
            <p className="text-xs text-muted-foreground">{heDate(date)} · {brk.name} <span dir="ltr">{brk.start_time}–{brk.end_time}</span></p>
          </div>
          <CloseButton onClick={onClose} />
        </header>
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="slot-station">עמדה</label>
            <select id="slot-station" value={stationId} onChange={e => { setStationId(e.target.value); if (!(mode === "edit" && e.target.value === context.stationId)) setTeacherId(""); else setTeacherId(context.teacherId); }} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
              <option value="">בחירת עמדה</option>
              {activeStations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          {stationId && (
            <div>
              <p className="mb-1 text-sm font-medium">מורה</p>
              {!candidates ? <div className="flex justify-center py-6"><Loader2 className="animate-spin text-muted-foreground" /></div> : (
                <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-border p-1">
                  {candidates.map(item => (
                    <button key={item.id} type="button" disabled={!item.available} onClick={() => setTeacherId(item.id)} className={`flex w-full items-start justify-between gap-2 rounded-md px-3 py-2 text-right text-sm transition-colors ${teacherId === item.id ? "bg-primary/10 ring-1 ring-primary" : "hover:bg-muted"} ${!item.available ? "cursor-not-allowed opacity-60" : ""}`}>
                      <span className="min-w-0">
                        <span className="block font-medium">{item.full_name}</span>
                        {!item.available && <span className="block text-xs text-destructive">{item.reasons.join(" · ")}</span>}
                        {item.available && item.warnings?.length > 0 && <span className="flex items-center gap-1 text-xs text-warning"><AlertTriangle className="h-3 w-3 shrink-0" />{item.warnings.join(" · ")}</span>}
                      </span>
                      {item.available ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" /> : <Ban className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />}
                    </button>
                  ))}
                  {!candidates.length && <p className="p-3 text-center text-sm text-muted-foreground">לא נמצאו מורים</p>}
                </div>
              )}
            </div>
          )}
          <fieldset>
            <legend className="mb-1 text-sm font-medium">היקף השינוי</legend>
            <div className="space-y-1">
              <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-input px-3 text-sm"><input type="radio" name="slot-scope" checked={scope === "date"} onChange={() => setScope("date")} />רק לתאריך זה</label>
              <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-input px-3 text-sm"><input type="radio" name="slot-scope" checked={scope === "fixed"} onChange={() => setScope("fixed")} />עדכן גם את הלוח הקבוע</label>
            </div>
          </fieldset>
          {showReason && (
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="slot-reason">סיבת חריגה</label>
              <input id="slot-reason" value={reason} onChange={e => setReason(e.target.value)} placeholder="נדרש בשל התרעות" className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" />
            </div>
          )}
          {error && <p role="alert" className="rounded-lg bg-destructive/10 p-2 text-sm text-destructive">{error}</p>}
        </div>
        <footer className="flex items-center gap-2 border-t border-border p-3">
          <Button onClick={submit} disabled={busy || !stationId || !teacherId} className="flex-1">{busy ? <Loader2 className="animate-spin" /> : "שמירה"}</Button>
          {mode === "edit" && <Button variant="outline" onClick={remove} disabled={busy} className="text-destructive"><Trash2 className="h-4 w-4" />הסרה</Button>}
          <Button variant="ghost" onClick={onClose} disabled={busy}>ביטול</Button>
        </footer>
      </div>
    </div>
  );
}