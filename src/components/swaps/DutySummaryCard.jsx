import React from "react";
import { CalendarDays, Clock, MapPin, User } from "lucide-react";
import { formatDateWithDay, formatTimeRange, BREAK_TYPES } from "@/lib/dutyUtils";

export default function DutySummaryCard({ duty, teacherName }) {
  const bt = BREAK_TYPES[duty.break_type];
  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
      <div className="grid grid-cols-1 gap-1.5 text-sm sm:grid-cols-2">
        <span className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />{formatDateWithDay(duty.date)}</span>
        <span className="flex items-center gap-1.5"><Clock className="h-4 w-4 shrink-0 text-muted-foreground" />{formatTimeRange(duty.start_time, duty.end_time)}</span>
        <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />{duty.station_name}</span>
        <span className="flex items-center gap-1.5"><User className="h-4 w-4 shrink-0 text-muted-foreground" />{teacherName}</span>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{bt?.label}{duty.break_name ? ` · ${duty.break_name}` : ""}</p>
    </div>
  );
}