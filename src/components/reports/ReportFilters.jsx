import React from "react";
import { Input } from "@/components/ui/input";

export default function ReportFilters({ filters, setFilters, report }) {
  const duties = report?.teachers?.flatMap(item => item.duties || []) || [];
  const slots = [...(report?.unfilled || []), ...(report?.conflicts || []), ...duties];
  const stations = [...new Map(slots.filter(item => item.station_id).map(item => [item.station_id, item.station_name])).entries()];
  const update = event => setFilters(current => ({ ...current, [event.target.name]: event.target.value }));
  return <div className="grid gap-2 rounded-xl border bg-card p-3 sm:grid-cols-2 xl:grid-cols-6">
    <Input name="search" value={filters.search} onChange={update} placeholder="חיפוש בדוח" />
    <Select name="day" value={filters.day} onChange={update} options={[["all", "כל הימים"], ...["ראשון", "שני", "שלישי", "רביעי", "חמישי"].map((label, index) => [index, label])]} />
    <Select name="breakType" value={filters.breakType} onChange={update} options={[["all", "כל ההפסקות"], ["big", "גדולה"], ["medium", "בינונית"], ["small", "קטנה"]]} />
    <Select name="station" value={filters.station} onChange={update} options={[["all", "כל העמדות"], ...stations]} />
    <Select name="teacher" value={filters.teacher} onChange={update} options={[["all", "כל המורים"], ...(report?.teachers || []).map(item => [item.teacher_id, item.teacher_name])]} />
  </div>;
}
function Select({ options, ...props }) { return <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" {...props}>{options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>; }