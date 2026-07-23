import React from "react";
import { base44 } from "@/api/base44Client";
import { CalendarDays } from "lucide-react";
import DetailSection from "@/components/teachers/details/DetailSection";
import { HEBREW_DAYS, formatTimeRange } from "@/lib/dutyUtils";

export default function TeacherScheduleSection({ teacherId }) {
  return (
    <DetailSection icon={CalendarDays} title="מערכת שעות" loader={() => base44.entities.WeeklySchedule.filter({ teacher_id: teacherId, is_active: true }, "start_time", 200)}>
      {lessons => lessons.length === 0 ? <p className="text-sm text-muted-foreground">לא נמצאה מערכת שעות למורה זה.</p> : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-5">
          {[0, 1, 2, 3, 4].map(day => {
            const dayLessons = lessons.filter(lesson => lesson.day_of_week === day).sort((a, b) => a.start_time.localeCompare(b.start_time));
            return (
              <div key={day} className="rounded-lg border border-border bg-muted/40 p-2">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-xs font-semibold">{HEBREW_DAYS[day]}</span>
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${dayLessons.length >= 6 ? "bg-destructive/10 text-destructive" : dayLessons.length >= 4 ? "bg-warning/10 text-warning" : "bg-success/10 text-success"}`}>
                    {dayLessons.length === 0 ? "פנוי" : `${dayLessons.length} שיעורים`}
                  </span>
                </div>
                <div className="space-y-1">
                  {dayLessons.map(lesson => (
                    <div key={lesson.id} className="rounded border border-border/60 bg-background px-1.5 py-1 text-[11px] leading-tight">
                      <span className="text-muted-foreground">{formatTimeRange(lesson.start_time, lesson.end_time)}</span>
                      {lesson.class_name && <span className="block truncate">{lesson.class_name}</span>}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DetailSection>
  );
}