import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { getCurrentTeacher, formatTime } from "@/lib/dutyUtils";
import { Bell, Check, CheckCheck, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Notifications() {
  const [teacher, setTeacher] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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
    const unsub = base44.entities.Notification.subscribe(() => load());
    return unsub;
  }, [load]);

  const markRead = async (id) => {
    await base44.entities.Notification.update(id, { is_read: true });
    await load();
  };

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.is_read);
    for (const n of unread) {
      await base44.entities.Notification.update(n.id, { is_read: true });
    }
    await load();
  };

  const handleClick = async (n) => {
    if (!n.is_read) await markRead(n.id);
    if (n.link) navigate(n.link);
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;
  if (!teacher) return <p className="text-center py-20 text-muted-foreground">לא נמצא פרופיל מורה.</p>;

  const unread = notifications.filter(n => !n.is_read).length;

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">התראות</h1>
        {unread > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead}>
            <CheckCheck className="w-4 h-4 ml-1" /> סמן הכל כנקרא
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <BellOff className="w-10 h-10 mx-auto mb-2" />
          אין התראות
        </div>
      ) : (
        <div className="space-y-1.5">
          {notifications.map(n => (
            <button key={n.id} onClick={() => handleClick(n)}
              className={`w-full text-right rounded-xl border p-3 transition-colors ${n.is_read ? "border-border bg-card" : "border-primary/30 bg-primary/5"}`}>
              <div className="flex items-start gap-2">
                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${n.is_read ? "bg-transparent" : n.is_operational ? "bg-destructive" : "bg-primary"}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${n.is_read ? "font-medium" : "font-bold"}`}>{n.title}</p>
                  <p className="text-sm text-muted-foreground line-clamp-2">{n.body}</p>
                  <p className="text-xs text-muted-foreground mt-1">{formatTime(n.created_at)}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}