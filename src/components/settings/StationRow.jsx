import React from "react";
import { Edit, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DIVISION_LABELS } from "@/lib/dutyUtils";

export default function StationRow({ station, onEdit }) {
  const staffing = station.staffing_requirements || {};
  return (
    <div className="rounded-lg border border-border bg-card px-2.5 py-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-semibold"><MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /><span className="break-words">{station.name}</span></p>
          <p className="mt-0.5 text-xs text-muted-foreground">{DIVISION_LABELS[station.division]}{station.level ? ` · מפלס ${station.level}` : ""}{station.is_sport_station ? " · ספורט" : ""}</p>
        </div>
        <Button aria-label={`עריכת ${station.name}`} variant="ghost" size="icon" onClick={() => onEdit(station)} className="h-8 w-8 shrink-0"><Edit /></Button>
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1 text-[11px]">
        <span className="rounded bg-muted px-1.5 py-0.5">גדולה {staffing.big || 1}</span>
        <span className="rounded bg-muted px-1.5 py-0.5">בינונית {staffing.medium || 1}</span>
        <span className="rounded bg-muted px-1.5 py-0.5">קטנה {staffing.small || 1}</span>
      </div>
    </div>
  );
}