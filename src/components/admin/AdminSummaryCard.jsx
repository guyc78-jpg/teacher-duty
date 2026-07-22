import React from "react";

export default function AdminSummaryCard({ stats }) {
  return (
    <section className="rounded-xl border border-border bg-card p-2.5 shadow-sm" aria-labelledby="summary-title">
      <h2 id="summary-title" className="px-1 pb-2 text-sm font-bold">סיכום היום</h2>
      <div className="grid grid-cols-2 divide-x divide-x-reverse divide-y divide-border sm:grid-cols-3">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="flex min-h-16 items-center gap-2 px-2 py-2">
            <Icon className={`h-4 w-4 shrink-0 ${color}`} />
            <div>
              <p className="text-lg font-bold leading-none">{value}</p>
              <p className="mt-1 text-[11px] leading-tight text-muted-foreground">{label}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}