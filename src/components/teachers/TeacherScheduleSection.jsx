import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { ChevronDown, CalendarDays, Loader2 } from "lucide-react";
import { HEBREW_DAYS } from "@/lib/dutyUtils";

export default function TeacherScheduleSection({ teacherId }) {
  const [open, setOpen] = useState(false);
  const [lessons, setLessons] = useState(null);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && lessons === null) {
      const rows = await base44.entities.WeeklySchedule.filter({ teacher_id: teacherId, is_active: true }, "start_time", 200);
      setLessons(rows);
    }
  };

  return (
    <div className="mt-2 border-t border-border pt-2">
      <button onClick={toggle} className="flex items-center gap-2 w-full text-sm text-muted-foreground hover:text-foreground">
        <CalendarDays className="w-4 h-4" />
        <span className="flex-1 text-right">מערכת שעות</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        lessons === null ? (
          <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : lessons.length === 0 ? (
          <p className="text-sm text-muted-foreground py-3 text-center">לא נמצאה מערכת שעות למורה זה.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 mt-3">
            {[0, 1, 2, 3, 4].map(day => {
              const dayLessons = lessons.filter(lesson => lesson.day_of_week === day).sort((a, b) => a.start_time.localeCompare(b.start_time));
              return (
                <div key={day} className="rounded-lg border border-border bg-muted/40 p-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold">{HEBREW_DAYS[day]}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${dayLessons.length >= 6 ? "bg-destructive/10 text-destructive" : dayLessons.length >= 4 ? "bg-warning/10 text-warning" : "bg-success/10 text-success"}`}>
                      {dayLessons.length === 0 ? "פנוי" : `${dayLessons.length} שיעורים`}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {dayLessons.map(lesson => (
                      <div key={lesson.id} className="text-[11px] leading-tight bg-background rounded px-1.5 py-1 border border-border/60">
                        <span className="text-muted-foreground">{lesson.start_time}–{lesson.end_time}</span>
                        {lesson.class_name && <span className="block truncate">{lesson.class_name}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}