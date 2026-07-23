import React from "react";
import { Repeat } from "lucide-react";
import DetailSection from "./DetailSection";
import { loadSwaps } from "./detailsData";
import { formatDate, formatTimeRange } from "@/lib/dutyUtils";

function SwapLine({ swap, badge, tone }) {
  return (
    <div className="flex items-start justify-between gap-2 rounded-lg border border-border bg-muted/30 p-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">{swap.station_name} · {swap.break_name}</p>
        <p className="text-xs text-muted-foreground">{formatDate(swap.date)} · {formatTimeRange(swap.start_time, swap.end_time)}</p>
      </div>
      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium ${tone}`}>{badge}</span>
    </div>
  );
}

export default function SwapsSection({ teacherId }) {
  return (
    <DetailSection icon={Repeat} title="החלפות" loader={() => loadSwaps(teacherId)}>
      {swaps => swaps.open.length === 0 && swaps.future.length === 0 ? <p className="text-sm text-muted-foreground">אין בקשות החלפה פתוחות או החלפות עתידיות.</p> : (
        <div className="space-y-2">
          {swaps.open.map(swap => <SwapLine key={swap.id} swap={swap} badge="בקשה פתוחה" tone="status-warning" />)}
          {swaps.future.map(swap => <SwapLine key={swap.id} swap={swap} badge={swap.accepted_by_id === teacherId ? "החלפה שהתקבלה" : "הוחלפה"} tone="status-success" />)}
        </div>
      )}
    </DetailSection>
  );
}