import React from "react";
import { Bell, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NOTIF_PREF_LABELS, ONBOARDING_DIVISIONS, WEEK_DAYS, ROLE_LABELS } from "./onboardingConstants";

export default function StepFinish({ form, set, teacher, pushStatus, requestPush }) {
  const togglePref = (key) => {
    if (NOTIF_PREF_LABELS[key].operational) return;
    set("preferences", { ...form.preferences, [key]: !form.preferences[key] });
  };

  const summary = [
    ["שם מלא", form.full_name],
    ["דוא״ל", form.email],
    ["חטיבה", ONBOARDING_DIVISIONS.find(d => d.value === form.division)?.label],
    ["תפקיד", ROLE_LABELS[teacher?.role] || "מורה"],
    ["מקצוע ראשי", form.subject || "—"],
    ["מקצועות נוספים", form.additional_subjects.join(", ") || "—"],
    ["מורה לספורט", form.is_sport_teacher ? "כן" : "לא"],
    ["מחנך/ת", form.is_homeroom ? `כן · ${form.homeroom_grade}׳${form.homeroom_class} ` : "לא"],
    ["ימי חופש", form.days_off.map(d => WEEK_DAYS.find(w => w.value === d)?.label).join(", ") || "ללא"],
    ["פטור מתורנות", teacher?.is_exempt ? "מאושר" : form.request_exemption ? "ממתין לאימות מנהל" : "לא"]
  ];

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border p-4 bg-card space-y-2">
        <p className="font-semibold text-sm flex items-center gap-2"><Bell className="w-4 h-4" /> הודעות Push</p>
        {pushStatus === "granted" ? (
          <p className="text-sm text-success flex items-center gap-1"><Check className="w-4 h-4" /> הרשאת התראות אושרה</p>
        ) : pushStatus === "unsupported" ? (
          <p className="text-sm text-muted-foreground">הדפדפן אינו תומך בהתראות במכשיר זה.</p>
        ) : (
          <Button type="button" variant="outline" size="sm" onClick={requestPush}>אפשר קבלת התראות</Button>
        )}
      </div>

      <div>
        <p className="font-semibold text-sm mb-2">סוגי התראות</p>
        <div className="rounded-xl border border-border bg-card divide-y divide-border">
          {Object.entries(NOTIF_PREF_LABELS).map(([key, { label, operational }]) => (
            <label key={key} className="flex items-center justify-between gap-2 px-3 py-2.5">
              <span className="text-sm">{label}{operational && <span className="text-xs text-warning mr-2">קריטית</span>}</span>
              <button type="button" onClick={() => togglePref(key)} disabled={operational}
                className={`w-10 h-6 rounded-full transition-colors relative shrink-0 ${form.preferences[key] ? "bg-primary" : "bg-muted"} ${operational ? "opacity-60" : ""}`}>
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${form.preferences[key] ? "right-0.5" : "right-4"}`} />
              </button>
            </label>
          ))}
        </div>
      </div>

      <div>
        <p className="font-semibold text-sm mb-2">סיכום הפרטים</p>
        <div className="rounded-xl border border-border bg-card divide-y divide-border text-sm">
          {summary.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-3 px-3 py-2">
              <span className="text-muted-foreground shrink-0">{label}</span>
              <span className="text-left font-medium">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}