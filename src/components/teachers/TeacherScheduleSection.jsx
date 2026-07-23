import React from "react";
import { base44 } from "@/api/base44Client";
import { CalendarDays } from "lucide-react";
import DetailSection from "@/components/teachers/details/DetailSection";
import TeacherWeeklyGrid from "@/components/teachers/details/TeacherWeeklyGrid";

export default function TeacherScheduleSection({ teacherId, editable }) {
  return (
    <DetailSection icon={CalendarDays} title="מערכת שעות" loader={() => base44.entities.WeeklySchedule.filter({ teacher_id: teacherId, is_active: true }, "start_time", 200)}>
      {lessons => lessons.length === 0 ? <p className="text-sm text-muted-foreground">לא נמצאה מערכת שעות למורה זה.</p> : <TeacherWeeklyGrid teacherId={teacherId} lessons={lessons} editable={editable} />}
    </DetailSection>
  );
}