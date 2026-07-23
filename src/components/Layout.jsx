import React, { useState, useEffect } from "react";
import { Outlet, NavLink, useNavigate, Navigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { getCurrentTeacher, isManagement, isAdmin } from "@/lib/dutyUtils";
import { Menu, Bell, Calendar, CalendarRange, Users, User, LogOut, Settings, ClipboardList, BarChart3, AlertTriangle, Repeat, Home as HomeIcon, ShieldCheck, Moon, Sun } from "lucide-react";
import MobileBottomNav from "@/components/MobileBottomNav";
import CloseButton from "@/components/ui/close-button";
import PushToggle from "@/components/PushToggle";
import { ROLE_LABELS } from "@/components/onboarding/onboardingConstants";
import { useAuth } from "@/lib/AuthContext";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";

export default function Layout() {
  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    (async () => {
      const t = await getCurrentTeacher(user);
      setTeacher(t);
      setLoading(false);
      if (t) {
        try {
          const notifs = await base44.entities.Notification.filter({ user_id: t.user_id, is_read: false }, "-created_date", 100);
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
          <p className="text-muted-foreground mb-6">לחשבון שלך לא מוגדר פרופיל מורה. פנה למנהל/ת המערכת להשלמת ההרשמה.</p>
        </div>
      </div>
    );
  }

  // קליטה ראשונית חובה — למעט מנהל מערכת
  if (!teacher.onboarding_completed && teacher.role !== "admin") {
    return <Navigate to="/onboarding" replace />;
  }

  const management = isManagement(teacher);
  const roleLabel = ROLE_LABELS[teacher.role] || "מורה";
  const logout = async () => {
    await base44.auth.logout();
    window.location.href = "/login";
  };

  const teacherNav = [
    { to: "/", label: "בית", icon: HomeIcon },
    { to: "/my-duties", label: "התורנויות שלי", icon: Calendar },
    { to: "/swaps", label: "החלפות", icon: Repeat },
    { to: "/incidents", label: "אירועים חריגים", icon: AlertTriangle },
    { to: "/notifications", label: "התראות", icon: Bell, badge: unreadCount },
    { to: "/profile", label: "פרופיל", icon: User }
  ];

  const managementNav = management ? [
    { to: "/admin", label: "דשבורד", icon: BarChart3 },
    { to: "/teachers", label: "מורים", icon: Users },
    { to: "/schedule", label: "שיבוץ תורנויות", icon: ClipboardList },
    { to: "/fixed-schedule", label: "לוח קבוע", icon: Calendar },
    { to: "/special-days", label: "ימים מיוחדים", icon: CalendarRange },
    { to: "/settings", label: "הגדרות", icon: Settings }
  ] : [];

  const navItems = management ? [...managementNav, ...teacherNav.filter(item => item.to !== "/")] : teacherNav;
  const drawerItems = management
    ? [...managementNav, ...teacherNav.filter(item => item.to === "/incidents" || item.to === "/profile")]
    : teacherNav.filter(item => item.to === "/incidents" || item.to === "/profile");

  return (
    <ConfirmProvider>
    <div className="mobile-compact min-h-screen bg-background">
      {/* Top bar - mobile */}
      <header className="lg:hidden sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-3 h-12">
          <button type="button" onClick={() => setMobileOpen(true)} className="relative z-10 flex h-12 w-12 shrink-0 touch-manipulation items-center justify-center" aria-label="פתיחת תפריט">
            <Menu className="h-6 w-6 pointer-events-none" />
          </button>
          <span className="font-bold text-sm">תורנויות מורים</span>
          <div className="flex items-center">
            <PushToggle />
            <button onClick={toggleDark} className="min-w-11 min-h-11 flex items-center justify-center" aria-label={dark ? "מעבר למצב בהיר" : "מעבר למצב כהה"}>
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <nav className="absolute bottom-0 right-0 top-0 flex w-72 flex-col overflow-y-auto border-l border-border bg-background p-3">
            <div className="flex items-center justify-between">
              <span className="font-bold">תפריט</span>
              <CloseButton onClick={() => setMobileOpen(false)} label="סגירת תפריט" />
            </div>
            <div className="mb-3 rounded-xl bg-muted p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><User className="h-5 w-5" /></div>
                <div className="min-w-0"><p className="truncate text-sm font-bold">{teacher.full_name}</p><p className="truncate text-xs text-muted-foreground" dir="ltr">{teacher.email}</p></div>
              </div>
              <span className="mt-2 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{roleLabel}</span>
            </div>
            <div className="flex-1 space-y-1">
              {drawerItems.map(item => <NavItem key={item.to} {...item} onClick={() => setMobileOpen(false)} />)}
            </div>
            <div className="border-t border-border pt-2">
              <button onClick={toggleDark} className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-sm hover:bg-muted">{dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}{dark ? "מצב בהיר" : "מצב כהה"}</button>
              <button onClick={logout} className="mt-1 flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-sm text-destructive hover:bg-destructive/10"><LogOut className="h-4 w-4" />התנתקות</button>
            </div>
          </nav>
        </div>
      )}

      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex flex-col w-60 border-l border-border min-h-screen sticky top-0 bg-background">
          <div className="p-5 border-b border-border">
            <h1 className="font-bold text-lg leading-tight">מערכת תורנויות</h1>
            <p className="mt-1 text-xs text-muted-foreground">{teacher.full_name}</p>
            <p className="truncate text-xs text-muted-foreground" dir="ltr">{teacher.email}</p>
            <span className="mt-2 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{roleLabel}</span>
          </div>
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {navItems.map(item => (
              <NavItem key={item.to} {...item} />
            ))}
          </nav>
          <div className="p-3 border-t border-border">
            <PushToggle variant="row" />
            <button onClick={toggleDark} className="flex items-center gap-2 w-full px-3 py-2 rounded-lg hover:bg-muted text-sm">
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              {dark ? "מצב בהיר" : "מצב כהה"}
            </button>
            <button onClick={logout} className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/10">
              <LogOut className="h-4 w-4" /> התנתקות
            </button>
          </div>
        </aside>

        {/* Content */}
        <main className="min-w-0 flex-1 pb-20 lg:pb-0">
          <div className="mx-auto max-w-7xl p-3 sm:p-4 lg:p-6">
            <Outlet />
          </div>
        </main>
      </div>
      <MobileBottomNav unreadCount={unreadCount} />
    </div>
    </ConfirmProvider>
  );
}

function NavItem({ to, label, icon: Icon, badge, onClick }) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      onClick={onClick}
      className={({ isActive }) =>
        `flex min-h-11 items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
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