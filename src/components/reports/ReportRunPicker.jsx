import React from "react";

export default function ReportRunPicker({ reports, week, setWeek, selectedId, setSelectedId }) {
  const weeks = [...new Set(reports.map(item => item.week_key))], visible = week === "all" ? reports : reports.filter(item => item.week_key === week);
  const changeWeek = event => { const value = event.target.value, next = value === "all" ? reports : reports.filter(item => item.week_key === value); setWeek(value); setSelectedId(next[0]?.id || ""); };
  return <div className="grid gap-2 rounded-xl border bg-card p-3 sm:grid-cols-2">
    <select aria-label="סינון לפי שבוע" className="h-10 rounded-md border bg-background px-3" value={week} onChange={changeWeek}><option value="all">כל השבועות</option>{weeks.map(value => <option key={value} value={value}>שבוע {new Date(`${value}T12:00:00`).toLocaleDateString("he-IL")}</option>)}</select>
    <select aria-label="בחירת הרצה" className="h-10 rounded-md border bg-background px-3" value={selectedId || ""} onChange={event => setSelectedId(event.target.value)}>{visible.map(item => <option key={item.id} value={item.id}>{new Date(item.run_at).toLocaleString("he-IL")} · {item.run_by_name}</option>)}</select>
  </div>;
}