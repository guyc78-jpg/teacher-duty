import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { heDate } from "@/lib/scheduleViewUtils";
import { Link } from "react-router-dom";

export default function WeeklyScheduleView({ dates, assignments, summaries, onOpenDay, specialDays = [] }) {
  const [expanded, setExpanded] = useState("");
  return <div className="space-y-2">{dates.map(date => { const day = summaries[date], special = specialDays.find(s => s.date === date); const open = expanded === date; return <section key={date} className="rounded-xl border border-border bg-card">
    <div className="flex items-center gap-2 p-3"><button className="min-w-0 flex-1 text-right" onClick={() => onOpenDay(date)}><h3 className="font-bold">{heDate(date)}</h3><p className="mt-1 text-xs text-muted-foreground">{day.assignments} שיבוצים · {day.missing} חסרים · {day.conflicts} התנגשויות · {day.warnings} חריגות</p></button>{special && <Link to={`/special-days/${special.id}`} className="rounded-full bg-primary px-2 py-1 text-xs font-bold text-primary-foreground">{special.name}</Link>}<span className={`rounded-full px-2 py-1 text-xs font-semibold ${day.statusClass}`}>{day.status}</span><button className="hidden min-h-11 min-w-11 items-center justify-center lg:flex" aria-label="הרחבת יום" onClick={() => setExpanded(open ? "" : date)}>{open ? <ChevronUp /> : <ChevronDown />}</button></div>
    {open && <div className="hidden grid-cols-3 gap-2 border-t border-border p-3 lg:grid">{["big","medium","small"].map(type => <div key={type} className="rounded-lg bg-muted/50 p-2 text-sm">{assignments.filter(a => a.date === date && a.break_type === type).map(a => <p key={a.id} className="whitespace-normal py-1"><strong>{a.station_name}:</strong> {a.teacher_name || "חסר"}</p>)}</div>)}</div>}
  </section>; })}</div>;
}