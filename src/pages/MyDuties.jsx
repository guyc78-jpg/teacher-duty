import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { getCurrentTeacher, formatDateWithDay, formatTimeRange, todayISO, isSchoolDay, BREAK_TYPES, STATUS_LABELS, HEBREW_DAYS, schoolDaysInRange, toISODate } from "@/lib/dutyUtils";
import { Clock, MapPin, Calendar, CheckCircle, Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function MyDuties() {
  const [teacher, setTeacher] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("week"); // day | week | month
  const [confirming, setConfirming] = useState(null);

  const load = useCallback(async () => {
    const t = await getCurrentTeacher();
    setTeacher(t);
    if (t) {
      const all = await base44.entities.Assignment.filter({ teacher_id: t.id, plan_status: "published" }, "date", 200);
      setAssignments(all.filter(a => isSchoolDay(a.date)).sort((a, b) => a.date.localeCompare(b.date)));
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const unsub = base44.entities.Assignment.subscribe(() => load());
    return unsub;
  }, [load]);

  const confirmArrival = async (assignment) => {
    setConfirming(assignment.id);
    const now = new Date();
    const isLate = now.toTimeString().slice(0, 5) > assignment.start_time;
    try {
      await base44.entities.ArrivalConfirmation.create({
        assignment_id: assignment.id, teacher_id: teacher.id, teacher_name: teacher.full_name,
        timestamp: now.toISOString(), status: isLate ? "late" : "on_time",
        updated_by: teacher.user_id, updated_by_name: teacher.full_name,
        date: assignment.date, break_type: assignment.break_type, station_name: assignment.station_name
      });
      await base44.entities.Assignment.update(assignment.id, { status: "confirmed" });
      await load();
    } catch (err) { alert("שגיאה: " + (err.message || "")); }
    finally { setConfirming(null); }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;
  if (!teacher) return <p className="text-center py-20 text-muted-foreground">לא נמצא פרופיל מורה.</p>;

  const today = new Date();
  const todayStr = todayISO();
  let filtered = assignments;

  if (view === "day") {
    filtered = assignments.filter(a => a.date === todayStr);
  } else if (view === "week") {
    // This week Sunday-Thursday
    const day = today.getDay();
    const sunday = new Date(today);
    sunday.setDate(today.getDate() - day);
    const thursday = new Date(sunday);
    thursday.setDate(sunday.getDate() + 4);
    filtered = assignments.filter(a => a.date >= toISODate(sunday) && a.date <= toISODate(thursday));
  } else if (view === "month") {
    filtered = assignments.filter(a => a.date.startsWith(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`));
  }

  // Group by date
  const grouped = {};
  filtered.forEach(a => {
    if (!grouped[a.date]) grouped[a.date] = [];
    grouped[a.date].push(a);
  });
  const dates = Object.keys(grouped).sort();

  return (
    <div className="space-y-4 pb-4">
      <h1 className="text-2xl font-bold">התורנויות שלי</h1>

      <div className="flex gap-1 bg-muted p-1 rounded-lg">
        {[
          { v: "day", l: "יומי" },
          { v: "week", l: "שבועי" },
          { v: "month", l: "חודשי" }
        ].map(t => (
          <button key={t.v} onClick={() => setView(t.v)}
            className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${view === t.v ? "bg-background shadow-sm" : "text-muted-foreground"}`}>
            {t.l}
          </button>
        ))}
      </div>

      {dates.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Calendar className="w-10 h-10 mx-auto mb-2" />
          אין תורנויות בתקופה זו
        </div>
      ) : (
        <div className="space-y-4">
          {dates.map(date => (
            <div key={date}>
              <h3 className="font-semibold text-sm text-muted-foreground mb-2 sticky top-14 lg:top-0 bg-background/80 backdrop-blur py-1 z-10">
                {formatDateWithDay(date)}
              </h3>
              <div className="space-y-2">
                {grouped[date].map(a => {
                  const bt = BREAK_TYPES[a.break_type];
                  const st = STATUS_LABELS[a.status] || STATUS_LABELS.scheduled;
                  return (
                    <div key={a.id} className="rounded-xl border border-border p-3 bg-card">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{formatTimeRange(a.start_time, a.end_time)}</span>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${bt.color}`}>{bt.label}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-2">
                        <MapPin className="w-4 h-4" /> {a.station_name}
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${st.class}`}>{st.label}</span>
                        <div className="flex gap-2">
                          {a.status === "scheduled" && a.date === todayStr && (
                            <Button size="sm" onClick={() => confirmArrival(a)} disabled={confirming === a.id} className="h-8">
                              {confirming === a.id ? "..." : <><CheckCircle className="w-3.5 h-3.5 ml-1" /> אישור הגעה</>}
                            </Button>
                          )}
                          {a.status === "scheduled" && (
                            <Link to="/swaps">
                              <Button size="sm" variant="outline" className="h-8">
                                <Repeat className="w-3.5 h-3.5 ml-1" /> החלפה
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}