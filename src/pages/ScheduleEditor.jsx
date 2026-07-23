import React, { useCallback, useEffect, useMemo, useState } from "react";
import { History, Loader2, Plus, Send } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { generateDutyDraft } from "@/functions/generateDutyDraft";
import { manageDutyAssignment } from "@/functions/manageDutyAssignment";
import { publishDutyPlan } from "@/functions/publishDutyPlan";
import { getCurrentTeacher, isManagement } from "@/lib/dutyUtils";
import { fromIso, iso, moveSchoolDay, schoolDate, weekDates, weekStart } from "@/lib/scheduleViewUtils";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { manageSpecialDay } from "@/functions/manageSpecialDay";
import DailyMatrix from "@/components/schedule/DailyMatrix";
import MobileDailyGroups from "@/components/schedule/MobileDailyGroups";
import PublishReviewDialog from "@/components/schedule/PublishReviewDialog";
import ScheduleFilters from "@/components/schedule/ScheduleFilters";
import ScheduleHeader from "@/components/schedule/ScheduleHeader";
import ScheduleStatBar from "@/components/schedule/ScheduleStatBar";
import TeacherPickerDialog from "@/components/schedule/TeacherPickerDialog";
import WeeklyScheduleView from "@/components/schedule/WeeklyScheduleView";

