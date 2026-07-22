import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { getCurrentTeacher, formatDateWithDay, formatTimeRange, BREAK_TYPES, STATUS_LABELS, isManagement, schoolDaysInRange, HEBREW_DAYS } from "@/lib/dutyUtils";
import { generateDutyDraft } from "@/functions/generateDutyDraft";
import { publishDutyPlan } from "@/functions/publishDutyPlan";
import { Plus, Calendar, Send, AlertTriangle, Loader2, Filter, Clock, MapPin, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
    setAssignments(asgn);
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
      const res = await generateDutyDraft({ start_date: startStr, end_date: endStr, plan_name: `טיוטה ${startStr}` });
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

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">עורך שיבוצים</h1>
        <div className="flex gap-2">
          <Button onClick={handleGenerate} disabled={generating} variant="outline" size="sm">
            {generating ? <><Loader2 className="w-4 h-4 ml-1 animate-spin" /> יוצר...</> : <><Plus className="w-4 h-4 ml-1" /> יצירת טיוטה</>}
          </Button>
          {selectedPlan?.status === "draft" && (
            <Button onClick={handlePublish} disabled={publishing} size="sm">
              {publishing ? <><Loader2 className="w-4 h-4 ml-1 animate-spin" /> מפרסם...</> : <><Send className="w-4 h-4 ml-1" /> פרסום</>}
            </Button>
          )}
        </div>
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
          {/* Filters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Input type="date" value={filters.date} onChange={e => setFilters(f => ({ ...f, date: e.target.value }))} className="text-sm" />
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
                    <div className="space-y-1.5">
                      {dayAssignments.map(a => {
                        const bt = BREAK_TYPES[a.break_type];
                        const st = STATUS_LABELS[a.status] || STATUS_LABELS.scheduled;
                        return (
                          <div key={a.id} className="flex items-center gap-2 rounded-lg border border-border p-2.5 bg-card">
                            <span className={`text-xs px-2 py-0.5 rounded-full border shrink-0 ${bt.color}`}>{bt.label}</span>
                            <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span className="text-xs shrink-0">{formatTimeRange(a.start_time, a.end_time)}</span>
                            <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0 mr-auto" />
                            <span className="text-xs truncate">{a.station_name}</span>
                            {selectedPlan.status === "draft" ? (
                              <select value={a.teacher_id} onChange={e => { setEditingAsgn(a); updateAssignment(a.id, e.target.value); }}
                                className="h-7 rounded border border-input bg-background px-1 text-xs mr-auto min-w-0">
                                <option value="">—</option>
                                {allTeachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                              </select>
                            ) : (
                              <span className="text-xs font-medium mr-auto truncate">{a.teacher_name || "—"}</span>
                            )}
                            <span className={`text-xs px-1.5 py-0.5 rounded ${st.class}`}>{st.label}</span>
                          </div>
                        );
                      })}
                    </div>
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