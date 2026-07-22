import React from "react";
import { Bell, BellOff } from "lucide-react";
import usePush from "@/lib/usePush";

export default function PushToggle({ variant = "icon" }) {
  const { supported, enabled, busy, toggle } = usePush();
  if (!supported) return null;

  if (variant === "row") {
    return (
      <button onClick={toggle} disabled={busy} className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-sm hover:bg-muted disabled:opacity-50">
        {enabled ? <Bell className="h-4 w-4 text-primary" /> : <BellOff className="h-4 w-4" />}
        {enabled ? "התראות דחיפה פעילות" : "הפעלת התראות דחיפה"}
      </button>
    );
  }

  return (
    <button onClick={toggle} disabled={busy} className="min-w-11 min-h-11 flex items-center justify-center disabled:opacity-50" aria-label={enabled ? "כיבוי התראות דחיפה" : "הפעלת התראות דחיפה"} title={enabled ? "התראות דחיפה פעילות" : "הפעלת התראות דחיפה"}>
      {enabled ? <Bell className="w-5 h-5 text-primary" /> : <BellOff className="w-5 h-5" />}
    </button>
  );
}