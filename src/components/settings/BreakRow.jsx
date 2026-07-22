import React from "react";
import { ArrowDown, ArrowUp, Edit, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BREAK_TYPES, formatTimeRange } from "@/lib/dutyUtils";

export default function BreakRow({ item, index, total, onEdit, onMove }) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-2">
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 sm:grid-cols-[minmax(0,1fr)_5rem_8rem]">
        <span className="min-w-0 text-sm font-semibold">{item.name}</span>
        <span className="text-xs text-muted-foreground">{BREAK_TYPES[item.break_type]?.label}</span>
        <span dir="ltr" className="col-span-2 flex items-center gap-1 text-xs text-muted-foreground sm:col-span-1"><Clock className="h-3.5 w-3.5" />{formatTimeRange(item.start_time, item.end_time)}</span>
      </div>
      <div className="flex shrink-0 gap-0.5">
        <Button aria-label={`העבר את ${item.name} למעלה`} variant="ghost" size="icon" disabled={index === 0} onClick={() => onMove(index, -1)} className="h-8 w-8"><ArrowUp /></Button>
        <Button aria-label={`העבר את ${item.name} למטה`} variant="ghost" size="icon" disabled={index === total - 1} onClick={() => onMove(index, 1)} className="h-8 w-8"><ArrowDown /></Button>
        <Button aria-label={`עריכת ${item.name}`} variant="ghost" size="icon" onClick={() => onEdit(item)} className="h-8 w-8"><Edit /></Button>
      </div>
    </div>
  );
}