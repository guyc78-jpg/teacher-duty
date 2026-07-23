import React from "react";
import { CalendarClock } from "lucide-react";
import DetailSection from "./DetailSection";
import { loadUpcomingChanges } from "./detailsData";
import { formatDate } from "@/lib/dutyUtils";

export default function UpcomingChangesSection({ teacher }) {
  return (
    <DetailSection icon={CalendarClock} title="שינויים קרובים" loader={() => loadUpcomingChanges(teacher)}>
      {items => items.length === 0 ? <p className="text-sm text-muted-foreground">אין שינויים קרובים.</p> : (
        <div className="space-y-2">
          {items.map(item => (
            <div key={item.id} className="flex items-start justify-between gap-2 rounded-lg border border-border bg-muted/30 p-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground">{formatDate(item.date)}{item.note ? ` · ${item.note}` : ""}</p>
              </div>
              <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium ${item.tone}`}>{item.status}</span>
            </div>
          ))}
        </div>
      )}
    </DetailSection>
  );
}