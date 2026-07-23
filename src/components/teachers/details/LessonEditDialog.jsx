import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import CloseButton from "@/components/ui/close-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HEBREW_DAYS, formatTimeRange } from "@/lib/dutyUtils";

export default function LessonEditDialog({ lesson, editable, onClose, onSaved }) {
  const lines = (lesson.class_name || "").split("\n");
  const [subject, setSubject] = useState(lines[0] || "");
  const [extra, setExtra] = useState(lines.slice(1).join("\n"));
  const [busy, setBusy] = useState(false);
  const save = async () => { setBusy(true); try { await base44.entities.WeeklySchedule.update(lesson.id, { class_name: [subject, extra].filter(Boolean).join("\n") }); await onSaved(); } catch { setBusy(false); } };
  const remove = async () => { setBusy(true); try { await base44.entities.WeeklySchedule.delete(lesson.id); await onSaved(); } catch { setBusy(false); } };
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
      <button aria-label="סגירת פרטי שיעור" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full space-y-3 rounded-t-2xl bg-background p-5 sm:max-w-sm sm:rounded-2xl">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-bold">{HEBREW_DAYS[lesson.day_of_week]} · שיעור {lesson.lesson_number}</h3>
          <CloseButton onClick={onClose} label="סגירת פרטי שיעור" />
        </div>
        <p className="text-sm text-muted-foreground">{formatTimeRange(lesson.start_time, lesson.end_time)}</p>
        {editable ? (
          <div className="space-y-3">
            <div><Label>מקצוע / תוכן</Label><Input value={subject} onChange={e => setSubject(e.target.value)} /></div>
            <div><Label>פרטים נוספים (כיתה / חדר)</Label><Input value={extra} onChange={e => setExtra(e.target.value)} /></div>
            <div className="flex gap-2"><Button onClick={save} disabled={busy} className="flex-1">שמירה</Button><Button variant="destructive" onClick={remove} disabled={busy}>מחיקת שיעור</Button></div>
          </div>
        ) : <p className="break-words text-sm font-medium">{lesson.class_name || "—"}</p>}
      </div>
    </div>
  );
}