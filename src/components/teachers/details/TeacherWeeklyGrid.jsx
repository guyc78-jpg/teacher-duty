import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { HEBREW_DAYS } from "@/lib/dutyUtils";
import LessonEditDialog from "./LessonEditDialog";

const LESSON_TIMES = { 0: "07:30", 1: "08:15", 2: "09:00", 3: "10:00", 4: "11:00", 5: "11:50", 6: "13:00", 7: "13:50", 8: "14:40", 9: "15:30", 10: "16:20", 11: "17:10" };
const cellOf = item => { const lines = (item.class_name || "").split("\n"); return { subject: lines[0] || "", extra: lines.slice(1).join(" · ") }; };

export default function TeacherWeeklyGrid({ teacherId, lessons, editable }) {
  const [items, setItems] = useState(lessons);
  const [active, setActive] = useState(null);
  useEffect(() => { setItems(lessons); }, [lessons]);
  const rows = useMemo(() => {
    const nums = items.map(i => Number(i.lesson_number)).filter(n => n !== null && !isNaN(n));
    if (!nums.length) return [];
    const min = Math.min(...nums), max = Math.max(...nums);
    const list = [];
    for (let n = min; n <= max; n++) list.push(n);
    return list;
  }, [items]);
  const byKey = useMemo(() => new Map(items.map(i => [`${i.day_of_week}|${i.lesson_number}`, i])), [items]);
  const timeFor = n => items.find(i => Number(i.lesson_number) === n)?.start_time || LESSON_TIMES[n] || "";
  const reload = async () => { const fresh = await base44.entities.WeeklySchedule.filter({ teacher_id: teacherId, is_active: true }, "start_time", 200); setItems(fresh); setActive(null); };
  return (
    <div className="max-h-[340px] overflow-auto rounded-lg border border-border">
      <table className="w-full min-w-[36rem] border-collapse text-xs">
        <thead>
          <tr className="sticky top-0 z-10 bg-card">
            <th className="sticky right-0 z-10 border-b border-l border-border bg-card px-2 py-1.5 text-center font-medium text-muted-foreground">שעה</th>
            {[0, 1, 2, 3, 4].map(d => <th key={d} className="border-b border-border px-2 py-1.5 text-center font-semibold">{HEBREW_DAYS[d]}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map(n => (
            <tr key={n}>
              <td className="sticky right-0 z-[1] whitespace-nowrap border-b border-l border-border bg-card px-2 py-1.5 text-center text-muted-foreground">
                <span className="font-semibold text-foreground">{n}</span>
                <span className="block text-[10px]">{timeFor(n)}</span>
              </td>
              {[0, 1, 2, 3, 4].map(d => {
                const item = byKey.get(`${d}|${n}`);
                const cell = item && cellOf(item);
                return (
                  <td key={d} className="border-b border-border p-0.5 align-top">
                    {item ? (
                      <button type="button" onClick={() => setActive(item)} className="block min-h-[2.25rem] w-full rounded-md bg-primary/10 px-2 py-1 text-right transition-colors hover:bg-primary/20">
                        <span className="block truncate font-medium">{cell.subject}</span>
                        {cell.extra && <span className="block truncate text-[10px] text-muted-foreground">{cell.extra}</span>}
                      </button>
                    ) : <div className="min-h-[2.25rem]" />}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {active && <LessonEditDialog lesson={active} editable={editable} onClose={() => setActive(null)} onSaved={reload} />}
    </div>
  );
}