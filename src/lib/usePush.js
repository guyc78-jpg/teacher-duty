import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { getVapidPublicKey } from "@/functions/getVapidPublicKey";
import { toast } from "@/components/ui/use-toast";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

export default function usePush() {
  const supported = typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supported) return;
    (async () => {
      const reg = await navigator.serviceWorker.register("/public/sw.js");
      const sub = await reg.pushManager.getSubscription();
      setEnabled(!!sub && Notification.permission === "granted");
    })();
  }, [supported]);

  const toggle = useCallback(async () => {
    if (!supported || busy) return;
    setBusy(true);
    try {
      const reg = (await navigator.serviceWorker.getRegistration("/public/")) || (await navigator.serviceWorker.register("/public/sw.js"));
      const existing = await reg.pushManager.getSubscription();
      if (enabled && existing) {
        await existing.unsubscribe();
        const mine = await base44.entities.PushSubscription.filter({ endpoint: existing.endpoint });
        for (const record of mine) await base44.entities.PushSubscription.delete(record.id);
        setEnabled(false);
      } else {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          const inIframe = window.self !== window.top;
          toast({
            variant: "destructive",
            title: "לא ניתן להפעיל התראות",
            description: inIframe
              ? "הדפדפן חוסם התראות בתצוגה המקדימה. יש לפתוח את האפליקציה בכרטיסייה נפרדת ולנסות שוב."
              : "ההתראות חסומות בדפדפן. יש לאשר קבלת התראות עבור האתר בהגדרות הדפדפן ולנסות שוב."
          });
          return;
        }
        const { data } = await getVapidPublicKey({});
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(data.publicKey)
        });
        const user = await base44.auth.me();
        const json = sub.toJSON();
        const dup = await base44.entities.PushSubscription.filter({ endpoint: sub.endpoint });
        if (dup.length === 0) {
          await base44.entities.PushSubscription.create({
            user_id: user.id,
            endpoint: sub.endpoint,
            p256dh: json.keys.p256dh,
            auth: json.keys.auth,
            user_agent: navigator.userAgent.slice(0, 200)
          });
        }
        setEnabled(true);
        toast({ title: "התראות דחיפה הופעלו", description: "מעכשיו תקבלו התראות גם כשהאתר סגור." });
      }
    } catch (e) {
      toast({ variant: "destructive", title: "שגיאה בהפעלת התראות", description: e.message });
    } finally { setBusy(false); }
  }, [supported, enabled, busy]);

  return { supported, enabled, busy, toggle };
}