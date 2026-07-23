import React, { useEffect, useState } from "react";
import { CalendarX, Loader2 } from "lucide-react";
import { manageSwapRequest } from "@/functions/manageSwapRequest";
import { formatDateWithDay, formatTimeRange } from "@/lib/dutyUtils";

export default function PartnerDutyPicker({ targetId, onSelect }) {
  const [duties, setDuties] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    setDuties(null);
    setError("");
    manageSwapRequest({ action: "partner_duties", target_teacher_id: targetId })
      .then(response => { if (alive) setDuties(response.data.duties || []); })
      .catch(loadError => { if (alive) { setDuties([]); setError(loadError.response?.data?.error || "טעינת התורנויות נכשלה"); } });
    return () => { alive = false; };
  }, [targetId]);

  if (duties === null) return <div className="flex justify-center py-5"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  if (error) return <p role="alert" className="text-sm text-destructive">{error}</p>;
  if (!duties.length) return (
    <div className="rounded-lg border border-dashed border-border py-5 text-center text-sm text-muted-foreground">
      <CalendarX className="mx-auto mb-1.5 h-6 w-6" />
      אין למורה זה תורנויות קרובות שאת/ה פנוי/ה לקחת
    </div>
  );
  return (
    <div className="max-h-48 space-y-1.5 overflow-y-auto">
      {duties.map(duty => (
        <button key={duty.key} onClick={() => onSelect(duty)} className="w-full rounded-lg border border-border bg-card p-2.5 text-right text-sm hover:border-primary">
          <span className="block font-medium">{formatDateWithDay(duty.date)} · {formatTimeRange(duty.start_time, duty.end_time)}</span>
          <span className="block text-xs text-muted-foreground">{duty.station_name} · {duty.break_name}</span>
        </button>
      ))}
    </div>
  );
}