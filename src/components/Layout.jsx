import React, { useState, useEffect } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { getCurrentTeacher, isManagement, isAdmin } from "@/lib/dutyUtils";
import { Menu, X, Bell, Calendar, Users, Settings, ClipboardList, BarChart3, AlertTriangle, Repeat, Home as HomeIcon, ShieldCheck, Moon, Sun } from "lucide-react";

export default function Layout() {
  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const t = await getCurrentTeacher();
      setTeacher(t);
      setLoading(false);
      if (t) {
        try {
          const notifs = await base44.entities.Notification.filter({ user_id: t.user_id, is_read: false });
          setUnreadCount(notifs.length);
        } catch {}
      }
    })();
  }, []);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setDark(isDark);
  }, []);

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <ShieldCheck className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-bold mb-2">פרופיל מורה לא נמצא</h2>
          <p className="text-muted-foreground mb-6">לחשבון שלך לא מוגדר פרופיל מורה. פנה למנהל המערכת להשלמת ההרשמה.</p>
        </div>
      </div>
    );
  }

  const management = isManagement(teacher);

  const teacherNav = [
    { to: "/", label: "בית", icon: HomeIcon },
    { to: "/my-duties", label: "התורנויות שלי", icon: Calendar },
    { to: "/swaps", label: "החלפות", icon: Repeat },
    { to: "/incidents", label: "אירועים חריגים", icon: AlertTriangle },
    { to: "/notifications", label: "התראות", icon: Bell, badge: unreadCount },
    { to: "/profile", label: "פרופיל", icon: Settings }
  ];

  const managementNav = management ? [
    { to: "/admin", label: "דשבורד", icon: BarChart3 },
    { to: "/teachers", label: "מורים", icon: Users },
    { to: "/schedule", label: "עורך שיבוצים", icon: ClipboardList },
    { to: "/settings", label: "הגדרות", icon: Settings }
  ] : [];

  const navItems = management ? [...managementNav, ...teacherNav.filter(n => n.to !== "/")] : teacherNav;

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar - mobile */}
      <header className="lg:hidden sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <button onClick={() => setMobileOpen(true)} className="p-2 -mr-2">
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-bold text-sm">תורנויות מורים</span>
          <button onClick={toggleDark} className="p-2">
            {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <nav className="absolute right-0 top-0 bottom-0 w-72 bg-background border-l border-border p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <span className="font-bold">תפריט</span>
              <button onClick={() => setMobileOpen(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-1">
              {navItems.map(item => (
                <NavItem key={item.to} {...item} onClick={() => setMobileOpen(false)} />
              ))}
            </div>
          </nav>
        </div>
      )}

      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex flex-col w-60 border-l border-border min-h-screen sticky top-0 bg-background">
          <div className="p-5 border-b border-border">
            <h1 className="font-bold text-lg leading-tight">מערכת תורנויות</h1>
            <p className="text-xs text-muted-foreground mt-1">{teacher.full_name}</p>
            <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              {teacher.role === "admin" ? "מנהל מערכת" : teacher.role === "coordinator" ? "רכז" : "מורה"}
            </span>
          </div>
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {navItems.map(item => (
              <NavItem key={item.to} {...item} />
            ))}
          </nav>
          <div className="p-3 border-t border-border">
            <button onClick={toggleDark} className="flex items-center gap-2 w-full px-3 py-2 rounded-lg hover:bg-muted text-sm">
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              {dark ? "מצב בהיר" : "מצב כהה"}
            </button>
            <button onClick={async () => { await base44.auth.logout(); window.location.href = "/login"; }} className="flex items-center gap-2 w-full px-3 py-2 rounded-lg hover:bg-destructive/10 text-destructive text-sm mt-1">
              <X className="w-4 h-4" /> התנתק
            </button>
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0">
          <div className="lg:hidden flex justify-end px-4 py-2 border-b border-border">
            <button onClick={toggleDark} className="p-2">
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
          <div className="p-4 lg:p-6 max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

function NavItem({ to, label, icon: Icon, badge, onClick }) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
          isActive ? "bg-primary text-primary-foreground font-semibold" : "hover:bg-muted text-foreground"
        }`
      }
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="flex-1">{label}</span>
      {badge > 0 && (
        <span className="bg-destructive text-destructive-foreground text-xs rounded-full min-w-5 h-5 px-1 flex items-center justify-center">
          {badge}
        </span>
      )}
    </NavLink>
  );
}