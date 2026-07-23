import React from "react";
import { Clock, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import ChangeRequestForm from "@/components/profile/ChangeRequestForm";
import { CHANGE_LABELS, EXEMPTION_STATUS_LABELS, WEEK_DAYS, formatChangeValue } from "@/components/onboarding/onboardingConstants";

export default function ProfessionalProfileSection({ teacher, pendingRequest, editing, setEditing, onSubmitted }) {
  const isAdmin = teacher.role === "admin";
  const exemption = EXEMPTION_STATUS_LABELS[teacher.exemption_status] || (teacher.is_exempt ? EXEMPTION_STATUS_LABELS.approved : null);
  const rows = [
    ["מקצוע ראשי", teacher.subject || "—"],
    ["מקצועות נוספים", (teacher.additional_subjects || []).join(", ") || "—"],
    ["מורה לספורט", teacher.is_sport_teacher ? "כן" : "לא"],
    ["חינוך כיתה", teacher.is_homeroom ? `כן${teacher.homeroom_grade ? ` · ${teacher.homeroom_grade}׳${teacher.homeroom_class}` : ""}` : "לא"],
    ["ימי חופש", (teacher.days_off || []).map(day => WEEK_DAYS.find(item => item.value === day)?.label).filter(Boolean).join(", ") || "ללא"]
  ];

  return (
    <section className="rounded-xl border border-border bg-card px-4">
      <div className="flex min-h-14 items-center justify-between gap-3 border-b border-border py-2">
        <h2 className="text-base font-bold">פרטים מקצועיים ושיבוץ</h2>
        {!editing && (isAdmin || !pendingRequest) && <Button size="sm" variant="outline" onClick={() => setEditing(true)}><Edit className="h-3.5 w-3.5" />{isAdmin ? "עריכה" : "בקשת שינוי"}</Button>}
      </div>
      {pendingRequest && (
        <div className="my-3 rounded-lg border p-3 text-sm status-warning">
          <p className="flex items-center gap-1 font-medium"><Clock className="h-4 w-4" />בקשת שינוי ממתינה לאישור מנהל/ת</p>
          {Object.entries(JSON.parse(pendingRequest.changes || "{}")).map(([key, value]) => <p key={key} className="mt-1 text-xs">{CHANGE_LABELS[key] || key}: {formatChangeValue(key, value)}</p>)}
        </div>
      )}
      {editing ? <ChangeRequestForm teacher={teacher} directSave={isAdmin} onCancel={() => setEditing(false)} onSubmitted={onSubmitted} /> : (
        <>
          <div className="divide-y divide-border">
            {rows.map(([label, value]) => <div key={label} className="flex min-h-11 items-center justify-between gap-4 py-2 text-sm"><span className="shrink-0 text-muted-foreground">{label}</span><span className="min-w-0 text-left font-medium">{value}</span></div>)}
            <div className="flex min-h-11 items-center justify-between gap-4 py-2 text-sm"><span className="text-muted-foreground">פטור מתורנות</span>{exemption ? <span className={`rounded border px-1.5 py-0.5 text-xs ${exemption.class}`}>{exemption.label}</span> : <span className="font-medium">לא</span>}</div>
          </div>
          {!isAdmin && <p className="border-t border-border py-3 text-xs text-muted-foreground">שינוי מקצוע, חינוך, ימי חופש או פטור ייכנס לתוקף רק לאחר אישור מנהל/ת.</p>}
        </>
      )}
    </section>
  );
}