import React from "react";
import { NavLink } from "react-router-dom";
import { BarChart3, Bell, Calendar, Home, Repeat } from "lucide-react";

export default function MobileBottomNav({ unreadCount = 0, canViewReports = false }) {
  const items = [
    { to: "/", label: "בית", icon: Home },
    { to: "/my-duties", label: "התורנויות שלי", icon: Calendar },
    { to: "/swaps", label: "החלפות", icon: Repeat },
    ...(canViewReports ? [{ to: "/reports", label: "דוחות", icon: BarChart3 }] : []),
    { to: "/notifications", label: "התראות", icon: Bell, badge: unreadCount }
  ];

  return (
    <nav className={`fixed inset-x-3 bottom-3 z-40 grid ${canViewReports ? "grid-cols-5" : "grid-cols-4"} rounded-2xl border border-border bg-background/95 p-1 shadow-lg backdrop-blur-md lg:hidden`} aria-label="ניווט ראשי">
      {items.map(({ to, label, icon: Icon, badge }) => (
        <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => `relative flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[10px] font-medium transition-colors ${isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
          <Icon className="h-5 w-5" />
          <span className="leading-tight">{label}</span>
          {badge > 0 && <span className="absolute left-2 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] text-destructive-foreground">{badge}</span>}
        </NavLink>
      ))}
    </nav>
  );
}