import React from "react";
import { CheckCircle2, CircleAlert, Users } from "lucide-react";

function FixedDutyCard({ station, assignment, breakType, onClick }) {
  const required = station.staffing_requirements?.[breakType] || 1, names = assignment?.teacher_names || [], full = names.length >= required;
  return <button onClick={onClick} className={`w-full rounded-xl border p-3 text-right transition-colors hover:border-primary ${full ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5"}`}>
    <div className="flex items-start justify-between gap-2"><div className="min-w-0"><h3 className="font-semibold leading-5 whitespace-normal break-words">{station.name}</h3><p className="text-xs text-muted-foreground whitespace-normal break-words">{station.area || "ללא אזור"}</p></div>{full ? <CheckCircle2 className="h-5 w-5 shrink-0 text-success" /> : <CircleAlert className="h-5 w-5 shrink-0 text-destructive" />}</div>
    <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground"><Users className="h-3.5 w-3.5" />נדרשים {required} · שובצו {names.length}</div>
    <p className={`mt-2 text-sm leading-5 whitespace-normal break-words ${names.length ? "text-foreground" : "text-destructive"}`}>{names.length ? names.join(" · ") : "טרם שובצו מורים"}</p>
  </button>;
}

export default React.memo(FixedDutyCard, (previous, next) => previous.station === next.station && previous.assignment === next.assignment && previous.breakType === next.breakType);