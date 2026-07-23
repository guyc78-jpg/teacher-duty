import React from "react";
import { AlertTriangle } from "lucide-react";
import DetailSection from "./DetailSection";
import { loadAlerts } from "./detailsData";

export default function AdminAlertsSection({ teacher }) {
  return (
    <DetailSection icon={AlertTriangle} title="התראות מנהל" loader={() => loadAlerts(teacher)}>
      {alerts => alerts.length === 0 ? <p className="text-sm text-muted-foreground">אין התראות — הכל תקין.</p> : (
        <div className="space-y-2">
          {alerts.map((alert, index) => (
            <p key={index} className={`rounded-lg border px-3 py-2 text-sm ${alert.tone}`}>{alert.text}</p>
          ))}
        </div>
      )}
    </DetailSection>
  );
}