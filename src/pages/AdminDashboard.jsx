import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { getCurrentTeacher, formatDateWithDay, formatTimeRange, todayISO, isSchoolDay, BREAK_TYPES, STATUS_LABELS, isManagement } from "@/lib/dutyUtils";
import { Users, AlertTriangle, Repeat, Clock, MapPin, CheckCircle, XCircle, Eye } from "lucide-react";
import { Link } from "react-router-dom";

export default function AdminDashboard() {
  const [teacher, setTeacher] = useState(null);
  const [todayAssignments, setTodayAssignments] = useState([]);
  const [arrivals, setArrivals] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [swaps, setSwaps] = useState([]);
  const [uncovered, setUncovered] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const t = await getCurrentTeacher();
    setTeacher(t);
    if (t && isManagement(t)) {
      const today = todayISO();
      const [asgn, inc, swp] = await Promise.all([
        base44.entities.Assignment.filter({ date: today, plan_status: "published" }, "break_type", 200),
        base44.entities.IncidentReport.filter({ status: "open" }, "-event_time", 20),
        base44.entities.SwapRequest.filter({ status: "pending" }, "-created_at", 20)
      ]);
      const workday = isSchoolDay(today);
      setTodayAssignments(workday ? asgn : []);
      setIncidents(inc);
      setSwaps(swp.filter(s => isSchoolDay(s.date)));
      const arr = workday ? await base44.entities.ArrivalConfirmation.filter({ date: today }, "-timestamp", 200) : [];
      setArrivals(arr);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const u1 = base44.entities.Assignment.subscribe(() => load());
    const u2 = base44.entities.ArrivalConfirmation.subscribe(() => load());
    return () => { u1(); u2(); };
  }, [load]);

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;
  if (!teacher || !isManagement(teacher)) return <p className="text-center py-20 text-muted-foreground">אין הרשאה לדשבורד זה.</p>;

  const confirmed = arrivals.filter(a => a.status === "on_time" || a.status === "late").length;
  const lateArrivals = arrivals.filter(a => a.status === "late");
  const pendingStations = todayAssignments.filter(a => a.status === "scheduled");

  const stats = [
    { label: "תורנויות היום", value: todayAssignments.length, icon: Clock, color: "text-primary" },
    { label: "אישורי הגעה", value: confirmed, icon: CheckCircle, color: "text-success" },
    { label: "איחורים", value: lateArrivals.length, icon: Clock, color: "text-warning" },
    { label: "עמדות ממתינות", value: pendingStations.length, icon: Eye, color: "text-warning" },
    { label: "בקשות החלפה", value: swaps.length, icon: Repeat, color: "text-primary" },
    { label: "אירועים פתוחים", value: incidents.length, icon: AlertTriangle, color: "text-destructive" }
  ];

  // Group by break
  const byBreak = {};
  todayAssignments.forEach(a => {
    if (!byBreak[a.break_type]) byBreak[a.break_type] = [];
    byBreak[a.break_type].push(a);
  });

  return (
    <div className="space-y-5 pb-4">
      <div>
        <h1 className="text-2xl font-bold">מה קורה עכשיו</h1>
        <p className="text-sm text-muted-foreground mt-1">{formatDateWithDay(todayISO())}</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3">
        {stats.map(s => (
          <div key={s.label} className="rounded-xl border border-border p-3 bg-card text-center">
            <s.icon className={`w-5 h-5 mx-auto mb-1 ${s.color}`} />
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Today's assignments by break */}
      {Object.keys(byBreak).length > 0 ? (
        <div className="space-y-4">
          {Object.entries(byBreak).map(([bt, asgn]) => {
            const breakInfo = BREAK_TYPES[bt];
            return (
              <div key={bt}>
                <h2 className="font-bold text-sm mb-2 flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${breakInfo.color}`}>{breakInfo.label}</span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {asgn.sort((a, b) => a.station_name.localeCompare(b.station_name)).map(a => {
                    const arrival = arrivals.find(ar => ar.assignment_id === a.id);
                    const st = STATUS_LABELS[a.status] || STATUS_LABELS.scheduled;
                    return (
                      <div key={a.id} className={`rounded-lg border p-3 ${a.status === "confirmed" ? "border-success/30 bg-success/5" : a.status === "scheduled" ? "border-warning/30 bg-warning/5" : "border-border bg-card"}`}>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-medium text-sm">{a.station_name}</span>
                          {a.status === "confirmed" ? <CheckCircle className="w-4 h-4 text-success" /> : <Clock className="w-4 h-4 text-warning" />}
                        </div>
                        <p className="text-sm text-muted-foreground">{a.teacher_name}</p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-muted-foreground">{formatTimeRange(a.start_time, a.end_time)}</span>
                          {arrival?.status === "late" && <span className="text-xs text-warning">איחור</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <Clock className="w-10 h-10 mx-auto mb-2" />
          אין תורנויות להיום
        </div>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3">
        <Link to="/teachers" className="rounded-xl border border-border p-4 bg-card hover:bg-accent text-center">
          <Users className="w-6 h-6 mx-auto mb-1 text-primary" />
          <span className="text-sm font-medium">ניהול מורים</span>
        </Link>
        <Link to="/schedule" className="rounded-xl border border-border p-4 bg-card hover:bg-accent text-center">
          <Clock className="w-6 h-6 mx-auto mb-1 text-primary" />
          <span className="text-sm font-medium">עורך שיבוצים</span>
        </Link>
      </div>
    </div>
  );
}