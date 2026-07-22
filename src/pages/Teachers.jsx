import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { getCurrentTeacher, DIVISION_LABELS, isManagement } from "@/lib/dutyUtils";
import { Plus, Search, X, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ScheduleImportButton from "@/components/teachers/ScheduleImportButton";

export default function Teachers() {
  const [teacher, setTeacher] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    const t = await getCurrentTeacher();
    setTeacher(t);
    if (t && isManagement(t)) {
      const all = await base44.entities.TeacherProfile.list("-created_date", 200);
      setTeachers(all);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;
  if (!teacher || !isManagement(teacher)) return <p className="text-center py-20 text-muted-foreground">אין הרשאה.</p>;

  const filtered = teachers.filter(t =>
    t.full_name?.includes(search) || t.email?.includes(search) || t.employee_id?.includes(search) || t.subject?.includes(search)
  );

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">ניהול מורים</h1>
        <div className="flex items-center gap-2">
          {teacher.role === "admin" && <ScheduleImportButton teachers={teachers} />}
          <Button onClick={() => { setEditing(null); setShowAdd(true); }} size="sm">
            <Plus className="w-4 h-4 ml-1" /> מורה חדש
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="חיפוש מורה..." className="pr-10" />
      </div>

      <div className="space-y-2">
        {filtered.map(t => (
          <div key={t.id} className="rounded-xl border border-border p-3 bg-card">
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium truncate">{t.full_name}</span>
                  {!t.is_active && <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">לא פעיל</span>}
                  {t.is_exempt && <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">פטור</span>}
                  {t.is_sport_teacher && <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary">ספורט</span>}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                  <span>{t.email}</span>
                  <span>· {DIVISION_LABELS[t.division]}</span>
                  <span>· {t.subject || "—"}</span>
                  <span>· {t.weekly_teaching_hours} שעות</span>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => { setEditing(t); setShowAdd(true); }}>
                <Edit className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {showAdd && (
        <TeacherModal teacher={editing} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load(); }} />
      )}
    </div>
  );
}

function TeacherModal({ teacher: edit, onClose, onSaved }) {
  const [form, setForm] = useState(edit || {
    full_name: "", email: "", employee_id: "", division: "high", subject: "", role: "teacher",
    is_homeroom: false, is_sport_teacher: false, weekly_teaching_hours: 0, is_active: true, is_exempt: false
  });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.full_name || !form.email || !form.employee_id) { alert("נא למלא שם, דוא״ל ומזהה עובד"); return; }
    setSaving(true);
    try {
      if (edit) {
        await base44.entities.TeacherProfile.update(edit.id, form);
      } else {
        await base44.entities.TeacherProfile.create(form);
      }
      onSaved();
    } catch (err) { alert("שגיאה: " + (err.message || "")); }
    finally { setSaving(false); }
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-background rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[85vh] overflow-y-auto p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg">{edit ? "עריכת מורה" : "מורה חדש"}</h2>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>שם מלא *</Label>
              <Input value={form.full_name} onChange={e => set("full_name", e.target.value)} />
            </div>
            <div>
              <Label>מזהה עובד *</Label>
              <Input value={form.employee_id} onChange={e => set("employee_id", e.target.value)} />
            </div>
          </div>
          <div>
            <Label>דוא״ל *</Label>
            <Input type="email" value={form.email} onChange={e => set("email", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>חטיבה</Label>
              <select value={form.division} onChange={e => set("division", e.target.value)} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm">
                <option value="high">חטיבה עליונה</option>
                <option value="middle">חטיבת ביניים</option>
              </select>
            </div>
            <div>
              <Label>תפקיד</Label>
              <select value={form.role} onChange={e => set("role", e.target.value)} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm">
                <option value="teacher">מורה</option>
                <option value="homeroom">מחנך</option>
                <option value="coordinator">רכז</option>
                <option value="admin">מנהל מערכת</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>מקצוע</Label>
              <Input value={form.subject || ""} onChange={e => set("subject", e.target.value)} />
            </div>
            <div>
              <Label>שעות הוראה שבועיות</Label>
              <Input type="number" value={form.weekly_teaching_hours} onChange={e => set("weekly_teaching_hours", Number(e.target.value))} />
            </div>
          </div>
          <div className="flex gap-4 flex-wrap">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_homeroom} onChange={e => set("is_homeroom", e.target.checked)} /> מחנך</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_sport_teacher} onChange={e => set("is_sport_teacher", e.target.checked)} /> מורה לספורט</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_exempt} onChange={e => set("is_exempt", e.target.checked)} /> פטור מתורנות</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active} onChange={e => set("is_active", e.target.checked)} /> פעיל</label>
          </div>
          <Button onClick={submit} disabled={saving} className="w-full h-11">
            {saving ? "שומר..." : "שמור"}
          </Button>
        </div>
      </div>
    </div>
  );
}