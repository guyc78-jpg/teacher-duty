import React, { useEffect, useState } from "react";
import { CalendarX, Loader2 } from "lucide-react";
import { manageSwapRequest } from "@/functions/manageSwapRequest";
import CloseButton from "@/components/ui/close-button";
import { Button } from "@/components/ui/button";
import { formatDateWithDay, formatTimeRange } from "@/lib/dutyUtils";
import DutySummaryCard from "@/components/swaps/DutySummaryCard";
import TeacherSearchList from "@/components/swaps/TeacherSearchList";
import PartnerDutyPicker from "@/components/swaps/PartnerDutyPicker";

const MODES = [["open", "בקשה פתוחה"], ["direct", "לקיחת תורנות"], ["mutual", "החלפה הדדית"]];
const MODE_HINTS = { open: "הבקשה תוצג לכל המורים הפנויים לתורנות זו", direct: "המורה שתבחר/י יתבקש לקחת את התורנות", mutual: "המורה ייקח את התורנות שלך ובתמורה תיקח/י תורנות שלו" };

export default function CreateSwapModal({ teacherName, preselect, onClose, onCreated }) {
  const [duties, setDuties] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [dutyKey, setDutyKey] = useState(preselect || "");
  const [mode, setMode] = useState("open");
  const [target, setTarget] = useState(null);
  const [offered, setOffered] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    manageSwapRequest({ action: "my_duties" })
      .then(response => setDuties(response.data.duties || []))
      .catch(dutiesError => { setDuties([]); setLoadError(dutiesError.response?.data?.error || "טעינת התורנויות נכשלה"); });
  }, []);

  const duty = (duties || []).find(item => item.key === dutyKey) || null;
  const pickMode = value => { setMode(value); setTarget(null); setOffered(null); setError(""); };

  const submit = async () => {
    if (!duty) return setError("יש לבחור תורנות להחלפה");
    if (mode !== "open" && !target) return setError("יש לבחור מורה להחלפה");
    if (mode === "mutual" && !offered) return setError("יש לבחור תורנות של המורה השני בתמורה");
    setSubmitting(true); setError("");
    try {
      await manageSwapRequest({
        action: "create", date: duty.date, break_type: duty.break_type, station_id: duty.station_id,
        mode: mode === "open" ? "open" : "direct", swap_type: mode === "mutual" ? "mutual" : "takeover",
        target_teacher_id: target?.id || null,
        offered: offered ? { date: offered.date, break_type: offered.break_type, station_id: offered.station_id } : null
      });
      onCreated();
    } catch (submitError) {
      setError(submitError.response?.data?.error || submitError.message || "לא ניתן ליצור את הבקשה");
    } finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative max-h-[85vh] w-full overflow-y-auto rounded-t-2xl bg-background p-5 sm:max-w-md sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold">בקשת החלפה</h2><CloseButton onClick={onClose} label="סגירת בקשת החלפה" /></div>
        {duties === null ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin text-muted-foreground" /></div>
        ) : loadError ? (
          <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{loadError}</p>
        ) : duties.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground"><CalendarX className="mx-auto mb-2 h-8 w-8" /><p className="text-sm">אין לך תורנויות קרובות שניתן להעביר להחלפה</p></div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">תורנות להחלפה</label>
              <select aria-label="תורנות להחלפה" value={duty ? dutyKey : ""} onChange={event => { setDutyKey(event.target.value); setTarget(null); setOffered(null); setError(""); }} className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm">
                <option value="">בחר תורנות...</option>
                {duties.map(item => <option key={item.key} value={item.key} disabled={item.has_pending_request}>{formatDateWithDay(item.date)} {formatTimeRange(item.start_time, item.end_time)} · {item.station_name}{item.has_pending_request ? " (בקשה קיימת)" : ""}</option>)}
              </select>
            </div>
            {duty && <DutySummaryCard duty={duty} teacherName={teacherName} />}
            {duty && (
              <div>
                <label className="mb-1.5 block text-sm font-medium">סוג ההחלפה</label>
                <div className="grid grid-cols-3 gap-2">
                  {MODES.map(([value, label]) => <button key={value} onClick={() => pickMode(value)} className={`min-h-11 rounded-lg border p-2 text-xs font-medium ${mode === value ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>{label}</button>)}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{MODE_HINTS[mode]}</p>
              </div>
            )}
            {duty && mode !== "open" && (
              <div>
                <label className="mb-1.5 block text-sm font-medium">בחר מורה להחלפה</label>
                {target ? (
                  <div className="flex items-center justify-between gap-2 rounded-lg border border-primary/40 bg-primary/5 p-2.5 text-sm">
                    <span className="min-w-0 font-semibold">{target.full_name}<span className="mr-2 text-xs font-normal text-muted-foreground">{target.subject}</span></span>
                    <Button variant="ghost" size="sm" onClick={() => { setTarget(null); setOffered(null); }}>החלפת מורה</Button>
                  </div>
                ) : <TeacherSearchList duty={duty} onSelect={setTarget} />}
              </div>
            )}
            {duty && mode === "mutual" && target && (
              <div>
                <label className="mb-1.5 block text-sm font-medium">תורנות של {target.full_name} שתיקח/י בתמורה</label>
                {offered ? (
                  <div className="flex items-center justify-between gap-2 rounded-lg border border-primary/40 bg-primary/5 p-2.5 text-sm">
                    <span className="min-w-0">{formatDateWithDay(offered.date)} {formatTimeRange(offered.start_time, offered.end_time)} · {offered.station_name}</span>
                    <Button variant="ghost" size="sm" onClick={() => setOffered(null)}>שינוי</Button>
                  </div>
                ) : <PartnerDutyPicker targetId={target.id} onSelect={setOffered} />}
              </div>
            )}
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <Button onClick={submit} disabled={submitting || !duty} className="h-11 w-full">{submitting ? "שולח..." : "שליחת הבקשה"}</Button>
          </div>
        )}
      </div>
    </div>
  );
}