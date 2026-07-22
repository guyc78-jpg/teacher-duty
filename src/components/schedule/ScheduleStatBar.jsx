import React from "react";

export default function ScheduleStatBar({ stats }) {
  const items = [
    ["נדרשות", stats.required], ["מאוישות", stats.covered], ["חסרות", stats.missing],
    ["התנגשויות", stats.conflicts], ["חריגות", stats.warnings]
  ];
  return <div className="grid grid-cols-5 overflow-hidden rounded-xl border border-border bg-card">{items.map(([label, value]) => <div key={label} className="border-l border-border p-2 text-center last:border-l-0"><p className="text-base font-bold">{value}</p><p className="text-[10px] text-muted-foreground sm:text-xs">{label}</p></div>)}</div>;
}