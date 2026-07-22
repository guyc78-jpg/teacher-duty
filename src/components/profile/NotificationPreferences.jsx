import React, { useState } from "react";
import { Check, Lock } from "lucide-react";
import { saveOnboarding } from "@/functions/saveOnboarding";
import { DEFAULT_PREFS, NOTIF_PREF_LABELS } from "@/components/onboarding/onboardingConstants";

function normalizedPreferences(value) {
  let stored = {};
  try { stored = value ? JSON.parse(value) : {}; } catch {}
  const next = { ...DEFAULT_PREFS, ...stored };
  Object.entries(NOTIF_PREF_LABELS).forEach(([key, option]) => {
    if (option.operational) next[key] = true;
  });
  return next;
}

export default function NotificationPreferences({ teacher }) {
  const [preferences, setPreferences] = useState(() => normalizedPreferences(teacher.preferences));
  const [saveState, setSaveState] = useState("idle");
  const options = Object.entries(NOTIF_PREF_LABELS).filter(([, option]) => !option.roles || option.roles.includes(teacher.role));

  const toggle = async (key) => {
    const previous = preferences;
    const next = { ...preferences, [key]: !preferences[key] };
    setPreferences(next);
    setSaveState("saving");
    try {
      await saveOnboarding({ action: "preferences", data: { preferences: JSON.stringify(next) } });
      setSaveState("saved");
      window.setTimeout(() => setSaveState("idle"), 1800);
    } catch (error) {
      setPreferences(previous);
      setSaveState("error");
      alert("שגיאה בשמירה: " + (error.response?.data?.error || error.message || ""));
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div><h2 className="font-bold">העדפות התראות</h2><p className="text-xs text-muted-foreground">השינויים נשמרים אוטומטית</p></div>
        <span className={`text-xs ${saveState === "error" ? "text-destructive" : "text-muted-foreground"}`}>
          {saveState === "saving" ? "שומר..." : saveState === "saved" ? <span className="flex items-center gap-1 text-success"><Check className="h-3.5 w-3.5" />נשמר</span> : saveState === "error" ? "השמירה נכשלה" : ""}
        </span>
      </div>
      <div className="space-y-1">
        {options.map(([key, option]) => {
          const active = option.operational || preferences[key];
          return (
            <div key={key} className="flex min-h-12 items-center justify-between gap-3 border-b border-border py-2 last:border-0">
              <div><p className="text-sm font-medium">{option.label}</p><p className={`text-xs ${active ? "text-success" : "text-muted-foreground"}`}>{active ? "פעיל" : "כבוי"}</p></div>
              {option.operational ? (
                <span className="flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success"><Lock className="h-3.5 w-3.5" />פעיל תמיד</span>
              ) : (
                <button role="switch" aria-checked={active} aria-label={`${option.label}: ${active ? "פעיל" : "כבוי"}`} disabled={saveState === "saving"} onClick={() => toggle(key)} className={`relative h-7 w-12 rounded-full transition-colors ${active ? "bg-primary" : "bg-muted"}`}>
                  <span className={`absolute top-1 h-5 w-5 rounded-full bg-background shadow transition-all ${active ? "right-6" : "right-1"}`} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}