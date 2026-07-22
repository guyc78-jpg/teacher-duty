import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { getCurrentTeacher, formatDateWithDay, isManagement, isSchoolDay } from "@/lib/dutyUtils";
import { generateDutyDraft } from "@/functions/generateDutyDraft";
import { publishDutyPlan } from "@/functions/publishDutyPlan";
import { Plus, Send, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import AssignmentGroups from "@/components/schedule/AssignmentGroups";
import ScheduleValidationSummary from "@/components/schedule/ScheduleValidationSummary";
import { validateAssignments } from "@/lib/scheduleValidation";

export default function ScheduleEditor() {
  const [teacher, setTeacher] = useState(null);
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [allTeachers, setAllTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [genResult, setGenResult] = useState(null);
  const [filters, setFilters] = useState({ date: "", break_type: "", station_name: "", teacher_id: "" });
  const [editingAsgn, setEditingAsgn] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    const t = await getCurrentTeacher();
    setTeacher(t);
    if (t && isManagement(t)) {
      const [p, teachers] = await Promise.all([
        base44.entities.DutyPlan.list("-created_date", 50),
        base44.entities.TeacherProfile.filter({ is_active: true })
      ]);
      setPlans(p);
      setAllTeachers(teachers);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadPlan = async (planId) => {
    const asgn = await base44.entities.Assignment.filter({ plan_id: planId }, "date", 500);
    setAssignments(asgn.filter(a => isSchoolDay(a.date)));
    setSelectedPlan(plans.find(p => p.id === planId));
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setGenResult(null);
    try {
      const start = new Date();
      const end = new Date();
      end.setMonth(end.getMonth() + 1);
      const startStr = start.toISOString().slice(0, 10);
      const endStr = end.toISOString().slice(0, 10);
      let res;
      try {
        res = await generateDutyDraft({ start_date: startStr, end_date: endStr, plan_name: `טיוטה ${startStr}` });
      } catch (err) {
        const data = err.response?.data;
        if (!data?.requires_approval) throw err;
        if (!confirm(`למורים הבאים חסרה מערכת שעות או שמוגדרות להם 0 שעות הוראה:\n${data.incomplete_teachers.join(", ")}\n\nלאשר יצירת טיוטה בכל זאת?`)) return;
        res = await generateDutyDraft({ start_date: startStr, end_date: endStr, plan_name: `טיוטה ${startStr}`, approve_incomplete: true });
      }
      setGenResult(res.data);
      await load();
    } catch (err) { alert("שגיאה: " + (err.response?.data?.error || err.message || "")); }
    finally { setGenerating(false); }
  };

  const handlePublish = async () => {
    if (!selectedPlan) return;
    if (!confirm("פרסום הלוח ישלח התראות לכל המורים המשובצים. להמשיך?")) return;
    setPublishing(true);
    try {
      const res = await publishDutyPlan({ plan_id: selectedPlan.id });
      alert(`פורסם בהצלחה! נשלחו ${res.data.notified} התראות.`);
      await load();
      await loadPlan(selectedPlan.id);
    } catch (err) {
      const data = err.response?.data;
      if (data?.conflicts) {
        alert(`נמצאו ${data.conflicts.length} התנגשויות. לא ניתן לפרסם.`);
        setGenResult({ conflicts: data.conflicts });
      } else {
        alert("שגיאה: " + (err.message || ""));
      }
    } finally { setPublishing(false); }
  };

  const updateAssignment = async (asgnId, teacherId) => {
    const t = allTeachers.find(tt => tt.id === teacherId);
    try {
      await base44.entities.Assignment.update(asgnId, {
        teacher_id: teacherId,
        teacher_name: t?.full_name || "",
        source: "manual",
        change_history: [...(editingAsgn?.change_history || []), {
          timestamp: new Date().toISOString(),
          user: teacher?.full_name,
          action: "manual_change",
          reason: "שינוי ידני",
          previous_teacher: editingAsgn?.teacher_name
        }]
      });
      setEditingAsgn(null);
      if (selectedPlan) await loadPlan(selectedPlan.id);
    } catch (err) { alert("שגיאה: " + (err.message || "")); }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;
  if (!teacher || !isManagement(teacher)) return <p className="text-center py-20 text-muted-foreground">אין הרשאה.</p>;

  const filtered = assignments.filter(a => {
    if (filters.date && a.date !== filters.date) return false;
    if (filters.break_type && a.break_type !== filters.break_type) return false;
    if (filters.station_name && a.station_name !== filters.station_name) return false;
    if (filters.teacher_id && a.teacher_id !== filters.teacher_id) return false;
    return true;
  });

  const stationNames = [...new Set(assignments.map(a => a.station_name))];
  const dates = [...new Set(filtered.map(a => a.date))].sort();
  const validation = validateAssignments(assignments);

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">עורך שיבוצים</h1>
        <Button onClick={handleGenerate} disabled={generating} variant="outline" size="sm">
          {generating ? <><Loader2 className="w-4 h-4 ml-1 animate-spin" /> יוצר...</> : <><Plus className="w-4 h-4 ml-1" /> יצירת טיוטה</>}
        </Button>
      </div>

      {genResult?.conflicts?.length > 0 && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3">
          <div className="flex items-center gap-2 mb-2"><AlertTriangle className="w-4 h-4 text-destructive" /><span className="font-medium text-sm">התנגשויות / עמדות חסרות ({genResult.conflicts.length})</span></div>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {genResult.conflicts.map((c, i) => (
              <div key={i} className="text-xs text-muted-foreground">{formatDateWithDay(c.date)} · {c.break_name} · {c.station_name} — {c.issue}</div>
            ))}
          </div>
        </div>
      )}

      {genResult && !genResult.conflicts?.length && (
        <div className="rounded-xl border border-success/30 bg-success/5 p-3 text-sm">
          נוצרו {genResult.assignments_created} שיבוצים ב-{genResult.school_days} ימי לימוד.
        </div>
      )}

      {/* Plan selector */}
      <select value={selectedPlan?.id || ""} onChange={e => e.target.value && loadPlan(e.target.value)}
        className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm">
        <option value="">בחר תוכנית...</option>
        {plans.map(p => (
          <option key={p.id} value={p.id}>{p.name} ({p.status === "draft" ? "טיוטה" : p.status === "published" ? "פורסם" : "ארכיון"})</option>
        ))}
      </select>

      {selectedPlan && (
        <>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-stretch">
            <ScheduleValidationSummary validation={validation} />
            {selectedPlan.status === "draft" && (
              <Button
                onClick={handlePublish}
                disabled={!validation.isValid || publishing}
                aria-describedby="publish-validation-note"
                className="h-auto min-h-12 sm:min-w-36"
              >
                {publishing ? <><Loader2 className="w-4 h-4 ml-1 animate-spin" /> מפרסם...</> : <><Send className="w-4 h-4 ml-1" /> פרסום הלוח</>}
              </Button>
            )}
          </div>
          {selectedPlan.status === "draft" && !validation.isValid && <p id="publish-validation-note" className="text-xs text-muted-foreground">הפרסום יתאפשר לאחר כיסוי מלא ופתרון כל ההתנגשויות.</p>}

          {/* Filters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <select value={filters.date} onChange={e => setFilters(f => ({ ...f, date: e.target.value }))} className="h-10 rounded-lg border border-input bg-background px-2 text-sm">
              <option value="">כל ימי העבודה</option>
              {[...new Set(assignments.map(a => a.date))].sort().map(date => <option key={date} value={date}>{formatDateWithDay(date)}</option>)}
            </select>
            <select value={filters.break_type} onChange={e => setFilters(f => ({ ...f, break_type: e.target.value }))} className="h-10 rounded-lg border border-input bg-background px-2 text-sm">
              <option value="">כל ההפסקות</option>
              <option value="big">גדולה</option>
              <option value="medium">בינונית</option>
              <option value="small">קטנה</option>
            </select>
            <select value={filters.station_name} onChange={e => setFilters(f => ({ ...f, station_name: e.target.value }))} className="h-10 rounded-lg border border-input bg-background px-2 text-sm">
              <option value="">כל העמדות</option>
              {stationNames.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={filters.teacher_id} onChange={e => setFilters(f => ({ ...f, teacher_id: e.target.value }))} className="h-10 rounded-lg border border-input bg-background px-2 text-sm">
              <option value="">כל המורים</option>
              {allTeachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
            </select>
          </div>

          {/* Assignments by date */}
          {dates.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">אין שיבוצים</div>
          ) : (
            <div className="space-y-4">
              {dates.map(date => {
                const dayAssignments = filtered.filter(a => a.date === date).sort((a, b) => a.break_type.localeCompare(b.break_type) || a.station_name.localeCompare(b.station_name));
                return (
                  <div key={date}>
                    <h3 className="font-semibold text-sm text-muted-foreground mb-2">{formatDateWithDay(date)}</h3>
                    <AssignmentGroups
                      assignments={dayAssignments}
                      isDraft={selectedPlan.status === "draft"}
                      teachers={allTeachers}
                      onTeacherChange={(assignment, teacherId) => { setEditingAsgn(assignment); updateAssignment(assignment.id, teacherId); }}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}