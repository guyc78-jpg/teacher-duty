import React from "react";

export default function ReportSummary({ report }) {
  const values = [
    ["נדרשו", report.summary.required], ["שובצו", report.summary.assigned], ["חסרים", report.summary.missing],
    ["מתחת למכסה", report.under_quota.length], ["מעל המכסה", report.over_quota.length], ["לא שובצו", report.not_assigned.length]
  ];
  return <section><h2 className="mb-2 font-bold">סיכום הכיסוי השבועי</h2><div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">{values.map(([label, value]) => <div key={label} className="rounded-xl border bg-card p-3 text-center"><p className="text-xl font-bold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>)}</div></section>;
}