import React from "react";
import { ArrowRightLeft, Clock, MapPin, X, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BREAK_TYPES, formatDateWithDay, formatTimeRange } from "@/lib/dutyUtils";

const STATUS = {
  pending: ["ממתינה", "status-warning"],
  accepted: ["התקבלה", "status-success"],
  rejected: ["נדחתה", "status-danger"],
  cancelled: ["בוטלה", "status-muted"],
  expired: ["פגה", "status-muted"]
};

export default function SwapCard({ swap, busy, onAccept, onReject, onCancel }) {
  const [statusLabel, statusClass] = STATUS[swap.status] || [swap.status, "status-muted"];
  const bt = BREAK_TYPES[swap.break_type];
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{formatDateWithDay(swap.date)}</span>
        <span className={`rounded-full border px-2 py-0.5 text-xs ${statusClass}`}>{statusLabel}</span>
      </div>
      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        {bt && <span className={`rounded-full border px-2 py-0.5 text-xs ${bt.color}`}>{bt.label}</span>}
        <span className="flex items-center gap-1 text-muted-foreground"><Clock className="h-3.5 w-3.5" />{formatTimeRange(swap.start_time, swap.end_time)}</span>
        <span className="flex items-center gap-1 text-muted-foreground"><MapPin className="h-3.5 w-3.5" />{swap.station_name}</span>
      </div>
      {(onAccept || onReject) && <p className="mb-1 text-xs text-muted-foreground">מבקש/ת: {swap.initiator_name}</p>}
      {swap.target_teacher_name && <p className="mb-1 text-xs text-muted-foreground">מוען אל: {swap.target_teacher_name}</p>}
      {swap.swap_type === "mutual" && swap.offered_date && (
        <p className="mb-1 rounded-lg bg-muted/60 px-2 py-1 text-xs">החלפה הדדית · בתמורה: {formatDateWithDay(swap.offered_date)} {formatTimeRange(swap.offered_start_time, swap.offered_end_time)} · {swap.offered_station_name}</p>
      )}
      {swap.status === "accepted" && swap.accepted_by_name && <p className="mb-1 text-xs text-success">התקבלה על ידי {swap.accepted_by_name}</p>}
      {swap.status === "pending" && (onAccept || onReject || onCancel) && (
        <div className="mt-2 flex gap-2">
          {onAccept && <Button size="sm" onClick={onAccept} disabled={busy} className="h-9 flex-1"><ArrowRightLeft className="ml-1 h-3.5 w-3.5" />{busy ? "מאשר..." : "קבלת ההחלפה"}</Button>}
          {onReject && <Button size="sm" variant="outline" onClick={onReject} disabled={busy} className="h-9 flex-1 text-destructive hover:text-destructive"><XCircle className="ml-1 h-3.5 w-3.5" />דחייה</Button>}
          {onCancel && <Button size="sm" variant="outline" onClick={onCancel} disabled={busy} className="h-9 flex-1"><X className="ml-1 h-3.5 w-3.5" />ביטול בקשה</Button>}
        </div>
      )}
    </div>
  );
}