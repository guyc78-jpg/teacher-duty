import React, { useState } from "react";
import { manageSwapRequest } from "@/functions/manageSwapRequest";
import CloseButton from "@/components/ui/close-button";
import { Button } from "@/components/ui/button";
import { formatDateWithDay, formatTimeRange } from "@/lib/dutyUtils";

export default function CreateSwapModal({ assignments, allTeachers, onClose, onCreated }) {
  const [assignmentId, setAssignmentId] = useState("");
  const [mode, setMode] = useState("open");
  const [targetTeacherId, setTargetTeacherId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const submit = async () => {
    if (!assignmentId) return setError("יש לבחור תורנות");
    if (mode === "direct" && !targetTeacherId) return setError("יש לבחור מורה לפנייה הישירה");
    setSubmitting(true); setError("");
    try {
      await manageSwapRequest({ action: "create", assignmentId, mode, targetTeacherId: mode === "direct" ? targetTeacherId : null });
      onCreated();
    } catch (requestError) {
      setError(requestError.response?.data?.error || requestError.message || "לא ניתן ליצור את הבקשה");
    } finally { setSubmitting(false); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative max-h-[85vh] w-full overflow-y-auto rounded-t-2xl bg-background p-5 sm:max-w-md sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold">בקשת החלפה</h2><CloseButton onClick={onClose} label="סגירת בקשת החלפה" /></div>
        <div className="space-y-4">
          <div><label className="mb-1.5 block text-sm font-medium">תורנות להחלפה</label><select aria-label="תורנות להחלפה" value={assignmentId} onChange={event => setAssignmentId(event.target.value)} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"><option value="">בחר תורנות...</option>{assignments.map(item => <option key={item.id} value={item.id}>{formatDateWithDay(item.date)} {formatTimeRange(item.start_time, item.end_time)} · {item.station_name}</option>)}</select></div>
          <div><label className="mb-1.5 block text-sm font-medium">למי לשלוח?</label><div className="grid grid-cols-2 gap-2"><button onClick={() => { setMode("open"); setTargetTeacherId(""); }} className={`rounded-lg border p-2 text-sm ${mode === "open" ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>בקשה פתוחה לכל המורים</button><button onClick={() => setMode("direct")} className={`rounded-lg border p-2 text-sm ${mode === "direct" ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>פנייה ישירה למורה</button></div></div>
          {mode === "direct" && <div><label className="mb-1.5 block text-sm font-medium">בחירת מורה</label><select aria-label="בחירת מורה" value={targetTeacherId} onChange={event => setTargetTeacherId(event.target.value)} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"><option value="">בחר מורה...</option>{allTeachers.map(item => <option key={item.id} value={item.id}>{item.full_name}</option>)}</select><p className="mt-1 text-xs text-muted-foreground">זמינות המורה והתנגשויות נבדקות לפני יצירת הבקשה.</p></div>}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button onClick={submit} disabled={submitting} className="h-11 w-full">{submitting ? "יוצר..." : "צור בקשה"}</Button>
        </div>
      </div>
    </div>
  );
}