const emptyFilters = { break_type: "", division: "", level: "", station_id: "", teacher_id: "" };
export default function ScheduleEditor() {
  const [teacher, setTeacher] = useState(null), [plans, setPlans] = useState([]), [plan, setPlan] = useState(null);
  const [assignments, setAssignments] = useState([]), [teachers, setTeachers] = useState([]), [stations, setStations] = useState([]), [breaks, setBreaks] = useState([]), [specialDays, setSpecialDays] = useState([]);
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [view, setView] = useState("day");
  const [date, setDate] = useState(() => { const now = new Date(); while (!schoolDate(now)) now.setDate(now.getDate() + 1); return iso(now); });
  const [week, setWeek] = useState(() => weekStart(iso(new Date()))), [filters, setFilters] = useState(emptyFilters), [editing, setEditing] = useState(null);
  const [validation, setValidation] = useState({ errors: [], warnings: [], isValid: false }), [review, setReview] = useState(false), [message, setMessage] = useState("");

  const loadPlan = useCallback(async selected => {
    if (!selected) return;
    const [items, result] = await Promise.all([base44.entities.Assignment.filter({ plan_id: selected.id }, "date", 500), manageDutyAssignment({ action: "validate", plan_id: selected.id })]);
    setAssignments(items.filter(item => schoolDate(fromIso(item.date)))); setValidation(result.data); setPlan(selected);
  }, []);
  const load = useCallback(async () => {
    const current = await getCurrentTeacher(); setTeacher(current);
    if (current && isManagement(current)) {
      const [allPlans, allTeachers, allStations, allBreaks, specialResult] = await Promise.all([base44.entities.DutyPlan.list("-created_date", 50), base44.entities.TeacherProfile.filter({ is_active: true }), base44.entities.Station.filter({ is_active: true }), base44.entities.Break.filter({ is_active: true }), manageSpecialDay({ action: "list" })]);
      setPlans(allPlans); setTeachers(allTeachers.sort((a, b) => a.full_name.localeCompare(b.full_name, "he"))); setStations(allStations.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))); setBreaks(allBreaks); setSpecialDays((specialResult.data.days || []).filter(d => d.status === "published"));
      const chosen = plan ? allPlans.find(item => item.id === plan.id) : allPlans.find(item => item.status === "draft") || allPlans[0]; if (chosen) await loadPlan(chosen);
    }
    setLoading(false);
  }, [loadPlan, plan]);
  useEffect(() => { load(); }, []);

  const dates = weekDates(week), visibleDates = view === "day" ? [date] : dates;
  const filteredStations = stations.filter(item => (!filters.division || item.division === filters.division || item.division === "both") && (!filters.level || item.level === filters.level) && (!filters.station_id || item.id === filters.station_id));
  const visibleAssignments = assignments.filter(item => visibleDates.includes(item.date) && (!filters.break_type || item.break_type === filters.break_type) && (!filters.station_id || item.station_id === filters.station_id) && (!filters.teacher_id || item.teacher_id === filters.teacher_id));
  const errorsFor = targetDate => validation.errors.filter(item => item.date === targetDate), warningsFor = targetDate => validation.warnings.filter(item => item.date === targetDate);
  const summaryFor = targetDate => {
    const dayItems = assignments.filter(item => item.date === targetDate), required = stations.reduce((sum, station) => sum + ["big", "medium", "small"].reduce((total, type) => total + (station.active_break_types?.includes(type) ? station.staffing_requirements?.[type] || 1 : 0), 0), 0);
    const covered = dayItems.filter(item => item.teacher_id).length, conflicts = errorsFor(targetDate).filter(item => item.type === "double_booking").length;
    return { required, covered, missing: Math.max(0, required - covered), conflicts, warnings: warningsFor(targetDate).length };
  };
  const weeklySummaries = useMemo(() => Object.fromEntries(dates.map(day => { const stats = summaryFor(day); const hasAssignments = assignments.some(item => item.date === day); const coverageStatus = !hasAssignments ? "טרם פורסם" : stats.conflicts ? "התנגשויות" : stats.missing ? "חסרים" : "תקין"; const status = plan?.status === "draft" ? "טרם פורסם" : coverageStatus; const statusClass = status === "תקין" ? "bg-success/10 text-success" : status === "התנגשויות" ? "bg-warning/15 text-warning" : status === "טרם פורסם" ? "bg-muted text-muted-foreground" : "bg-destructive/10 text-destructive"; return [day, { ...stats, assignments: assignments.filter(item => item.date === day).length, status, statusClass }]; })), [dates.join("|"), assignments, validation, stations, plan?.status]);
  const statusFor = (items, required) => items.filter(item => item.teacher_id).length < required ? "missing" : items.some(item => warningsFor(item.date).some(warning => warning.assignment_id === item.id)) ? "warning" : "covered";

  const generate = async () => { setBusy(true); setMessage(""); try { const start = weekStart(iso(new Date())), end = fromIso(start); end.setDate(end.getDate() + 32); const result = await generateDutyDraft({ start_date: start, end_date: iso(end), plan_name: `טיוטה ${start}`, approve_incomplete: true }); setMessage(`נוצרו ${result.data.assignments_created} שיבוצים`); await load(); } catch (error) { setMessage(error.response?.data?.error || error.message); } finally { setBusy(false); } };
  const openReview = async () => { setBusy(true); try { const result = await manageDutyAssignment({ action: "validate", plan_id: plan.id, include_under_quota: true }); setValidation(result.data); setReview(true); } finally { setBusy(false); } };
  const publish = async reason => { setBusy(true); try { const result = await publishDutyPlan({ plan_id: plan.id, expected_updated_date: plan.updated_date, override_reason: reason }); setMessage(`פורסם בהצלחה; נשלחו ${result.data.notified} התראות למורים ששיבוצם השתנה`); setReview(false); await load(); } catch (error) { setMessage(error.response?.data?.error || error.message); } finally { setBusy(false); } };
  const restore = async () => { if (!plan || plan.version <= 1 || !confirm(`לשחזר את גרסה ${plan.version - 1}?`)) return; setBusy(true); try { await manageDutyAssignment({ action: "restore", plan_id: plan.id, version: plan.version - 1, expected_plan_updated_date: plan.updated_date }); await load(); setMessage("הגרסה הקודמת שוחזרה"); } catch (error) { setMessage(error.response?.data?.error || error.message); } finally { setBusy(false); } };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>;
  if (!teacher || !isManagement(teacher)) return <p className="py-20 text-center text-muted-foreground">אין הרשאה.</p>;
  return <div className="space-y-3 pb-4"><ScheduleHeader view={view} setView={setView} date={date} onDate={value => { if (schoolDate(fromIso(value))) { setDate(value); setWeek(weekStart(value)); } else setMessage("ניתן להציג רק ימים ראשון–חמישי"); }} onPrevious={() => view === "day" ? setDate(moveSchoolDay(date, -1)) : setWeek(iso(new Date(fromIso(week).setDate(fromIso(week).getDate() - 7))))} onNext={() => view === "day" ? setDate(moveSchoolDay(date, 1)) : setWeek(iso(new Date(fromIso(week).setDate(fromIso(week).getDate() + 7))))} onToday={() => { const today = iso(new Date()); const safe = schoolDate(fromIso(today)) ? today : moveSchoolDay(today, 1); setDate(safe); setWeek(weekStart(safe)); }} />
    <div className="flex flex-wrap gap-2"><select aria-label="בחירת תוכנית" value={plan?.id || ""} onChange={e => loadPlan(plans.find(item => item.id === e.target.value))} className="h-10 min-w-0 basis-full rounded-lg border border-input bg-background px-3 text-sm sm:flex-1 sm:basis-0"><option value="">בחר תוכנית</option>{plans.map(item => <option key={item.id} value={item.id}>{item.name} · גרסה {item.version} · {item.status === "draft" ? "טיוטה" : "פורסם"}</option>)}</select><Button variant="outline" onClick={generate} disabled={busy}><Plus />טיוטה אוטומטית</Button>{plan?.status === "draft" && plan.version > 1 && <Button variant="outline" onClick={restore} disabled={busy}><History />שחזור</Button>}{plan?.status === "draft" && <Button onClick={openReview} disabled={busy}><Send />בדיקה ופרסום</Button>}</div>
    {specialDays.find(s => s.date === date) && <Link to={`/special-days/${specialDays.find(s => s.date === date).id}`} className="block rounded-lg bg-primary p-3 text-sm font-bold text-primary-foreground">יום מיוחד: {specialDays.find(s => s.date === date).name}</Link>}
    {message && <p role="status" className="rounded-lg border border-border bg-card p-2 text-sm">{message}</p>}{!plan ? <div className="py-16 text-center text-muted-foreground">יש לבחור תוכנית או ליצור טיוטה חדשה</div> : <><ScheduleFilters filters={filters} setFilters={setFilters} stations={stations} teachers={teachers} />{view === "day" ? <><ScheduleStatBar stats={summaryFor(date)} /><DailyMatrix stations={filteredStations} assignments={visibleAssignments} onEdit={setEditing} statusFor={statusFor} /><MobileDailyGroups stations={filteredStations} assignments={visibleAssignments} onEdit={setEditing} statusFor={statusFor} /></> : <WeeklyScheduleView dates={dates} assignments={visibleAssignments} summaries={weeklySummaries} specialDays={specialDays} onOpenDay={day => { setDate(day); setView("day"); }} />}</>}
    {editing && plan?.status === "draft" && <TeacherPickerDialog context={editing} plan={plan} date={date} onClose={() => setEditing(null)} onSaved={async result => { setEditing(null); setPlan(result.plan); await loadPlan(result.plan); setMessage("השינוי נשמר אוטומטית בטיוטה"); }} />}{review && <PublishReviewDialog validation={validation} busy={busy} onClose={() => setReview(false)} onPublish={publish} />}
  </div>;
}