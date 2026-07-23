import React from "react";
import { Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import CloseButton from "@/components/ui/close-button";
import { DIVISION_LABELS } from "@/lib/dutyUtils";
import TeacherScheduleSection from "@/components/teachers/TeacherScheduleSection";

const roleLabels = { management: "הנהלה", admin: "מנהל/ת מערכת", coordinator: "רכז/ת", teacher: "מורה", homeroom: "מחנך/ת" };

export default function TeacherDetailsCard({ teacher, onClose, onEdit, onDelete }) {
  const details = [
    ["דוא״ל", teacher.email], ["מזהה עובד", teacher.employee_id],
    ["חטיבה", DIVISION_LABELS[teacher.division]], ["מקצוע", teacher.subject || "—"],
    ["מקצועות נוספים", teacher.additional_subjects?.join(", ") || "—"], ["תפקיד", roleLabels[teacher.role] || teacher.role],
    ["שעות שבועיות", teacher.weekly_teaching_hours || 0], ["טלפון", teacher.phone || "—"],
    ["חינוך כיתה", teacher.is_homeroom ? `${teacher.homeroom_grade || ""} ${teacher.homeroom_class || ""}`.trim() || "כן" : "לא"],
    ["פטור מתורנות", teacher.is_exempt ? "כן" : "לא"], ["מורה לספורט", teacher.is_sport_teacher ? "כן" : "לא"],
    ["סטטוס", teacher.is_active ? "פעיל" : "לא פעיל"]
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button aria-label="סגירת פרטי מורה" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative max-h-[88vh] w-full overflow-y-auto rounded-t-2xl bg-background p-5 sm:max-w-2xl sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div><h2 className="text-lg font-bold">{teacher.full_name}</h2><p className="text-sm text-muted-foreground">כרטיס מורה מלא</p></div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={onEdit}><Edit className="h-4 w-4" /> עריכה</Button>
            {onDelete && <Button size="sm" variant="destructive" onClick={onDelete}><Trash2 className="h-4 w-4" /> מחיקה</Button>}
            <CloseButton onClick={onClose} label="סגירת פרטי המורה" />
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border border-border p-4 sm:grid-cols-3">
          {details.map(([label, value]) => <div key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-0.5 text-sm font-medium">{value}</dd></div>)}
        </dl>
        <TeacherScheduleSection teacherId={teacher.id} />
      </div>
    </div>
  );
}