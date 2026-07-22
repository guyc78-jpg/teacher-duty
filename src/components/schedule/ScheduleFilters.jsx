import React from "react";

const field = "h-10 min-w-0 rounded-lg border border-input bg-background px-2 text-sm";
export default function ScheduleFilters({ filters, setFilters, stations, teachers }) {
  const set = (key, value) => setFilters(current => ({ ...current, [key]: value }));
  return <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-card p-2 sm:grid-cols-5">
    <select aria-label="סינון לפי הפסקה" className={field} value={filters.break_type} onChange={e => set("break_type", e.target.value)}><option value="">כל ההפסקות</option><option value="big">גדולה</option><option value="medium">בינונית</option><option value="small">קטנה</option></select>
    <select aria-label="סינון לפי חטיבה" className={field} value={filters.division} onChange={e => set("division", e.target.value)}><option value="">כל החטיבות</option><option value="middle">ביניים</option><option value="high">עליונה</option><option value="both">שתיהן</option></select>
    <select aria-label="סינון לפי מפלס" className={field} value={filters.level} onChange={e => set("level", e.target.value)}><option value="">כל המפלסים</option>{[...new Set(stations.map(s => s.level).filter(Boolean))].map(v => <option key={v}>{v}</option>)}</select>
    <select aria-label="סינון לפי עמדה" className={field} value={filters.station_id} onChange={e => set("station_id", e.target.value)}><option value="">כל העמדות</option>{stations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
    <select aria-label="סינון לפי מורה" className={`${field} col-span-2 sm:col-span-1`} value={filters.teacher_id} onChange={e => set("teacher_id", e.target.value)}><option value="">כל המורים</option>{teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}</select>
  </div>;
}