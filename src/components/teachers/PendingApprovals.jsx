import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, ClipboardCheck } from "lucide-react";
import { CHANGE_LABELS, formatChangeValue } from "@/components/onboarding/onboardingConstants";

export default function PendingApprovals({ onChanged }) {
  const [requests, setRequests] = useState([]);
  const [exemptions, setExemptions] = useState([]);
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    const [reqs, ex] = await Promise.all([
      base44.entities.ProfileChangeRequest.filter({ status: "pending" }),
      base44.entities.TeacherProfile.filter({ exemption_status: "pending" })
    ]);
    setRequests(reqs);
    // פטורים מהקליטה שאין להם בקשת שינוי פתוחה
    const reqTeacherIds = new Set(reqs.filter(r => JSON.parse(r.changes || "{}").request_exemption !== undefined).map(r => r.teacher_id));
    setExemptions(ex.filter(t => !reqTeacherIds.has(t.id)));
  }, []);

  useEffect(() => { load(); }, [load]);

  const applyRequest = async (r, approve) => {
    setBusy(r.id);
    try {
      const changes = JSON.parse(r.changes || "{}");
      if (approve) {
        const updates = { ...changes };
        if ("request_exemption" in updates) {
          updates.is_exempt = !!updates.request_exemption;
          updates.exemption_status = updates.request_exemption ? "approved" : "none";
          delete updates.request_exemption;
        }
        await base44.entities.TeacherProfile.update(r.teacher_id, updates);
      } else if (changes.request_exemption) {
        await base44.entities.TeacherProfile.update(r.teacher_id, { exemption_status: "rejected" });
      }
      await base44.entities.ProfileChangeRequest.update(r.id, { status: approve ? "approved" : "rejected", reviewed_at: new Date().toISOString() });
      await load();
      onChanged?.();
    } catch (err) { alert("שגיאה: " + (err.message || "")); }
    finally { setBusy(""); }
  };

  const decideExemption = async (t, approve) => {
    setBusy(t.id);
    try {
      await base44.entities.TeacherProfile.update(t.id, {
        is_exempt: approve,
        exemption_status: approve ? "approved" : "rejected"
      });
      await load();
      onChanged?.();
    } catch (err) { alert("שגיאה: " + (err.message || "")); }
    finally { setBusy(""); }
  };

  if (requests.length === 0 && exemptions.length === 0) return null;

  return (
    <div className="rounded-xl border border-warning/40 bg-warning/5 p-4 space-y-3">
      <h2 className="font-bold flex items-center gap-2 text-sm">
        <ClipboardCheck className="w-4 h-4 text-warning" />
        ממתינים לאישור מנהל/ת ({requests.length + exemptions.length})
      </h2>

      {exemptions.map(t => (
        <div key={t.id} className="rounded-lg border border-border bg-card p-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="text-sm">
            <span className="font-medium">{t.full_name}</span>
            <span className="text-muted-foreground"> · בקשת פטור מתורנות</span>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={busy === t.id} onClick={() => decideExemption(t, true)}>
              <CheckCircle2 className="w-4 h-4 ml-1 text-success" /> אשר
            </Button>
            <Button size="sm" variant="outline" disabled={busy === t.id} onClick={() => decideExemption(t, false)}>
              <XCircle className="w-4 h-4 ml-1 text-destructive" /> דחה
            </Button>
          </div>
        </div>
      ))}

      {requests.map(r => {
        const changes = JSON.parse(r.changes || "{}");
        return (
          <div key={r.id} className="rounded-lg border border-border bg-card p-3 space-y-2">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <span className="font-medium text-sm">{r.teacher_name} · בקשת עדכון פרטים</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={busy === r.id} onClick={() => applyRequest(r, true)}>
                  <CheckCircle2 className="w-4 h-4 ml-1 text-success" /> אשר
                </Button>
                <Button size="sm" variant="outline" disabled={busy === r.id} onClick={() => applyRequest(r, false)}>
                  <XCircle className="w-4 h-4 ml-1 text-destructive" /> דחה
                </Button>
              </div>
            </div>
            <div className="text-xs text-muted-foreground space-y-0.5">
              {Object.entries(changes).map(([k, v]) => (
                <div key={k}>{CHANGE_LABELS[k] || k}: <span className="text-foreground">{formatChangeValue(k, v)}</span></div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}