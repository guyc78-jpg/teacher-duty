import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { getCurrentTeacher, formatTime } from "@/lib/dutyUtils";
import { CheckCheck, BellOff, Trash2, ListChecks, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";

export default function Notifications() {
  const [teacher, setTeacher] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const navigate = useNavigate();
  const confirmDialog = useConfirm();

  const load = useCallback(async () => {
    const t = await getCurrentTeacher();
    setTeacher(t);
    if (t) {
      const notifs = await base44.entities.Notification.filter({ user_id: t.user_id }, "-created_at", 100);
      setNotifications(notifs);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!teacher) return;
    const unsub = base44.entities.Notification.subscribe(event => {
      if (event.data?.user_id && event.data.user_id !== teacher.user_id) return;
      setNotifications(current => {
        if (event.type === "delete") return current.filter(item => item.id !== event.id);
        if (!event.data || event.data.user_id !== teacher.user_id) return current;
        const without = current.filter(item => item.id !== event.id);
        return [event.data, ...without].sort((a, b) => (b.created_at || "").localeCompare(a.created_at || "")).slice(0, 100);
      });
      if (event.type === "delete") setSelected(current => {
        const next = new Set(current); next.delete(event.id); return next;
      });
    });
    return unsub;
  }, [teacher?.user_id]);

  const markRead = async (id) => {
    await base44.entities.Notification.update(id, { is_read: true });
    setNotifications(current => current.map(item => item.id === id ? { ...item, is_read: true } : item));
  };

  const markAllRead = async () => {
    await base44.entities.Notification.updateMany({ user_id: teacher.user_id, is_read: false }, { $set: { is_read: true } });
    setNotifications(current => current.map(item => ({ ...item, is_read: true })));
  };

  const clearAll = async () => {
    if (!(await confirmDialog({ title: "מחיקת כל ההתראות", description: "כל ההתראות שלך יימחקו לצמיתות.", confirmLabel: "נקה הכל" }))) return;
    await base44.entities.Notification.deleteMany({ user_id: teacher.user_id });
    setNotifications([]);
    setSelected(new Set());
    setSelectionMode(false);
  };

  const deleteSelected = async () => {
    if (!selected.size) return;
    if (!(await confirmDialog({ title: "מחיקת התראות נבחרות", description: `${selected.size} התראות יימחקו לצמיתות.`, confirmLabel: "מחק נבחרות" }))) return;
    const ids = [...selected];
    await Promise.all(ids.map(id => base44.entities.Notification.delete(id)));
    setNotifications(current => current.filter(item => !selected.has(item.id)));
    setSelected(new Set());
    setSelectionMode(false);
  };

  const toggleSelected = id => setSelected(current => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const handleClick = async (n) => {
    if (selectionMode) { toggleSelected(n.id); return; }
    if (!n.is_read) await markRead(n.id);
    if (n.link) navigate(n.link);
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;
  if (!teacher) return <p className="text-center py-20 text-muted-foreground">לא נמצא פרופיל מורה.</p>;

  const unread = notifications.filter(n => !n.is_read).length;

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">התראות</h1>
        <div className="flex items-center gap-1.5">
          {notifications.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAll} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
              <Trash2 className="w-4 h-4 ml-1" /> נקה הכל
            </Button>
          )}
          {notifications.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => { setSelectionMode(v => !v); setSelected(new Set()); }}>
              {selectionMode ? <X className="w-4 h-4 ml-1" /> : <ListChecks className="w-4 h-4 ml-1" />}
              {selectionMode ? "ביטול" : "בחירה"}
            </Button>
          )}
        </div>
      </div>

      {selectionMode && (
        <div className="flex items-center justify-between rounded-xl border bg-card p-2.5">
          <span className="text-sm text-muted-foreground">נבחרו {selected.size} התראות</span>
          <Button size="sm" variant="destructive" disabled={!selected.size} onClick={deleteSelected}><Trash2 className="w-4 h-4 ml-1" />מחק נבחרות</Button>
        </div>
      )}

      {!selectionMode && unread > 0 && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={markAllRead}>
            <CheckCheck className="w-4 h-4 ml-1" /> סמן הכל כנקרא
          </Button>
        </div>
      )}

      {notifications.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <BellOff className="w-10 h-10 mx-auto mb-2" />
          אין התראות
        </div>
      ) : (
        <div className="space-y-1.5">
          {notifications.map(n => (
            <button key={n.id} onClick={() => handleClick(n)}
              className={`w-full text-right rounded-xl border p-3 transition-colors ${selected.has(n.id) ? "border-primary bg-primary/10" : n.is_read ? "border-border bg-card" : "border-primary/30 bg-primary/5"}`}>
              <div className="flex items-start gap-2">
                {selectionMode ? (
                  <input type="checkbox" checked={selected.has(n.id)} onChange={() => toggleSelected(n.id)} onClick={e => e.stopPropagation()} className="mt-1 h-4 w-4 shrink-0" aria-label={`בחירת ${n.title}`} />
                ) : (
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${n.is_read ? "bg-transparent" : n.is_operational ? "bg-destructive" : "bg-primary"}`} />
                )}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${n.is_read ? "font-medium" : "font-bold"}`}>{n.title}</p>
                  <p className="text-sm text-muted-foreground line-clamp-2">{n.body}</p>
                  <p className="text-xs text-muted-foreground mt-1">{formatTime(n.created_at || n.created_date)}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}