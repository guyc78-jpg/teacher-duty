import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { getCurrentTeacher, DIVISION_LABELS } from "@/lib/dutyUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Check, Save } from "lucide-react";

export default function Profile() {
  const [teacher, setTeacher] = useState(null);
  const [prefs, setPrefs] = useState({
    notify_duty_reminder: true,
    notify_plan_published: true,
    notify_assignment_change: true,
    notify_swap_request: true,
    notify_swap_accepted: true,
    notify_swap_rejected: true,
    notify_uncovered_station: false,
    notify_missing_arrival: true,
    notify_incident: true
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const t = await getCurrentTeacher();
      setTeacher(t);
      if (t?.preferences) {
        try { setPrefs(JSON.parse(t.preferences)); } catch {}
      }
    })();
  }, []);

  const togglePref = (key) => {
    setPrefs(p => ({ ...p, [key]: !p[key] }));
    setSaved(false);
  };

  const savePrefs = async () => {
    setSaving(true);
    try {
      await base44.entities.TeacherProfile.update(teacher.id, { preferences: JSON.stringify(prefs) });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) { alert("שגיאה בשמירה: " + (err.message || "")); }
    finally { setSaving(false); }
  };

  if (!teacher) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  const prefLabels = {
    notify_duty_reminder: { label: "תזכורת תורנות", operational: true },
    notify_plan_published: { label: "פרסום לוח", operational: false },
    notify_assignment_change: { label: "שינוי שיבוץ", operational: true },
    notify_swap_request: { label: "בקשת החלפה", operational: false },
    notify_swap_accepted: { label: "החלפה התקבלה", operational: false },
    notify_swap_rejected: { label: "החלפה נדחתה/בוטלה", operational: false },
    notify_uncovered_station: { label: "עמדה ללא כיסוי", operational: false },
    notify_missing_arrival: { label: "אי־אישור הגעה", operational: true },
    notify_incident: { label: "אירוע חריג", operational: true }
  };

  return (
    <div className="space-y-5 pb-4 max-w-2xl">
      <h1 className="text-2xl font-bold">פרופיל והעדפות</h1>

      <div className="rounded-xl border border-border p-4 bg-card space-y-3">
        <h2 className="font-bold">פרטים אישיים</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><span className="text-muted-foreground">שם:</span> {teacher.full_name}</div>
          <div><span className="text-muted-foreground">דוא״ל:</span> {teacher.email}</div>
          <div><span className="text-muted-foreground">מזהה עובד:</span> {teacher.employee_id}</div>
          <div><span className="text-muted-foreground">חטיבה:</span> {DIVISION_LABELS[teacher.division]}</div>
          <div><span className="text-muted-foreground">מקצוע:</span> {teacher.subject || "—"}</div>
          <div><span className="text-muted-foreground">תפקיד:</span> {teacher.role === "admin" ? "מנהל" : teacher.role === "coordinator" ? "רכז" : teacher.is_homeroom ? "מחנך" : "מורה"}</div>
          <div><span className="text-muted-foreground">שעות הוראה:</span> {teacher.weekly_teaching_hours}</div>
          <div><span className="text-muted-foreground">ספורט:</span> {teacher.is_sport_teacher ? "כן" : "לא"}</div>
        </div>
      </div>

      <div className="rounded-xl border border-border p-4 bg-card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold">העדפות התראות</h2>
          <Button size="sm" onClick={savePrefs} disabled={saving}>
            {saved ? <><Check className="w-4 h-4 ml-1" /> נשמר</> : <><Save className="w-4 h-4 ml-1" /> שמור</>}
          </Button>
        </div>
        <div className="space-y-2">
          {Object.entries(prefLabels).map(([key, { label, operational }]) => (
            <label key={key} className="flex items-center justify-between gap-2 py-2 border-b border-border last:border-0">
              <div className="flex items-center gap-2">
                <span className="text-sm">{label}</span>
                {operational && <span className="text-xs px-1.5 py-0.5 rounded bg-warning/10 text-warning">קריטית</span>}
              </div>
              <button
                onClick={() => !operational && togglePref(key)}
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