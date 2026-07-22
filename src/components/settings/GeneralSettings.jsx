import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle, Save, TriangleAlert } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const defaults = { school_name: "", morning_reminder_time: "08:00", pre_duty_reminder_minutes: 10, missing_arrival_threshold_minutes: 5, security_coordinator_phone: "", school_contact_phone: "", pilot_mode_enabled: false };
const fields = Object.keys(defaults);
const comparable = value => JSON.stringify(Object.fromEntries(fields.map(key => [key, value?.[key] ?? defaults[key]])));

export default function GeneralSettings() {
  const [settings, setSettings] = useState(null);
  const [savedSettings, setSavedSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);

  useEffect(() => { (async () => {
    const records = await base44.entities.SystemSettings.list();
    const loaded = { ...defaults, ...(records[0] || {}) };
    setSettings(loaded);
    setSavedSettings(loaded);
  })(); }, []);

  const dirty = useMemo(() => comparable(settings) !== comparable(savedSettings), [settings, savedSettings]);
  const timeValid = /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(settings?.morning_reminder_time || "");
  const set = (key, value) => { setSettings(current => ({ ...current, [key]: value })); setStatus(null); };

  const save = async () => {
    if (!timeValid) return;
    setSaving(true);
    setStatus(null);
    try {
      const payload = Object.fromEntries(fields.map(key => [key, settings[key]]));
      const saved = settings.id ? await base44.entities.SystemSettings.update(settings.id, payload) : await base44.entities.SystemSettings.create(payload);
      const next = { ...settings, ...saved };
      setSettings(next);
      setSavedSettings(next);
      setStatus("saved");
    } catch (error) {
      setStatus(error.message || "לא ניתן לשמור את ההגדרות");
    } finally { setSaving(false); }
  };

  if (!settings) return <div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-4 border-muted border-t-primary" /></div>;
  return (
    <div className="min-w-0 space-y-4 overflow-hidden">
      <div className="min-w-0"><Label htmlFor="school-name">שם בית הספר</Label><Input id="school-name" value={settings.school_name} onChange={event => set("school_name", event.target.value)} /></div>
      <div className="min-w-0"><Label htmlFor="reminder-time">שעת תזכורת בוקר</Label><Input id="reminder-time" aria-describedby="time-hint" inputMode="numeric" dir="ltr" maxLength={5} placeholder="08:00" value={settings.morning_reminder_time} onChange={event => set("morning_reminder_time", event.target.value)} className="text-left font-mono" /><p id="time-hint" className={`mt-1 text-xs ${timeValid ? "text-muted-foreground" : "text-destructive"}`}>{timeValid ? "פורמט 24 שעות, לדוגמה 08:00" : "יש להזין שעה תקינה בפורמט 08:00"}</p></div>
      <div className="grid min-w-0 grid-cols-2 gap-3">
        <div className="min-w-0"><Label htmlFor="pre-duty">דקות לפני תורנות</Label><Input id="pre-duty" type="number" value={settings.pre_duty_reminder_minutes} onChange={event => set("pre_duty_reminder_minutes", Number(event.target.value))} /></div>
        <div className="min-w-0"><Label htmlFor="missing-arrival">דקות לאי־אישור</Label><Input id="missing-arrival" type="number" value={settings.missing_arrival_threshold_minutes} onChange={event => set("missing_arrival_threshold_minutes", Number(event.target.value))} /></div>
      </div>
      <div className="grid min-w-0 grid-cols-2 gap-3">
        <div className="min-w-0"><Label htmlFor="security-phone">טלפון רכז ביטחון</Label><Input id="security-phone" dir="ltr" value={settings.security_coordinator_phone} onChange={event => set("security_coordinator_phone", event.target.value)} /></div>
        <div className="min-w-0"><Label htmlFor="school-phone">טלפון בית הספר</Label><Input id="school-phone" dir="ltr" value={settings.school_contact_phone} onChange={event => set("school_contact_phone", event.target.value)} /></div>
      </div>
      <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-3">
        <div className="min-w-0"><Label htmlFor="pilot-mode" className="text-sm font-semibold">מצב הרצה</Label><p className="mt-1 text-xs leading-5 text-muted-foreground">מגביל את הפעלת המערכת למורי ההרצה שהוגדרו מראש.</p></div>
        <Switch id="pilot-mode" checked={settings.pilot_mode_enabled} onCheckedChange={value => set("pilot_mode_enabled", value)} className="shrink-0" />
      </div>
      <div aria-live="polite" className="min-h-5 text-sm">
        {dirty && <p className="flex items-center gap-1.5 text-warning"><TriangleAlert className="h-4 w-4" />יש שינויים שלא נשמרו</p>}
        {!dirty && status === "saved" && <p className="flex items-center gap-1.5 text-success"><CheckCircle className="h-4 w-4" />ההגדרות נשמרו בהצלחה</p>}
        {status && status !== "saved" && <p className="text-destructive">שגיאה: {status}</p>}
      </div>
      <Button onClick={save} disabled={saving || !dirty || !timeValid} className="h-11 w-full"><Save className="ml-2 h-4 w-4" />{saving ? "שומר..." : "שמור הגדרות"}</Button>
    </div>
  );
}