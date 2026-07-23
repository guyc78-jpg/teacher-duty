import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { getCurrentTeacher, formatDateWithDay, formatTimeRange, isSchoolDay, BREAK_TYPES } from "@/lib/dutyUtils";
import { Clock, MapPin, Repeat, ArrowRightLeft, X } from "lucide-react";
import { manageSwapRequest } from "@/functions/manageSwapRequest";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import CreateSwapModal from "@/components/swaps/CreateSwapModal";

export default function Swaps() {
  const [teacher, setTeacher] = useState(null);
  const [myRequests, setMyRequests] = useState([]);
  const [openRequests, setOpenRequests] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [allTeachers, setAllTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("mine"); // mine | open | create | history
  const [showCreate, setShowCreate] = useState(false);
  const [acceptingId, setAcceptingId] = useState(null);
  const confirmDialog = useConfirm();

  const load = useCallback(async () => {
    const t = await getCurrentTeacher();
    setTeacher(t);
    if (t) {
      const [mine, open, direct, asgn, teachers] = await Promise.all([
        base44.entities.SwapRequest.filter({ initiator_id: t.id }, "-created_at", 50),
        base44.entities.SwapRequest.filter({ is_open: true, status: "pending" }, "-created_at", 50),
        base44.entities.SwapRequest.filter({ target_teacher_id: t.id, status: "pending" }, "-created_at", 50),
        base44.entities.Assignment.filter({ teacher_id: t.id, plan_status: "published" }, "date", 100),
        base44.entities.TeacherProfile.filter({ is_active: true })
      ]);
      setMyRequests(mine.filter(r => isSchoolDay(r.date)));
      const available = [...open, ...direct].filter((request, index, all) => request.initiator_id !== t.id && isSchoolDay(request.date) && all.findIndex(item => item.id === request.id) === index);
      setOpenRequests(available);
      setAssignments(asgn.filter(a => isSchoolDay(a.date)).sort((a, b) => a.date.localeCompare(b.date)));
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
    if (!teacher || acceptingId) return;
    if (!(await confirmDialog({ title: "קבלת החלפה", description: "התורנות תועבר אליך ותופיע ברשימת התורנויות שלך.", confirmLabel: "קבלת החלפה", variant: "default" }))) return;
    setAcceptingId(swap.id);
    try {
      await manageSwapRequest({ action: "accept", swapRequestId: swap.id });
      await load();
    } catch (error) {
      alert(error.response?.data?.error || error.message || "לא ניתן לאשר את ההחלפה");
      await load();
    } finally { setAcceptingId(null); }
  };

  const cancelSwap = async (swap) => {
    if (!(await confirmDialog({ title: "ביטול בקשת החלפה", description: "הבקשה תבוטל ולא תוצג יותר למורים אחרים.", confirmLabel: "ביטול בקשה" }))) return;
    try {
      await manageSwapRequest({ action: "cancel", swapRequestId: swap.id });
      await load();
    } catch (error) {
      alert(error.response?.data?.error || error.message || "לא ניתן לבטל את הבקשה");
      await load();
    }
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
          { v: "open", l: "בקשות זמינות" },
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
            openRequests.map(s => <SwapCard key={s.id} swap={s} onAccept={() => acceptSwap(s)} canAccept accepting={acceptingId === s.id} />)
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
          assignments={assignments.filter(a => a.status === "scheduled" && a.date >= new Date().toISOString().slice(0, 10))}
          allTeachers={allTeachers}
          onClose={() => setShowCreate(false)}
          onCreated={async () => { setShowCreate(false); await load(); }}
        />
      )}
    </div>
  );
}

function SwapCard({ swap, onAccept, onCancel, canAccept, accepting }) {
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
        <Button size="sm" onClick={onAccept} disabled={accepting} className="w-full h-8">
          <ArrowRightLeft className="w-3.5 h-3.5 ml-1" /> {accepting ? "מאשר..." : "קבלת החלפה"}
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

function EmptyState({ text }) {
  return <div className="text-center py-16 text-muted-foreground"><Repeat className="w-10 h-10 mx-auto mb-2" />{text}</div>;
}