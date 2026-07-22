import React from "react";
import { AlertTriangle, Eye, XCircle } from "lucide-react";

const alertStyles = {
  destructive: "border-destructive/30 bg-destructive/5 text-destructive",
  warning: "border-warning/30 bg-warning/5 text-warning",
};

export default function AdminAlerts({ uncoveredCount, unconfirmedCount, incidentCount }) {
  const alerts = [
    { label: "עמדות ללא כיסוי", value: uncoveredCount, icon: XCircle, tone: "destructive" },
    { label: "אי־אישורי הגעה", value: unconfirmedCount, icon: Eye, tone: "warning" },
    { label: "אירועים פתוחים", value: incidentCount, icon: AlertTriangle, tone: "destructive" },
  ].filter((item) => item.value > 0);

  if (!alerts.length) return null;

  return (
    <section aria-labelledby="active-alerts-title">
      <h2 id="active-alerts-title" className="mb-2 text-sm font-bold">חריגות פעילות</h2>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {alerts.map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className={`flex items-center gap-3 rounded-lg border p-3 ${alertStyles[tone]}`}>
            <Icon className="h-5 w-5 shrink-0" />
            <div className="min-w-0">
              <p className="text-xl font-bold leading-none">{value}</p>
              <p className="mt-1 text-xs font-medium text-foreground">{label}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}