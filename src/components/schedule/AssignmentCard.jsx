import React from "react";
import { Clock, MapPin, UserRound } from "lucide-react";
import { formatTimeRange, STATUS_LABELS } from "@/lib/dutyUtils";

export default function AssignmentCard({ assignment, isDraft, teachers, onTeacherChange }) {
  const status = STATUS_LABELS[assignment.status] || STATUS_LABELS.scheduled;
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-start gap-3 text-sm">
        <span className="flex shrink-0 items-center gap-1.5"><Clock className="h-4 w-4 text-muted-foreground" />{formatTimeRange(assignment.start_time, assignment.end_time)}</span>
        <span className="flex min-w-0 items-start gap-1.5 font-medium"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /><span className="whitespace-normal break-words">{assignment.station_name}</span></span>
      </div>
      <div className="mt-2 flex items-start gap-2 border-t border-border pt-2">
        <UserRound className="mt-2.5 h-4 w-4 shrink-0 text-muted-foreground" />
        {isDraft ? (
          <select aria-label={`מורה עבור ${assignment.station_name}`} value={assignment.teacher_id || ""} onChange={e => onTeacherChange(assignment, e.target.value)} className="h-10 min-w-0 flex-1 rounded-lg border border-input bg-background px-2 text-sm">
            <option value="">ללא מורה</option>
            {teachers.map(teacher => <option key={teacher.id} value={teacher.id}>{teacher.full_name}</option>)}
          </select>
        ) : <span className="min-w-0 flex-1 whitespace-normal break-words py-2 text-sm font-semibold">{assignment.teacher_name || "ללא מורה"}</span>}
        <span className={`mt-2 shrink-0 rounded px-1.5 py-0.5 text-[11px] ${status.class}`}>{status.label}</span>
      </div>
    </div>
  );
}