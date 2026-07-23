import React from "react";
import { ShieldCheck } from "lucide-react";
import DetailSection from "./DetailSection";
import { loadAvailability } from "./detailsData";

const exemptionLabels = { pending: "בקשת פטור ממתינה", approved: "פטור מאושר", rejected: "בקשת פטור נדחתה" };

export default function AvailabilitySection({ teacher }) {
  return (
    <DetailSection icon={ShieldCheck} title="זמינות ומגבלות" loader={() => loadAvailability(teacher)}>
      {info => {
        const rows = [
          ["ימי חופש קבועים", info.days_off.length ? info.days_off.join(", ") : "אין"],
          ["ימים עמוסים", info.busy_days.length ? info.busy_days.join(", ") : "אין"],
          ["פטור מתורנות", teacher.is_exempt ? "כן" : exemptionLabels[teacher.exemption_status] || "לא"],
          ["בקשות מיוחדות", teacher.preferences || "לא הוזן"],
          ["אילוצים", teacher.constraints || "לא הוזן"],
          ["עמדות מותרות בלבד", info.allowed.length ? info.allowed.join(", ") : "כל העמדות"],
          ["עמדות קבועות", info.fixed.length ? info.fixed.join(", ") : "אין"]
        ];
        return (
          <dl className="space-y-2.5">
            {rows.map(([label, value]) => (
              <div key={label} className="flex items-start justify-between gap-3">
                <dt className="shrink-0 text-xs text-muted-foreground">{label}</dt>
                <dd className="text-left text-sm font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        );
      }}
    </DetailSection>
  );
}