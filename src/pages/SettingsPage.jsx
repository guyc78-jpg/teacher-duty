import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { getCurrentTeacher, isManagement, BREAK_TYPES, DIVISION_LABELS } from "@/lib/dutyUtils";
import { Clock, MapPin, Plus, X, Edit, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SettingsPage() {
  const [teacher, setTeacher] = useState(null);
  const [tab, setTab] = useState("breaks");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const t = await getCurrentTeacher();
      setTeacher(t);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;
  if (!teacher || !isManagement(teacher)) return <p className="text-center py-20 text-muted-foreground">אין הרשאה.</p>;

  return (
    <div className="space-y-4 pb-4">
      <h1 className="text-2xl font-bold">הגדרות מערכת</h1>
      <div className="flex gap-1 bg-muted p-1 rounded-lg overflow-x-auto no-scrollbar">
        {[
          { v: "breaks", l: "הפסקות" },
          { v: "stations", l: "עמדות" },
          { v: "rules", l: "מפתח תורנויות" },
          { v: "general", l: "כללי" }
        ].map(t => (
          <button key={t.v} onClick={() => setTab(t.v)} className={`px-4 py-1.5 rounded-md text-sm font-medium whitespace-nowrap ${tab === t.v ? "bg-background shadow-sm" : "text-muted-foreground"}`}>
            {t.l}
          </button>
        ))}
      </div>
      {tab === "breaks" && <BreaksSettings />}
      {tab === "stations" && <StationsSettings />}
      {tab === "rules" && <RulesSettings />}
      {tab === "general" && <GeneralSettings />}
    </div>
  );
}

function BreaksSettings() {
  const [breaks, setBreaks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    const all = await base44.entities.Break.list("sort_order", 20);
    setBreaks(all);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex justify-center py-8"><div className="w-6 h-6 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-2">
      {breaks.map(b => (
        <div key={b.id} className="rounded-xl border border-border p-3 bg-card">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium">{b.name}</span>
              <span className={`text-xs mr-2 px-2 py-0.5 rounded-full border ${BREAK_TYPES[b.break_type].color}`}>{BREAK_TYPES[b.break_type].label}</span>
            </div>
            <Button variant="outline" size="sm" onClick={() => setEditing(b)}><Edit className="w-3.5 h-3.5" /></Button>
          </div>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{b.start_time}–{b.end_time}</p>
        </div>
      ))}
      <Button variant="outline" className="w-full" onClick={() => setEditing({})}><Plus className="w-4 h-4 ml-1" /> הוסף הפסקה</Button>
      {editing && <BreakModal brk={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </div>
  );
}

function BreakModal({ brk, onClose, onSaved }) {
  const [form, setForm] = useState(brk.id ? brk : { break_type: "small", name: "", start_time: "", end_time: "", active_days: [0,1,2,3,4], is_active: true, sort_order: 0 });
  const [saving, setSaving] = useState(false);
  const days = ["ראשון", "שני", "שלישי", "רביעי", "חמישי"];

  const toggleDay = (d) => setForm(f => ({ ...f, active_days: f.active_days.includes(d) ? f.active_days.filter(x => x !== d) : [...f.active_days, d] }));

  const submit = async () => {
    setSaving(true);
    try {
      if (brk.id) await base44.entities.Break.update(brk.id, form);
      else await base44.entities.Break.create(form);
      onSaved();
    } catch (err) { alert("שגיאה: " + (err.message || "")); }
    finally { setSaving(false); }
  };

  return (
    <Modal title={brk.id ? "עריכת הפסקה" : "הפסקה חדשה"} onClose={onClose}>
      <div className="space-y-3">
        <div><Label>שם</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
        <div>
          <Label>סוג</Label>
          <select value={form.break_type} onChange={e => setForm(f => ({ ...f, break_type: e.target.value }))} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm">
            <option value="big">גדולה</option><option value="medium">בינונית</option><option value="small">קטנה</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>התחלה</Label><Input type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} /></div>
          <div><Label>סיום</Label><Input type="time" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} /></div>
        </div>
        <div>
          <Label>ימים פעילים</Label>
          <div className="flex gap-1">
            {days.map((d, i) => (
              <button key={i} onClick={() => toggleDay(i)} className={`px-2 py-1 rounded text-xs ${form.active_days.includes(i) ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{d}</button>
            ))}
          </div>
        </div>
        <Button onClick={submit} disabled={saving} className="w-full h-11">{saving ? "שומר..." : "שמור"}</Button>
      </div>
    </Modal>
  );
}

function StationsSettings() {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    const all = await base44.entities.Station.list("sort_order", 50);
    setStations(all);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex justify-center py-8"><div className="w-6 h-6 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-2">
      {stations.map(s => (
        <div key={s.id} className="rounded-xl border border-border p-3 bg-card">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium">{s.name}</span>
              {s.is_sport_station && <span className="text-xs mr-2 px-1.5 py-0.5 rounded bg-primary/10 text-primary">ספורט</span>}
            </div>
            <Button variant="outline" size="sm" onClick={() => setEditing(s)}><Edit className="w-3.5 h-3.5" /></Button>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
            <span>{DIVISION_LABELS[s.division]}</span>
            <span>· גדולה: {s.staffing_requirements?.big || 1}</span>
            <span>· בינונית: {s.staffing_requirements?.medium || 1}</span>
            <span>· קטנה: {s.staffing_requirements?.small || 1}</span>
          </div>
        </div>
      ))}
      <Button variant="outline" className="w-full" onClick={() => setEditing({})}><Plus className="w-4 h-4 ml-1" /> הוסף עמדה</Button>
      {editing && <StationModal station={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </div>
  );
}

function StationModal({ station, onClose, onSaved }) {
  const [form, setForm] = useState(station.id ? station : {
    name: "", division: "both", level: "", area: "", active_break_types: ["big","medium","small"],
    staffing_requirements: { big: 1, medium: 1, small: 1 }, load_level: "medium", is_sport_station: false, is_active: true, sort_order: 0
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setReq = (k, v) => setForm(f => ({ ...f, staffing_requirements: { ...f.staffing_requirements, [k]: v } }));

  const submit = async () => {
    setSaving(true);
    try {
      if (station.id) await base44.entities.Station.update(station.id, form);
      else await base44.entities.Station.create(form);
      onSaved();
    } catch (err) { alert("שגיאה: " + (err.message || "")); }
    finally { setSaving(false); }
  };

  return (
    <Modal title={station.id ? "עריכת עמדה" : "עמדה חדשה"} onClose={onClose}>
      <div className="space-y-3">
        <div><Label>שם</Label><Input value={form.name} onChange={e => set("name", e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>חטיבה</Label>
            <select value={form.division} onChange={e => set("division", e.target.value)} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm">
              <option value="both">שתי החטיבות</option><option value="high">עליונה</option><option value="middle">ביניים</option>
            </select>
          </div>
          <div><Label>רמת עומס</Label>
            <select value={form.load_level} onChange={e => set("load_level", e.target.value)} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm">
              <option value="low">נמוכה</option><option value="medium">בינונית</option><option value="high">גבוהה</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div><Label>תורנים גדולה</Label><Input type="number" value={form.staffing_requirements?.big || 1} onChange={e => setReq("big", Number(e.target.value))} /></div>
          <div><Label>תורנים בינונית</Label><Input type="number" value={form.staffing_requirements?.medium || 1} onChange={e => setReq("medium", Number(e.target.value))} /></div>
          <div><Label>תורנים קטנה</Label><Input type="number" value={form.staffing_requirements?.small || 1} onChange={e => setReq("small", Number(e.target.value))} /></div>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_sport_station} onChange={e => set("is_sport_station", e.target.checked)} /> עמדת ספורט</label>
        <Button onClick={submit} disabled={saving} className="w-full h-11">{saving ? "שומר..." : "שמור"}</Button>
      </div>
    </Modal>
  );
}

function RulesSettings() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    const all = await base44.entities.DutyRule.list("sort_order", 20);
    setRules(all);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex justify-center py-8"><div className="w-6 h-6 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-2">
      {rules.map(r => (
        <div key={r.id} className="rounded-xl border border-border p-3 bg-card">
          <div className="flex items-center justify-between">
            <span className="font-medium">{r.name}</span>
            <Button variant="outline" size="sm" onClick={() => setEditing(r)}><Edit className="w-3.5 h-3.5" /></Button>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{r.min_hours}–{r.max_hours} שעות: {r.big_count} גדולה, {r.medium_count} בינונית, {r.small_count} קטנה</p>
        </div>
      ))}
      <Button variant="outline" className="w-full" onClick={() => setEditing({})}><Plus className="w-4 h-4 ml-1" /> הוסף כלל</Button>
      {editing && <RuleModal rule={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </div>
  );
}

function RuleModal({ rule, onClose, onSaved }) {
  const [form, setForm] = useState(rule.id ? rule : { name: "", min_hours: 0, max_hours: 6, big_count: 0, medium_count: 0, small_count: 0, is_active: true, sort_order: 0 });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    setSaving(true);
    try {
      if (rule.id) await base44.entities.DutyRule.update(rule.id, form);
      else await base44.entities.DutyRule.create(form);
      onSaved();
    } catch (err) { alert("שגיאה: " + (err.message || "")); }
    finally { setSaving(false); }
  };

  return (
    <Modal title={rule.id ? "עריכת כלל" : "כלל חדש"} onClose={onClose}>
      <div className="space-y-3">
        <div><Label>שם</Label><Input value={form.name} onChange={e => set("name", e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>שעות מינ׳</Label><Input type="number" value={form.min_hours} onChange={e => set("min_hours", Number(e.target.value))} /></div>
          <div><Label>שעות מקס׳</Label><Input type="number" value={form.max_hours} onChange={e => set("max_hours", Number(e.target.value))} /></div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div><Label>גדולות</Label><Input type="number" value={form.big_count} onChange={e => set("big_count", Number(e.target.value))} /></div>
          <div><Label>בינוניות</Label><Input type="number" value={form.medium_count} onChange={e => set("medium_count", Number(e.target.value))} /></div>
          <div><Label>קטנות</Label><Input type="number" value={form.small_count} onChange={e => set("small_count", Number(e.target.value))} /></div>
        </div>
        <div><Label>תוקף מ</Label><Input type="date" value={form.valid_from || ""} onChange={e => set("valid_from", e.target.value)} /></div>
        <Button onClick={submit} disabled={saving} className="w-full h-11">{saving ? "שומר..." : "שמור"}</Button>
      </div>
    </Modal>
  );
}

function GeneralSettings() {
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const s = await base44.entities.SystemSettings.list();
      setSettings(s[0] || {});
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      if (settings.id) await base44.entities.SystemSettings.update(settings.id, settings);
      else await base44.entities.SystemSettings.create(settings);
      alert("נשמר");
    } catch (err) { alert("שגיאה: " + (err.message || "")); }
    finally { setSaving(false); }
  };

  if (!settings) return <div className="flex justify-center py-8"><div className="w-6 h-6 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-3">
      <div><Label>שם בית הספר</Label><Input value={settings.school_name || ""} onChange={e => setSettings(s => ({ ...s, school_name: e.target.value }))} /></div>
      <div><Label>שעת תזכורת בוקר</Label><Input type="time" value={settings.morning_reminder_time || "08:00"} onChange={e => setSettings(s => ({ ...s, morning_reminder_time: e.target.value }))} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>דקות לפני תורנות</Label><Input type="number" value={settings.pre_duty_reminder_minutes ?? 10} onChange={e => setSettings(s => ({ ...s, pre_duty_reminder_minutes: Number(e.target.value) }))} /></div>
        <div><Label>דקות אי־אישור</Label><Input type="number" value={settings.missing_arrival_threshold_minutes ?? 5} onChange={e => setSettings(s => ({ ...s, missing_arrival_threshold_minutes: Number(e.target.value) }))} /></div>
      </div>
      <div><Label>טלפון רכז ביטחון</Label><Input value={settings.security_coordinator_phone || ""} onChange={e => setSettings(s => ({ ...s, security_coordinator_phone: e.target.value }))} /></div>
      <div><Label>טלפון בית ספר</Label><Input value={settings.school_contact_phone || ""} onChange={e => setSettings(s => ({ ...s, school_contact_phone: e.target.value }))} /></div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={settings.pilot_mode_enabled || false} onChange={e => setSettings(s => ({ ...s, pilot_mode_enabled: e.target.checked }))} /> מצב הרצה</label>
      <Button onClick={save} disabled={saving} className="w-full h-11"><Save className="w-4 h-4 ml-2" />{saving ? "שומר..." : "שמור הגדרות"}</Button>
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-background rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[85vh] overflow-y-auto p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg">{title}</h2>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}