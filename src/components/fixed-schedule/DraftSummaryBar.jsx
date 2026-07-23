import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function DraftSummaryBar({ summary, reportId }) {
  if (!summary || !reportId) return null;
  const metrics = [
    ["שובצו", summary.assigned || 0], ["חסרים", summary.missing || 0],
    ["חריגות", summary.deviations || 0], ["מורים שלא שובצו", summary.not_assigned || 0]
  ];
  return <section className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-2" aria-label="סיכום שיבוץ אוטומטי">
    <div className="grid min-w-0 flex-1 grid-cols-2 gap-1 sm:grid-cols-4">{metrics.map(([label, value]) => <div key={label} className="rounded-lg bg-muted px-2 py-1.5 text-center"><span className="font-bold">{value}</span><span className="mr-1 text-xs text-muted-foreground">{label}</span></div>)}</div>
    <Button asChild size="sm"><Link to={`/reports?report=${reportId}`}>צפה בדוח</Link></Button>
  </section>;
}