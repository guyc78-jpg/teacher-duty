import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { getCurrentTeacher, formatDateWithDay, formatTimeRange, todayISO, isSchoolDay, BREAK_TYPES, STATUS_LABELS, HEBREW_MONTHS } from "@/lib/dutyUtils";
import { CheckCircle, Clock, MapPin, Calendar, AlertTriangle, Repeat, Bell } from "lucide-react";
import { manageSpecialDay } from "@/functions/manageSpecialDay";
import SpecialDutyCards from "@/components/special-days/SpecialDutyCards";

function getCountdownLabel(assignment, now) {
  if (!assignment?.date || !assignment?.start_time) return "";
  const target = new Date(`${assignment.date}T${assignment.start_time}:00`).getTime();
  const minutes = Math.max(0, Math.ceil((target - now) / 60000));
  if (minutes < 60) return `עוד ${minutes} דקות`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `עוד ${hours} שעות ו־${remainder} דקות` : `עוד ${hours} שעות`;
}

export default function Home() {
  const [teacher, setTeacher] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [specialAssignments, setSpecialAssignments] = useState([]);
  const [replacementDates, setReplacementDates] = useState(() => new Set());
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(null);
  const [currentTime, setCurrentTime] = useState(Date.now());

  const load = useCallback(async () => {
    const t = await getCurrentTeacher();
    setTeacher(t);
    if (t) {
      const [all, specialResult] = await Promise.all([
        base44.entities.Assignment.filter({ teacher_id: t.id, plan_status: "published" }, "date", 100),
        manageSpecialDay({ action: "my_assignments" })
      ]);
      const special = specialResult.data.assignments || [], hiddenDates = new Set((specialResult.data.days || []).filter(d => d.replace_regular_schedule).map(d => d.date));
      const sorted = all.filter(a => isSchoolDay(a.date) && !hiddenDates.has(a.date)).sort((a, b) => a.date.localeCompare(b.date));
      setReplacementDates(hiddenDates); setAssignments(sorted); setSpecialAssignments(special.sort((a, b) => `${a.date}${a.start_time}`.localeCompare(`${b.date}${b.start_time}`)));
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!teacher) return;
    const unsub = base44.entities.Assignment.subscribe(event => {
      if (event.data?.teacher_id !== teacher.id) return;
      setAssignments(current => {
        if (event.type === "delete") return current.filter(item => item.id !== event.id);
        const next = event.data;
        const without = current.filter(item => item.id !== event.id);
        if (next.plan_status !== "published" || !isSchoolDay(next.date) || replacementDates.has(next.date)) return without;
        return [...without, next].sort((a, b) => a.date.localeCompare(b.date));
      });
    });
    return unsub;
  }, [teacher?.id, replacementDates]);

  const today = todayISO();
  const todayDuties = assignments.filter(a => a.date === today);
  const upcoming = assignments.filter(a => a.date > today);
  const nextDuty = upcoming[0] || todayDuties[0];

  const confirmArrival = async (assignment) => {
    setConfirming(assignment.id);
    const now = new Date();
    const isLate = now.toTimeString().slice(0, 5) > assignment.start_time;
    try {
      await base44.entities.ArrivalConfirmation.create({
        assignment_id: assignment.id,
        teacher_id: teacher.id,
        teacher_name: teacher.full_name,
        timestamp: now.toISOString(),
        status: isLate ? "late" : "on_time",
        updated_by: teacher.user_id,
        updated_by_name: teacher.full_name,
        date: assignment.date,
        break_type: assignment.break_type,
        station_name: assignment.station_name
      });
      await base44.entities.Assignment.update(assignment.id, { status: "confirmed" });
      setAssignments(current => current.map(item => item.id === assignment.id ? { ...item, status: "confirmed" } : item));
    } catch (err) {
      alert("שגיאה באישור ההגעה: " + (err.message || ""));
    } finally {
      setConfirming(null);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;
  }

  if (!teacher) {
    return <p className="text-center py-20 text-muted-foreground">לא נמצא פרופיל מורה.</p>;
  }

  return (
    <div className="teacher-dashboard min-h-[calc(100vh-3rem)] space-y-4 bg-muted/30 py-3 pb-5 sm:py-4 lg:py-6">
      <div className="pt-1">
        <h1 className="dashboard-greeting text-2xl font-extrabold tracking-tight">שלום, {teacher.full_name.trim().split(/\s+/).at(-1)}</h1>
        <p className="mt-0.5 text-sm text-foreground/70">{formatDateWithDay(today)}</p>
      </div>

      {/* Next duty - prominent */}
      {nextDuty ? (
        <section className="overflow-hidden rounded-xl border border-border border-r-4 border-r-primary bg-card p-4 shadow-md sm:p-5">
          <p className="text-sm font-medium text-foreground/75">התורנות הבאה</p>
          <div className="mt-1 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-5xl font-medium leading-none tracking-tight text-foreground" dir="ltr">{nextDuty.start_time}</p>
              <div className="mt-3 flex items-center gap-2">
                <MapPin className="h-4 w-4 shrink-0 text-primary" />
                <p className="truncate text-xl font-extrabold">{nextDuty.station_name}</p>
              </div>
            </div>
            <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
              {getCountdownLabel(nextDuty, currentTime)}
            </span>
          </div>
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3">
            <div className="text-xs text-muted-foreground">
              <span>{formatTimeRange(nextDuty.start_time, nextDuty.end_time)}</span>
              <span className="mx-1.5">·</span>
              <span>{BREAK_TYPES[nextDuty.break_type]?.label}</span>
            </div>
            {nextDuty.date === today && nextDuty.status === "scheduled" && (
              <Button
                onClick={() => confirmArrival(nextDuty)}
                disabled={confirming === nextDuty.id}
                className="h-11 shrink-0 rounded-lg px-5 font-semibold shadow-md"
              >
                {confirming === nextDuty.id ? "מאשר..." : "אישור הגעה"}
              </Button>
            )}
            {nextDuty.status === "confirmed" && (
              <div className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg bg-success/10 px-3 text-sm font-semibold text-success">
                <CheckCircle className="h-4 w-4" /> הגעה אושרה
              </div>
            )}
          </div>
        </section>
      ) : (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-sm">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
            <Calendar className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold">אין תורנויות מתוכננות בקרוב</p>
            <p className="text-xs text-muted-foreground">הלו״ז שלך פנוי כרגע</p>
          </div>
        </div>
      )}

      <SpecialDutyCards assignments={specialAssignments.filter(a => a.date >= today).slice(0, 5)} />

      {/* Today's duties */}
      {todayDuties.length > 0 && (
        <div>
          <h2 className="font-bold text-lg mb-2">תורנויות היום</h2>
          <div className="space-y-2">
            {todayDuties.map(a => (
              <DutyCard key={a.id} duty={a} onConfirm={confirmArrival} confirming={confirming} />
            ))}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <section>
        <h2 className="mb-2 text-base font-extrabold">פעולות מהירות</h2>
        <div className="grid grid-cols-4 gap-2">
          <QuickAction to="/my-duties" icon={Calendar} label="התורנויות שלי" />
          <QuickAction to="/swaps" icon={Repeat} label="החלפות" />
          <QuickAction to="/incidents" icon={AlertTriangle} label="דיווח אירוע" />
          <QuickAction to="/notifications" icon={Bell} label="התראות" />
        </div>
      </section>

      {/* Compact monthly calendar */}
      <section>
        <h2 className="mb-2 text-base font-extrabold">לוח שנה</h2>
        <CompactCalendar assignments={assignments} today={today} />
      </section>
    </div>
  );
}

function DutyCard({ duty, onConfirm, confirming }) {
  const bt = BREAK_TYPES[duty.break_type];
  const st = STATUS_LABELS[duty.status] || STATUS_LABELS.scheduled;
  return (
    <div className="rounded-xl border border-border p-3 bg-card">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium text-sm">{formatTimeRange(duty.start_time, duty.end_time)}</span>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full border ${bt.color}`}>{bt.label}</span>
      </div>
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-2">
        <MapPin className="w-4 h-4" /> {duty.station_name}
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className={`text-xs px-2 py-0.5 rounded-full border ${st.class}`}>{st.label}</span>
        {duty.status === "scheduled" && duty.date === todayISO() && (
          <Button size="sm" onClick={() => onConfirm(duty)} disabled={confirming === duty.id} className="h-8">
            {confirming === duty.id ? "..." : <><CheckCircle className="w-3.5 h-3.5 ml-1" /> אישור הגעה</>}
          </Button>
        )}
      </div>
    </div>
  );
}

function QuickAction({ to, icon: Icon, label }) {
  return (
    <Link to={to} className="flex min-h-[68px] flex-col items-center justify-center rounded-lg border border-border bg-card px-1.5 py-2 text-center shadow-sm transition-colors hover:bg-accent">
      <Icon className="mb-1 h-4 w-4 text-primary" />
      <span className="text-[11px] font-medium leading-tight">{label}</span>
    </Link>
  );
}

function CompactCalendar({ assignments, today }) {
  const [viewDate, setViewDate] = useState(new Date());
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dutyDates = new Set(assignments.map(a => a.date));

  const cells = [];
  const weekDays = ["א", "ב", "ג", "ד", "ה"];
  let firstVisibleDay = true;
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const dayOfWeek = date.getDay();
    if (dayOfWeek > 4) continue;
    if (firstVisibleDay) {
      for (let i = 0; i < dayOfWeek; i++) cells.push(null);
      firstVisibleDay = false;
    }
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ day: d, dateStr });
  }

  const isoToday = today;

  return (
    <div className="rounded-xl border border-border bg-card p-2.5 shadow-sm sm:p-4">
      <div className="mb-1.5 flex items-center justify-between sm:mb-3">
        <button onClick={() => setViewDate(new Date(year, month - 1, 1))} className="p-1 rounded hover:bg-muted">→</button>
        <h3 className="font-bold text-sm">{HEBREW_MONTHS[month]} {year}</h3>
        <button onClick={() => setViewDate(new Date(year, month + 1, 1))} className="p-1 rounded hover:bg-muted">←</button>
      </div>
      <div className="grid grid-cols-5 gap-1 text-center">
        {weekDays.map(d => <div key={d} className="text-xs text-muted-foreground py-1">{d}</div>)}
        {cells.map((cell, i) => (
          <div key={i} className="flex h-8 items-center justify-center sm:h-auto sm:aspect-square">
            {cell && (
              <div className={`relative flex h-7 w-7 items-center justify-center rounded-full text-xs ${
                cell.dateStr === isoToday ? "bg-primary text-primary-foreground font-bold" :
                dutyDates.has(cell.dateStr) ? "bg-primary/10 text-primary font-medium" :
                "hover:bg-muted"
              }`}>
                {cell.day}
                {dutyDates.has(cell.dateStr) && cell.dateStr !== isoToday && (
                  <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-primary"></span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

import { Button } from "@/components/ui/button";