import React from "react";
import { ClipboardList, Clock, MapPin } from "lucide-react";
import DetailSection from "./DetailSection";
import { loadFixedDuties } from "./detailsData";
import { formatTimeRange } from "@/lib/dutyUtils";

export default function FixedDutiesSection({ teacherId }) {
  return (
    <DetailSection icon={ClipboardList} title="תורנויות קבועות" defaultOpen loader={() => loadFixedDuties(teacherId)}>
      {duties => duties.length === 0 ? <p className="text-sm text-muted-foreground">אין תורנויות קבועות בלוח הפעיל.</p> : (
        <div className="grid gap-2 sm:grid-cols-2">
          {duties.map(duty => (
            <div key={duty.key} className="rounded-lg border border-border bg-muted/30 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold">יום {duty.day_name} · {duty.break_label}</span>
                <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">קבועה</span>
              </div>
              <div className="mt-1.5 space-y-0.5 text-xs text-muted-foreground">
                {duty.start_time && <p className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatTimeRange(duty.start_time, duty.end_time)}</p>}
                <p className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {duty.station_name}{duty.area ? ` · ${duty.area}` : ""}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </DetailSection>
  );
}