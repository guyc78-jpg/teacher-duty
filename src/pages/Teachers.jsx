import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { getCurrentTeacher, DIVISION_LABELS, isManagement } from "@/lib/dutyUtils";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import CloseButton from "@/components/ui/close-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ScheduleImportButton from "@/components/teachers/ScheduleImportButton";
import PendingApprovals from "@/components/teachers/PendingApprovals";
import TeacherFilters from "@/components/teachers/TeacherFilters";
import TeacherRow from "@/components/teachers/TeacherRow";
import TeacherDetailsCard from "@/components/teachers/TeacherDetailsCard";

// השמות שמורים בפורמט "שם משפחה שם פרטי" — מיון א/ב ישיר לפי השם המלא
function compareByLastName(a, b) {
  return (a.full_name || "").trim().localeCompare((b.full_name || "").trim(), "he");
}

export default function Teachers() {
  const [teacher, setTeacher] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selected, setSelected] = useState(null);
  const [filters, setFilters] = useState({ division: "", subject: "", exempt: "", status: "" });
  const confirmDialog = useConfirm();

  const load = useCallback(async () => {
    const t = await getCurrentTeacher();
    setTeacher(t);
    if (t && isManagement(t)) {
      const all = await base44.entities.TeacherProfile.list("full_name", 200);
      setTeachers(all);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const isAdmin = teacher?.role === "admin";

  const deleteTeacher = async (t) => {
    if (!(await confirmDialog({ title: `מחיקת ${t.full_name}`, description: "המורה יימחק לצמיתות יחד עם מערכת השעות שלו. לא ניתן לשחזר פעולה זו.", confirmLabel: "מחיקת מורה" }))) return;
    try {
      await base44.entities.WeeklySchedule.deleteMany({ teacher_id: t.id });
      await base44.entities.TeacherProfile.delete(t.id);
      setSelected(null);
      load();
    } catch (err) { alert("שגיאה: " + (err.message || "")); }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;
  if (!teacher || !isManagement(teacher)) return <p className="text-center py-20 text-muted-foreground">אין הרשאה.</p>;

  const subjects = [...new Set(teachers.flatMap(t => [t.subject, ...(t.additional_subjects || [])]).filter(Boolean))].sort((a, b) => a.localeCompare(b, "he"));
  const filtered = teachers.filter(t => {
    const matchesSearch = t.full_name?.includes(search) || t.email?.includes(search) || t.employee_id?.includes(search) || t.subject?.includes(search);
    const matchesDivision = !filters.division || t.division === filters.division;
    const matchesSubject = !filters.subject || t.subject === filters.subject || t.additional_subjects?.includes(filters.subject);
    const matchesExempt = !filters.exempt || (filters.exempt === "yes" ? t.is_exempt : !t.is_exempt);
    const matchesStatus = !filters.status || (filters.status === "active" ? t.is_active : !t.is_active);
    return matchesSearch && matchesDivision && matchesSubject && matchesExempt && matchesStatus;
  }).sort(compareByLastName);

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

      <PendingApprovals onChanged={load} />

      <div className="space-y-2 rounded-xl border border-border bg-card p-3">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="חיפוש מורה..." className="pr-10" />
        </div>
        <TeacherFilters filters={filters} onChange={setFilters} subjects={subjects} />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(5rem,0.7fr)_4rem_auto] gap-2 border-b border-border bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground sm:grid-cols-[minmax(0,1.3fr)_minmax(7rem,1fr)_6rem_5rem_auto]">
          <span>שם</span><span>מקצוע</span><span>שעות</span><span>סטטוס</span><span className="hidden sm:block" />
        </div>
        {filtered.map(t => <TeacherRow key={t.id} teacher={t} onOpen={setSelected} onDelete={isAdmin ? deleteTeacher : undefined} />)}
        {filtered.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">לא נמצאו מורים התואמים לסינון.</p>}
      </div>

      {selected && (
        <TeacherDetailsCard
          teacher={selected}
          onClose={() => setSelected(null)}
          onEdit={() => { setEditing(selected); setSelected(null); setShowAdd(true); }}
          onDelete={isAdmin ? () => deleteTeacher(selected) : undefined}
        />
      )}
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
          <CloseButton onClick={onClose} label="סגירת חלון המורה" />
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
                <option value="homeroom">מחנך/ת</option>
                <option value="coordinator">רכז/ת</option>
                <option value="admin">מנהל/ת מערכת</option>
                <option value="management">הנהלה</option>
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
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_homeroom} onChange={e => set("is_homeroom", e.target.checked)} /> מחנך/ת</label>
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