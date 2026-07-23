import React from "react";
import FixedDutyCard from "@/components/fixed-schedule/FixedDutyCard";

export default function FixedBreakSection({ brk, stations, assignments, day, onOpen }) {
  const active = stations.filter(station => station.active_break_types?.includes(brk.break_type));
  return <section className="overflow-hidden rounded-2xl border bg-card"><div className="border-b bg-muted/60 px-4 py-3"><h2 className="font-bold">{brk.name}</h2><p className="text-xs text-muted-foreground" dir="ltr">{brk.start_time}–{brk.end_time}</p></div><div className="grid gap-2 p-3 sm:grid-cols-2 xl:grid-cols-3">{active.map(station => { const assignment = assignments.find(item => item.day_of_week === day && item.break_type === brk.break_type && item.station_id === station.id); return <FixedDutyCard key={station.id} day={day} station={station} assignment={assignment} breakType={brk.break_type} onClick={() => onOpen({ station, brk, assignment })} />; })}</div></section>;
}