import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { getCurrentTeacher, formatDateWithDay, formatTimeRange, todayISO, isSchoolDay, BREAK_TYPES, STATUS_LABELS, HEBREW_DAYS, HEBREW_MONTHS } from "@/lib/dutyUtils";
import { CheckCircle, Clock, MapPin, Calendar, AlertTriangle, Repeat, Bell } from "lucide-react";

export default function Home() {
  const [teacher, setTeacher] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(null);

  const load = useCallback(async () => {
    const t = await getCurrentTeacher();
    setTeacher(t);
    if (t) {
      const all = await base44.entities.Assignment.filter({ teacher_id: t.id, plan_status: "published" }, "date", 100);
      const sorted = all.filter(a => isSchoolDay(a.date)).sort((a, b) => a.date.localeCompare(b.date));
      setAssignments(sorted);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const unsub = base44.entities.Assignment.subscribe(() => load());
    return unsub;
  }, [load]);

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
      await load();
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
    <div className="space-y-5 pb-4">
      <div>
        <h1 className="text-2xl font-bold">שלום, {teacher.full_name}</h1>
        <p className="text-sm text-muted-foreground mt-1">{formatDateWithDay(today)}</p>
      </div>

      {/* Next duty - prominent */}
      {nextDuty ? (
        <div className="rounded-2xl bg-primary text-primary-foreground p-5 shadow-lg">
          <p className="text-sm opacity-80 mb-1">התורנות הבאה</p>
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-5 h-5" />
            <span className="font-bold text-lg">{formatDateWithDay(nextDuty.date)}</span>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 opacity-80" />
              <span>{formatTimeRange(nextDuty.start_time, nextDuty.end_time)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 opacity-80" />
              <span>{nextDuty.station_name}</span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-white/20 text-sm">
              {BREAK_TYPES[nextDuty.break_type]?.label}
            </span>
          </div>
          {nextDuty.date === today && nextDuty.status === "scheduled" && (
            <Button
              onClick={() => confirmArrival(nextDuty)}
              disabled={confirming === nextDuty.id}
              className="mt-4 w-full bg-white text-primary hover:bg-white/90 font-semibold h-11"
            >
              {confirming === nextDuty.id ? (
                <><div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin ml-2" /> מאשר...</>
              ) : (
                <><CheckCircle className="w-5 h-5 ml-2" /> אישור הגעה</>
              )}
            </Button>
          )}
          {nextDuty.status === "confirmed" && (
            <div className="mt-4 flex items-center gap-2 bg-white/20 rounded-lg px-3 py-2 text-sm">
              <CheckCircle className="w-4 h-4" /> הגעה אושרה
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-border p-8 text-center">
          <Calendar className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">אין תורנויות מתוכננות בקרוב</p>
        </div>
      )}

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
      <div className="grid grid-cols-2 gap-3">
        <QuickAction to="/my-duties" icon={Calendar} label="התורנויות שלי" />
        <QuickAction to="/swaps" icon={Repeat} label="החלפות" />
        <QuickAction to="/incidents" icon={AlertTriangle} label="דיווח אירוע" />
        <QuickAction to="/notifications" icon={Bell} label="התראות" />
      </div>

      {/* Compact monthly calendar */}
      <CompactCalendar assignments={assignments} today={today} />
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
    <Link to={to} className="rounded-xl border border-border p-4 bg-card hover:bg-accent transition-colors text-center">
      <Icon className="w-6 h-6 mx-auto mb-1.5 text-primary" />
      <span className="text-sm font-medium">{label}</span>
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
    <div className="rounded-xl border border-border p-3 sm:p-4 bg-card">
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <button onClick={() => setViewDate(new Date(year, month - 1, 1))} className="p-1 rounded hover:bg-muted">→</button>
        <h3 className="font-bold text-sm">{HEBREW_MONTHS[month]} {year}</h3>
        <button onClick={() => setViewDate(new Date(year, month + 1, 1))} className="p-1 rounded hover:bg-muted">←</button>
      </div>
      <div className="grid grid-cols-5 gap-1 text-center">
        {weekDays.map(d => <div key={d} className="text-xs text-muted-foreground py-1">{d}</div>)}
        {cells.map((cell, i) => (
          <div key={i} className="h-10 sm:h-auto sm:aspect-square flex items-center justify-center">
            {cell && (
              <div className={`w-8 h-8 flex items-center justify-center rounded-full text-xs relative ${
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