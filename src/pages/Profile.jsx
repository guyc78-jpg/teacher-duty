import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { getCurrentTeacher, DIVISION_LABELS } from "@/lib/dutyUtils";
import { saveOnboarding } from "@/functions/saveOnboarding";
import { Button } from "@/components/ui/button";
import { Check, Save, Edit, Clock } from "lucide-react";
import ChangeRequestForm from "@/components/profile/ChangeRequestForm";
import { NOTIF_PREF_LABELS, DEFAULT_PREFS, ROLE_LABELS, WEEK_DAYS, EXEMPTION_STATUS_LABELS, CHANGE_LABELS, formatChangeValue } from "@/components/onboarding/onboardingConstants";

export default function Profile() {
  const [teacher, setTeacher] = useState(null);
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editing, setEditing] = useState(false);
  const [pendingRequest, setPendingRequest] = useState(null);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const t = await getCurrentTeacher();
    setTeacher(t);
    if (t) {
      if (t.preferences) {
        try { setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(t.preferences) }); } catch {}
      }
      const reqs = await base44.entities.ProfileChangeRequest.filter({ teacher_id: t.id, status: "pending" });
      setPendingRequest(reqs[0] || null);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const togglePref = (key) => {
    if (NOTIF_PREF_LABELS[key].operational) return;
    setPrefs(p => ({ ...p, [key]: !p[key] }));
    setSaved(false);
  };

  const savePrefs = async () => {
    setSaving(true);
    try {
      await saveOnboarding({ action: "preferences", data: { preferences: JSON.stringify(prefs) } });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) { alert("שגיאה בשמירה: " + (err.response?.data?.error || err.message || "")); }
    finally { setSaving(false); }
  };

  if (!teacher) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  const exemption = EXEMPTION_STATUS_LABELS[teacher.exemption_status] || (teacher.is_exempt ? EXEMPTION_STATUS_LABELS.approved : null);

  return (
    <div className="space-y-5 pb-4 max-w-2xl">
      <h1 className="text-2xl font-bold">פרופיל והעדפות</h1>

      {message && <p className="text-sm rounded-lg p-3 border status-success">{message}</p>}

      <div className="rounded-xl border border-border p-4 bg-card space-y-3">
        <h2 className="font-bold">פרטים אישיים</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><span className="text-muted-foreground">שם:</span> {teacher.full_name}</div>
          <div><span className="text-muted-foreground">דוא״ל:</span> {teacher.email}</div>
          <div><span className="text-muted-foreground">מזהה עובד:</span> {teacher.employee_id}</div>
          <div><span className="text-muted-foreground">חטיבה:</span> {DIVISION_LABELS[teacher.division]}</div>
          <div><span className="text-muted-foreground">תפקיד:</span> {ROLE_LABELS[teacher.role] || "מורה"}</div>
          <div><span className="text-muted-foreground">שעות הוראה:</span> {teacher.weekly_teaching_hours}</div>
        </div>
      </div>

      <div className="rounded-xl border border-border p-4 bg-card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">פרטים מקצועיים ושיבוץ</h2>
          {!editing && !pendingRequest && (
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
              <Edit className="w-3.5 h-3.5 ml-1" /> בקש עדכון
            </Button>
          )}
        </div>

        {pendingRequest && (
          <div className="text-sm rounded-lg p-3 border status-warning space-y-1">
            <p className="font-medium flex items-center gap-1"><Clock className="w-4 h-4" /> בקשת עדכון ממתינה לאישור מנהל</p>
            {Object.entries(JSON.parse(pendingRequest.changes || "{}")).map(([k, v]) => (
              <p key={k} className="text-xs">{CHANGE_LABELS[k] || k}: {formatChangeValue(k, v)}</p>
            ))}
          </div>
        )}

        {editing ? (
          <ChangeRequestForm
            teacher={teacher}
            onCancel={() => setEditing(false)}
            onSubmitted={() => { setEditing(false); setMessage("הבקשה נשלחה לאישור מנהל המערכת."); load(); }}
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">מקצוע ראשי:</span> {teacher.subject || "—"}</div>
            <div><span className="text-muted-foreground">מקצועות נוספים:</span> {(teacher.additional_subjects || []).join(", ") || "—"}</div>
            <div><span className="text-muted-foreground">ספורט:</span> {teacher.is_sport_teacher ? "כן" : "לא"}</div>
            <div><span className="text-muted-foreground">מחנך/ת:</span> {teacher.is_homeroom ? `כן${teacher.homeroom_grade ? ` · ${teacher.homeroom_grade}׳${teacher.homeroom_class}` : ""}` : "לא"}</div>
            <div><span className="text-muted-foreground">ימי חופש:</span> {(teacher.days_off || []).map(d => WEEK_DAYS.find(w => w.value === d)?.label).join(", ") || "ללא"}</div>
            <div>
              <span className="text-muted-foreground">פטור מתורנות:</span>{" "}
              {exemption ? <span className={`text-xs px-1.5 py-0.5 rounded border ${exemption.class}`}>{exemption.label}</span> : "לא"}
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border p-4 bg-card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold">העדפות התראות</h2>
          <Button size="sm" onClick={savePrefs} disabled={saving}>
            {saved ? <><Check className="w-4 h-4 ml-1" /> נשמר</> : <><Save className="w-4 h-4 ml-1" /> שמור</>}
          </Button>
        </div>
        <div className="space-y-2">
          {Object.entries(NOTIF_PREF_LABELS).map(([key, { label, operational }]) => (
            <label key={key} className="flex items-center justify-between gap-2 py-2 border-b border-border last:border-0">
              <div className="flex items-center gap-2">
                <span className="text-sm">{label}</span>
                {operational && <span className="text-xs px-1.5 py-0.5 rounded bg-warning/10 text-warning">קריטית</span>}
              </div>
              <button
                onClick={() => togglePref(key)}
                disabled={operational}
                className={`w-10 h-6 rounded-full transition-colors relative ${prefs[key] ? "bg-primary" : "bg-muted"} ${operational ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${prefs[key] ? "right-0.5" : "right-4"}`} />
              </button>
            </label>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-3">התראות תפעוליות קריטיות נשארות פעילות תמיד.</p>
      </div>
    </div>
  );
}