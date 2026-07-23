import React from "react";
import { fromIso } from "@/lib/scheduleViewUtils";
import WeekTableCell from "./WeekTableCell";

const DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי"];
const TAGS = { big: "גדולה", medium: "בינונית", small: "קטנה" };
const shortDate = value => new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "numeric" }).format(fromIso(value));

export default function WeekView({ dates, breaks, stations, getSlotIds, teachersById, filters, onAdd, onEdit }) {
  const visibleBreaks = breaks.filter(brk => !filters.break_type || brk.break_type === filters.break_type);
  return (
    <div className="lg:relative lg:left-1/2 lg:w-[calc(100vw-18rem)] lg:-translate-x-1/2">
      <div className="max-h-[72vh] overflow-auto scroll-smooth rounded-xl border border-border bg-card shadow-sm overscroll-x-contain">
        <table className="w-full min-w-[1000px] table-fixed border-collapse text-right lg:min-w-full">
          <thead className="sticky top-0 z-20 bg-muted shadow-sm">
            <tr><th className="sticky right-0 z-30 w-48 border-l border-border bg-muted p-3 text-sm">הפסקה · שעה · עמדה</th>{dates.map((date, index) => <th key={date} className="w-40 border-l border-border p-3 text-center"><span className="block text-sm font-bold">{DAYS[index]}</span><span className="text-xs font-normal text-muted-foreground">{shortDate(date)}</span></th>)}</tr>
          </thead>
          <tbody>{visibleBreaks.flatMap(brk => {
            const rows = stations.filter(station => station.active_break_types?.includes(brk.break_type) && (!filters.station_id || station.id === filters.station_id));
            if (!rows.length) return [];
            return [<tr key={`${brk.id}-group`} className="border-t border-border bg-primary/5"><th colSpan={6} className="px-3 py-2 text-sm text-primary">הפסקה {TAGS[brk.break_type]} · {brk.name} · <span dir="ltr">{brk.start_time}–{brk.end_time}</span></th></tr>, ...rows.map(station => <tr key={`${brk.id}-${station.id}`} className="border-t border-border align-top"><th className="sticky right-0 z-10 border-l border-border bg-card p-3"><span className="block text-xs font-medium text-primary">הפסקה {TAGS[brk.break_type]}</span><span className="mt-1 block text-sm font-bold">{station.name}</span><span dir="ltr" className="mt-1 block text-xs font-normal text-muted-foreground">{brk.start_time}–{brk.end_time}</span></th>{dates.map(date => { const allIds = getSlotIds(date, brk.break_type, station.id); const visibleIds = allIds.filter(id => !filters.teacher_id || id === filters.teacher_id); const active = (brk.active_days || []).map(Number).includes(fromIso(date).getDay()); return <td key={date} className="border-l border-border"><WeekTableCell ids={allIds} visibleIds={visibleIds} required={station.staffing_requirements?.[brk.break_type] || 1} teachersById={teachersById} active={active} onAdd={() => onAdd(date, brk, station.id)} onEdit={teacherId => onEdit(date, brk, { stationId: station.id, teacherId })} /></td>; })}</tr>)]
          })}</tbody>
        </table>
        {!visibleBreaks.length && <p className="p-8 text-center text-sm text-muted-foreground">לא נמצאו שיבוצים התואמים לסינון</p>}
      </div>
    </div>
  );
}