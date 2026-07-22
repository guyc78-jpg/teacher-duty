import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { getCurrentTeacher, formatDateWithDay, formatTimeRange, BREAK_TYPES } from "@/lib/dutyUtils";
import { Clock, MapPin, Repeat, ArrowRightLeft, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function Swaps() {
  const [teacher, setTeacher] = useState(null);
  const [myRequests, setMyRequests] = useState([]);
  const [openRequests, setOpenRequests] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [allTeachers, setAllTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("mine"); // mine | open | create | history
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    const t = await getCurrentTeacher();
    setTeacher(t);
    if (t) {
      const [mine, open, asgn, teachers] = await Promise.all([
        base44.entities.SwapRequest.filter({ initiator_id: t.id }, "-created_at", 50),
        base44.entities.SwapRequest.filter({ is_open: true, status: "pending" }, "-created_at", 50),
        base44.entities.Assignment.filter({ teacher_id: t.id, plan_status: "published" }, "date", 100),
        base44.entities.TeacherProfile.filter({ is_active: true })
      ]);
      setMyRequests(mine);
      setOpenRequests(open);
      setAssignments(asgn.sort((a, b) => a.date.localeCompare(b.date)));
      setAllTeachers(teachers.filter(tt => tt.id !== t.id));
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const u1 = base44.entities.SwapRequest.subscribe(() => load());
    return u1;
  }, [load]);

  const acceptSwap = async (swap) => {
    if (!teacher) return;
    if (!confirm("לאשר קבלת החלפה זו?")) return;
    try {
      // Atomic check: verify teacher is available
      const myAssignments = await base44.entities.Assignment.filter({ teacher_id: teacher.id, date: swap.date, plan_status: "published" });
      const conflicting = myAssignments.find(a => a.break_type === swap.break_type);
      if (conflicting) {
        alert("לא ניתן לקבל — יש לך כבר תורנות באותה הפסקה.");
        return;
      }
      // Check schedule conflict
      const schedule = await base44.entities.WeeklySchedule.filter({ teacher_id: teacher.id, day_of_week: new Date(swap.date).getDay() });
      const conflict = schedule.find(s => {
        const sTime = s.start_time, eTime = s.end_time;
        return !(swap.end_time <= sTime || swap.start_time >= eTime);
      });
      if (conflict) {
        alert("לא ניתן לקבל — יש לך שיעור בזמן זה.");
        return;
      }
      // Check absence
      const absences = await base44.entities.Absence.filter({ teacher_id: teacher.id, status: "approved" });
      const absent = absences.find(ab => swap.date >= ab.start_date && swap.date <= ab.end_date);
      if (absent) {
        alert("לא ניתן לקבל — אתה מוגדר כנעדר בתאריך זה.");
        return;
      }

      // Accept the swap atomically
      await base44.entities.SwapRequest.update(swap.id, {
        status: "accepted",
        accepted_at: new Date().toISOString(),
        accepted_by_id: teacher.id,
        accepted_by_name: teacher.full_name,
        is_open: false
      });
      // Update the assignment: swap teachers
      const origAssignment = await base44.entities.Assignment.filter({ id: swap.assignment_id });
      if (origAssignment[0]) {
        const a = origAssignment[0];
        await base44.entities.Assignment.update(a.id, {
          teacher_id: teacher.id,
          teacher_name: teacher.full_name,
          replacement_teacher_id: a.teacher_id,
          replacement_teacher_name: a.teacher_name,
          source: "swap",
          status: "scheduled"
        });
      }
      // Notify initiator
      await base44.entities.Notification.create({
        user_id: swap.initiator_id,
        title: "בקשת החלפה התקבלה",
        body: `${teacher.full_name} קיבל/ה את החלפת התורנות ב-${formatDateWithDay(swap.date)}`,
        type: "swap_accepted",
        link: "/my-duties",
        is_operational: true,
        created_at: new Date().toISOString()
      });
      await load();
    } catch (err) {
      alert("שגיאה באישור ההחלפה: " + (err.message || ""));
    }
  };

  const cancelSwap = async (swap) => {
    if (!confirm("לבטל בקשה זו?")) return;
    await base44.entities.SwapRequest.update(swap.id, { status: "cancelled", is_open: false });
    await load();
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;
  if (!teacher) return <p className="text-center py-20 text-muted-foreground">לא נמצא פרופיל מורה.</p>;

  const history = myRequests.filter(r => ["accepted", "rejected", "cancelled", "expired"].includes(r.status));

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">החלפות</h1>
        <Button onClick={() => setShowCreate(true)} size="sm">
          <Repeat className="w-4 h-4 ml-1" /> בקשת החלפה
        </Button>
      </div>

      <div className="flex gap-1 bg-muted p-1 rounded-lg">
        {[
          { v: "mine", l: "הבקשות שלי" },
          { v: "open", l: "בקשות פתוחות" },
          { v: "history", l: "היסטוריה" }
        ].map(t => (
          <button key={t.v} onClick={() => setTab(t.v)}
            className={`flex-1 py-1.5 rounded-md text-sm font-medium ${tab === t.v ? "bg-background shadow-sm" : "text-muted-foreground"}`}>
            {t.l}
          </button>
        ))}
      </div>

      {tab === "mine" && (
        <div className="space-y-2">
          {myRequests.filter(r => r.status === "pending").length === 0 ? (
            <EmptyState text="אין בקשות פעילות" />
          ) : (
            myRequests.filter(r => r.status === "pending").map(s => <SwapCard key={s.id} swap={s} onCancel={() => cancelSwap(s)} />)
          )}
        </div>
      )}

      {tab === "open" && (
        <div className="space-y-2">
          {openRequests.length === 0 ? (
            <EmptyState text="אין בקשות פתוחות כרגע" />
          ) : (
            openRequests.map(s => <SwapCard key={s.id} swap={s} onAccept={() => acceptSwap(s)} canAccept />)
          )}
        </div>
      )}

      {tab === "history" && (
        <div className="space-y-2">
          {history.length === 0 ? (
            <EmptyState text="אין היסטוריית החלפות" />
          ) : (
            history.map(s => <SwapCard key={s.id} swap={s} />)
          )}
        </div>
      )}

      {showCreate && (
        <CreateSwapModal
          teacher={teacher}
          assignments={assignments.filter(a => a.status === "scheduled" && a.date >= new Date().toISOString().slice(0, 10))}
          allTeachers={allTeachers}
          onClose={() => setShowCreate(false)}
          onCreated={async () => { setShowCreate(false); await load(); }}
        />
      )}
    </div>
  );
}

function SwapCard({ swap, onAccept, onCancel, canAccept }) {
  const bt = BREAK_TYPES[swap.break_type];
  const statusLabels = { pending: "ממתינה", accepted: "התקבלה", rejected: "נדחתה", cancelled: "בוטלה", expired: "פגה" };
  const statusColors = { pending: "status-warning", accepted: "status-success", rejected: "status-danger", cancelled: "status-muted", expired: "status-muted" };
  return (
    <div className="rounded-xl border border-border p-3 bg-card">
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="font-medium text-sm">{formatDateWithDay(swap.date)}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColors[swap.status] || "status-muted"}`}>
          {statusLabels[swap.status] || swap.status}
        </span>
      </div>
      <div className="flex items-center gap-3 text-sm mb-2">
        <span className={`text-xs px-2 py-0.5 rounded-full border ${bt.color}`}>{bt.label}</span>
        <span className="flex items-center gap-1 text-muted-foreground"><Clock className="w-3.5 h-3.5" />{formatTimeRange(swap.start_time, swap.end_time)}</span>
        <span className="flex items-center gap-1 text-muted-foreground"><MapPin className="w-3.5 h-3.5" />{swap.station_name}</span>
      </div>
      {swap.target_teacher_name && <p className="text-xs text-muted-foreground mb-2">מוען אל: {swap.target_teacher_name}</p>}
      {canAccept && swap.status === "pending" && (
        <Button size="sm" onClick={onAccept} className="w-full h-8">
          <ArrowRightLeft className="w-3.5 h-3.5 ml-1" /> קבלת החלפה
        </Button>
      )}
      {onCancel && swap.status === "pending" && (
        <Button size="sm" variant="outline" onClick={onCancel} className="w-full h-8">
          <X className="w-3.5 h-3.5 ml-1" /> ביטול בקשה
        </Button>
      )}
    </div>
  );
}

function CreateSwapModal({ teacher, assignments, allTeachers, onClose, onCreated }) {
  const [assignmentId, setAssignmentId] = useState("");
  const [swapType, setSwapType] = useState("takeover");
  const [targetTeacherId, setTargetTeacherId] = useState("");
  const [isOpen, setIsOpen] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    const a = assignments.find(x => x.id === assignmentId);
    if (!a) { alert("יש לבחור תורנות"); return; }
    setSubmitting(true);
    try {
      await base44.entities.SwapRequest.create({
        assignment_id: a.id,
        initiator_id: teacher.id,
        initiator_name: teacher.full_name,
        swap_type: swapType,
        target_teacher_id: targetTeacherId || null,
        target_teacher_name: allTeachers.find(t => t.id === targetTeacherId)?.full_name || null,
        is_open: isOpen && !targetTeacherId,
        status: "pending",
        created_at: new Date().toISOString(),
        valid_until: new Date(new Date(a.date).getTime() - 86400000).toISOString(),
        date: a.date,
        break_type: a.break_type,
        station_name: a.station_name,
        start_time: a.start_time,
        end_time: a.end_time
      });
      await base44.entities.Notification.create({
        user_id: teacher.user_id,
        title: "בקשת החלפה נוצרה",
        body: `בקשת החלפה לתורנות ב-${formatDateWithDay(a.date)}`,
        type: "swap_request",
        link: "/swaps",
        created_at: new Date().toISOString()
      });
      onCreated();
    } catch (err) { alert("שגיאה: " + (err.message || "")); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-background rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[85vh] overflow-y-auto p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg">בקשת החלפה</h2>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1.5">תורנות להחלפה</label>
            <select value={assignmentId} onChange={e => setAssignmentId(e.target.value)}
              className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm">
              <option value="">בחר תורנות...</option>
              {assignments.map(a => (
                <option key={a.id} value={a.id}>{formatDateWithDay(a.date)} {formatTimeRange(a.start_time, a.end_time)} · {a.station_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1.5">סוג החלפה</label>
            <div className="flex gap-2">
              <button onClick={() => setSwapType("takeover")} className={`flex-1 py-2 rounded-lg border text-sm ${swapType === "takeover" ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>
                לקיחת תורנות
              </button>
              <button onClick={() => setSwapType("mutual")} className={`flex-1 py-2 rounded-lg border text-sm ${swapType === "mutual" ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>
                החלפה הדדית
              </button>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1.5">מורה יעד (אופציונלי)</label>
            <select value={targetTeacherId} onChange={e => setTargetTeacherId(e.target.value)}
              className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm">
              <option value="">פנויה לכולם</option>
              {allTeachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
            </select>
          </div>
          {!targetTeacherId && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isOpen} onChange={e => setIsOpen(e.target.checked)} />
              פרסם כבקשה פתוחה לכל המורים
            </label>
          )}
          <Button onClick={submit} disabled={submitting} className="w-full h-11">
            {submitting ? "יוצר..." : "צור בקשה"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ text }) {
  return <div className="text-center py-16 text-muted-foreground"><Repeat className="w-10 h-10 mx-auto mb-2" />{text}</div>;
}