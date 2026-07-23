import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { getCurrentTeacher } from "@/lib/dutyUtils";
import { Repeat, Trash2 } from "lucide-react";
import { manageSwapRequest } from "@/functions/manageSwapRequest";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import CreateSwapModal from "@/components/swaps/CreateSwapModal";
import SwapCard from "@/components/swaps/SwapCard";

export default function Swaps() {
  const [teacher, setTeacher] = useState(null);
  const [mine, setMine] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [actionError, setActionError] = useState("");
  const [tab, setTab] = useState("mine");
  const [actingId, setActingId] = useState(null);
  const [preselect] = useState(() => new URLSearchParams(window.location.search).get("duty") || "");
  const [showCreate, setShowCreate] = useState(() => Boolean(new URLSearchParams(window.location.search).get("duty")));
  const confirmDialog = useConfirm();

  const load = useCallback(async () => {
    try {
      const current = await getCurrentTeacher();
      setTeacher(current);
      if (current) {
        const response = await manageSwapRequest({ action: "list" });
        setMine(response.data.mine || []);
        setIncoming(response.data.incoming || []);
        setPageError("");
      }
    } catch (loadError) {
      setPageError(loadError.response?.data?.error || loadError.message || "טעינת ההחלפות נכשלה");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => base44.entities.SwapRequest.subscribe(() => load()), [load]);

  const act = async (action, swap, confirmOptions) => {
    if (actingId) return;
    if (!(await confirmDialog(confirmOptions))) return;
    setActingId(swap.id); setActionError("");
    try { await manageSwapRequest({ action, swapRequestId: swap.id }); }
    catch (requestError) { setActionError(requestError.response?.data?.error || requestError.message || "הפעולה נכשלה"); }
    finally { setActingId(null); await load(); }
  };

  const acceptSwap = swap => act("accept", swap, {
    title: "קבלת החלפה",
    description: swap.swap_type === "mutual" ? `תיקח/י את התורנות של ${swap.initiator_name} ובתמורה הוא/היא ייקח/תיקח את שלך.` : "התורנות תועבר אליך ותופיע ברשימת התורנויות שלך.",
    confirmLabel: "קבלת ההחלפה", variant: "default"
  });
  const rejectSwap = swap => act("reject", swap, { title: "דחיית בקשת החלפה", description: "היוזם יקבל עדכון שהבקשה נדחתה.", confirmLabel: "דחיית הבקשה" });
  const cancelSwap = swap => act("cancel", swap, { title: "ביטול בקשת החלפה", description: "הבקשה תבוטל ולא תוצג יותר למורים אחרים.", confirmLabel: "ביטול הבקשה" });

  const clearHistory = async () => {
    if (actingId) return;
    if (!(await confirmDialog({ title: "מחיקת היסטוריית החלפות", description: "כל הבקשות שהסתיימו (אושרו, נדחו, בוטלו או פגו) יימחקו לצמיתות. התורנויות עצמן לא יושפעו.", confirmLabel: "מחיקת ההיסטוריה" }))) return;
    setActingId("history"); setActionError("");
    try { await manageSwapRequest({ action: "clear_history" }); }
    catch (requestError) { setActionError(requestError.response?.data?.error || requestError.message || "המחיקה נכשלה"); }
    finally { setActingId(null); await load(); }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" /></div>;
  if (!teacher) return <p className="py-20 text-center text-muted-foreground">לא נמצא פרופיל מורה.</p>;

  const pendingMine = mine.filter(request => request.status === "pending");
  const history = mine.filter(request => request.status !== "pending");

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">החלפות</h1>
        <Button onClick={() => setShowCreate(true)} size="sm"><Repeat className="ml-1 h-4 w-4" /> בקשת החלפה</Button>
      </div>

      {pageError && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{pageError}</p>}
      {actionError && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{actionError}</p>}

      <div className="flex gap-1 rounded-lg bg-muted p-1">
        {[{ v: "mine", l: "הבקשות שלי" }, { v: "open", l: "בקשות אליי" }, { v: "history", l: "היסטוריה" }].map(item => (
          <button key={item.v} onClick={() => setTab(item.v)} className={`flex-1 rounded-md py-1.5 text-sm font-medium ${tab === item.v ? "bg-background shadow-sm" : "text-muted-foreground"}`}>
            {item.l}{item.v === "open" && incoming.length > 0 ? ` (${incoming.length})` : ""}
          </button>
        ))}
      </div>

      {tab === "mine" && (
        <div className="space-y-2">
          {pendingMine.length === 0 ? <EmptyState text="אין לך בקשות פעילות" /> : pendingMine.map(swap => <SwapCard key={swap.id} swap={swap} busy={actingId === swap.id} onCancel={() => cancelSwap(swap)} />)}
        </div>
      )}

      {tab === "open" && (
        <div className="space-y-2">
          {incoming.length === 0 ? <EmptyState text="אין בקשות שממתינות לך כרגע" /> : incoming.map(swap => (
            <SwapCard key={swap.id} swap={swap} busy={actingId === swap.id} onAccept={() => acceptSwap(swap)} onReject={swap.target_teacher_id === teacher.id ? () => rejectSwap(swap) : undefined} />
          ))}
        </div>
      )}

      {tab === "history" && (
        <div className="space-y-2">
          {history.length === 0 ? <EmptyState text="אין היסטוריית החלפות" /> : (
            <>
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={clearHistory} disabled={actingId === "history"} className="text-destructive hover:text-destructive">
                  <Trash2 className="ml-1 h-4 w-4" /> מחיקת היסטוריה
                </Button>
              </div>
              {history.map(swap => <SwapCard key={swap.id} swap={swap} />)}
            </>
          )}
        </div>
      )}

      {showCreate && (
        <CreateSwapModal
          teacherName={teacher.full_name}
          preselect={preselect}
          onClose={() => setShowCreate(false)}
          onCreated={async () => { setShowCreate(false); await load(); }}
        />
      )}
    </div>
  );
}

function EmptyState({ text }) {
  return <div className="py-16 text-center text-muted-foreground"><Repeat className="mx-auto mb-2 h-10 w-10" />{text}</div>;
}