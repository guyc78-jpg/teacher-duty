import React from "react";
import { MapPin } from "lucide-react";
import { teacherColor } from "@/lib/teacherColors";

function DutyCard({ teacherId, teacherName, stationName, roleLabel, onClick }) {
  return (
    <button type="button" onClick={onClick} className={`flex min-h-[96px] w-full flex-col justify-center gap-1 rounded-[14px] border p-4 text-right transition-shadow hover:shadow-md ${teacherColor(teacherId)}`}>
      <span className="font-bold leading-5 text-foreground">{teacherName}</span>
      <span className="flex items-center gap-1 text-sm leading-5 text-foreground/75">
        <MapPin className="h-3.5 w-3.5 shrink-0" />
        <span className="min-w-0 break-words">{stationName}</span>
      </span>
      <span className="text-xs text-foreground/60">({roleLabel})</span>
    </button>
  );
}

export default React.memo(DutyCard);