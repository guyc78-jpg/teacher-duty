import React, { useState } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { Link } from "react-router-dom";
import { BREAKS } from "@/lib/scheduleViewUtils";

export default function SchedulerMorePanel({ filters, setFilters, stations, teachers }) {
  const [open, setOpen] = useState(false);
  const select = "h-10 min-w-0 flex-1 basis-40 rounded-lg border border-input bg-background px-2 text-sm";
  const active = Object.values(filters).filter(Boolean).length;
  return (
    <div className="rounded-xl border border-border bg-card">
      <button type="button" onClick={() => setOpen(!open)} className="flex min-h-11 w-full items-center justify-between px-3 text-sm font-medium">
        <span className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4" />
          סינון ואפשרויות נוספות
          {active > 0 && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{active}</span>}
        </span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="space-y-3 border-t border-border p-3">
          <div className="flex flex-wrap gap-2">
            <select aria-label="סינון לפי הפסקה" value={filters.break_type} onChange={e => setFilters({ ...filters, break_type: e.target.value })} className={select}>
              <option value="">כל ההפסקות</option>
              {BREAKS.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}
            </select>
            <select aria-label="סינון לפי עמדה" value={filters.station_id} onChange={e => setFilters({ ...filters, station_id: e.target.value })} className={select}>
              <option value="">כל העמדות</option>
              {stations.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <select aria-label="סינון לפי מורה" value={filters.teacher_id} onChange={e => setFilters({ ...filters, teacher_id: e.target.value })} className={select}>
              <option value="">כל המורים</option>
              {teachers.map(item => <option key={item.id} value={item.id}>{item.full_name}</option>)}
            </select>
          </div>
          <Link to="/fixed-schedule" className="inline-block text-sm font-medium text-primary hover:underline">עריכת הלוח הקבוע ופרסום ←</Link>
        </div>
      )}
    </div>
  );
}