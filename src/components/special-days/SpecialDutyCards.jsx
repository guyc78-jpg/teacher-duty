import React from "react";
import { CalendarRange, Clock, MapPin } from "lucide-react";
import { formatDateWithDay, formatTimeRange } from "@/lib/dutyUtils";

export default function SpecialDutyCards({ assignments, title = "תורנויות ביום מיוחד" }) {
  if (!assignments?.length) return null;
  return <section><h2 className="mb-2 font-bold">{title}</h2><div className="space-y-2">{assignments.map(a => <article key={a.id} className="rounded-xl border border-primary/30 border-r-4 border-r-primary bg-card p-3 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-2"><span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-bold text-primary"><CalendarRange className="ml-1 inline h-3.5 w-3.5" />{a.special_day_name}</span><span className="text-xs text-muted-foreground">{formatDateWithDay(a.date)}</span></div><div className="mt-3 grid gap-2 text-sm sm:grid-cols-2"><p className="flex items-center gap-2"><Clock className="h-4 w-4 text-primary" />{a.time_slot_name} · {formatTimeRange(a.start_time, a.end_time)}</p><p className="flex items-center gap-2 font-semibold"><MapPin className="h-4 w-4 text-primary" />{a.position_name}</p></div>{a.position_instructions && <p className="mt-2 whitespace-pre-wrap rounded-lg bg-muted/60 p-2 text-sm">{a.position_instructions}</p>}</article>)}</div></section>;
}