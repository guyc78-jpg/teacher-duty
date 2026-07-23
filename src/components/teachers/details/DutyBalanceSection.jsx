import React from "react";
import { Scale } from "lucide-react";
import DetailSection from "./DetailSection";
import { loadBalance } from "./detailsData";

export default function DutyBalanceSection({ teacher }) {
  return (
    <DetailSection icon={Scale} title="מאזן תורנויות" loader={() => loadBalance(teacher)}>
      {balance => !balance.rule_name ? <p className="text-sm text-muted-foreground">לא נמצא כלל מכסה פעיל התואם לשעות ההוראה של המורה.</p> : (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">לפי מפתח תורנויות: {balance.rule_name}</p>
          <div className="grid grid-cols-3 gap-2">
            {balance.rows.map(row => (
              <div key={row.type} className="rounded-lg border border-border bg-muted/30 p-2 text-center">
                <p className="text-[11px] text-muted-foreground">{row.label}</p>
                <p className="mt-0.5 text-sm font-semibold">{row.assigned} / {row.required}</p>
              </div>
            ))}
          </div>
          <p className={`rounded-lg border px-3 py-2 text-sm font-medium ${balance.diff < 0 ? "status-warning" : balance.diff > 0 ? "status-danger" : "status-success"}`}>
            {balance.diff === 0 ? "המאזן תקין — משובץ בדיוק לפי המכסה" : balance.diff < 0 ? `חוסר של ${-balance.diff} תורנויות מול המכסה` : `חריגה של ${balance.diff} תורנויות מעל המכסה`}
          </p>
        </div>
      )}
    </DetailSection>
  );
}