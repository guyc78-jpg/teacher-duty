import React from "react";
import { ChevronLeft } from "lucide-react";

export default function TeacherRow({ teacher, onOpen }) {
  return (
    <button onClick={() => onOpen(teacher)} className="grid w-full grid-cols-[minmax(0,1fr)_minmax(5rem,0.7fr)_4rem_auto] items-center gap-2 border-b border-border px-3 py-2.5 text-right transition-colors last:border-b-0 hover:bg-muted/50 sm:grid-cols-[minmax(0,1.3fr)_minmax(7rem,1fr)_6rem_5rem_auto]">
      <span className="truncate text-sm font-semibold">{teacher.full_name}</span>
      <span className="truncate text-xs text-muted-foreground sm:text-sm">{teacher.subject || "—"}</span>
      <span className="text-xs text-muted-foreground sm:text-sm">{teacher.weekly_teaching_hours || 0}</span>
      <span className={`rounded-full px-2 py-0.5 text-center text-[11px] font-medium ${teacher.is_active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
        {teacher.is_active ? "פעיל" : "לא פעיל"}
      </span>
      <ChevronLeft className="hidden h-4 w-4 text-muted-foreground sm:block" />
    </button>
  );
}