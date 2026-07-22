import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentTeacher } from "@/lib/dutyUtils";
import { saveOnboarding } from "@/functions/saveOnboarding";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft, CheckCircle2 } from "lucide-react";
import StepIdentity from "@/components/onboarding/StepIdentity";
import StepProfessional from "@/components/onboarding/StepProfessional";
import StepHomeroom from "@/components/onboarding/StepHomeroom";
import StepDaysOff from "@/components/onboarding/StepDaysOff";
import StepFinish from "@/components/onboarding/StepFinish";
import { DEFAULT_PREFS } from "@/components/onboarding/onboardingConstants";

const STEP_TITLES = ["אימות פרטים", "פרטים מקצועיים", "חינוך כיתה", "ימי חופש ופטור", "התראות וסיום"];

export default function Onboarding() {
  const navigate = useNavigate();
  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [pushStatus, setPushStatus] = useState(typeof Notification !== "undefined" ? Notification.permission : "unsupported");

  useEffect(() => {
    (async () => {
      const t = await getCurrentTeacher();
      setTeacher(t);
      if (t) {
        if (t.onboarding_completed) { navigate("/", { replace: true }); return; }
        let prefs = DEFAULT_PREFS;
        try { if (t.preferences) prefs = { ...DEFAULT_PREFS, ...JSON.parse(t.preferences) }; } catch {}
        setForm({
          full_name: t.full_name || "",
          email: t.email?.endsWith("@temp.school") ? "" : (t.email || ""),
          division: t.division || "high",
          subject: t.subject || "",
          additional_subjects: t.additional_subjects || [],
          is_sport_teacher: !!t.is_sport_teacher,
          is_homeroom: !!t.is_homeroom,
          homeroom_grade: t.homeroom_grade || "",
          homeroom_class: t.homeroom_class || "",
          days_off: t.days_off || [],
          request_exemption: t.exemption_status === "pending" || !!t.is_exempt,
          preferences: prefs
        });
        setStep(Math.min(Math.max(t.onboarding_step || 0, 0), 4));
      }
      setLoading(false);
    })();
  }, [navigate]);

  const set = (key, value) => { setForm(f => ({ ...f, [key]: value })); setError(""); };

  const validateStep = (s) => {
    if (s === 0) {
      if (!form.full_name.trim()) return "נא למלא שם מלא";
      if (!form.email.includes("@")) return "נא למלא כתובת דוא״ל תקינה";
    }
    if (s === 2 && form.is_homeroom && (!form.homeroom_grade || !form.homeroom_class)) return "נא לבחור שכבה וכיתה";
    return null;
  };

  const payload = () => ({ ...form, preferences: JSON.stringify(form.preferences) });

  const next = async () => {
    const err = validateStep(step);
    if (err) { setError(err); return; }
    setSaving(true);
    setError("");
    try {
      await saveOnboarding({ action: "step", step: step + 1, data: payload() });
      setStep(s => s + 1);
    } catch (e) {
      setError(e.response?.data?.error || "שגיאה בשמירה, נסה שוב");
    } finally { setSaving(false); }
  };

  const finish = async () => {
    if (saving) return;
    for (let s = 0; s <= 4; s++) {
      const err = validateStep(s);
      if (err) { setError(err); setStep(s); return; }
    }
    setSaving(true);
    setError("");
    try {
      await saveOnboarding({ action: "complete", data: payload() });
      setDone(true);
    } catch (e) {
      setError(e.response?.data?.error || "שגיאה בשמירה, נסה שוב");
    } finally { setSaving(false); }
  };

  const requestPush = async () => {
    if (typeof Notification === "undefined") return;
    const r = await Notification.requestPermission();
    setPushStatus(r);
  };

  if (loading) return <div className="fixed inset-0 flex items-center justify-center"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  if (!teacher) return (
    <div className="min-h-screen flex items-center justify-center p-6 text-center">
      <p className="text-muted-foreground">לחשבון שלך לא מוגדר פרופיל מורה. פנה למנהל המערכת.</p>
    </div>
  );

  if (done) return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center max-w-sm space-y-4">
        <CheckCircle2 className="w-14 h-14 mx-auto text-success" />
        <h1 className="text-xl font-bold">הקליטה הושלמה בהצלחה!</h1>
        <p className="text-sm text-muted-foreground">הפרטים נשמרו בפרופיל שלך וחוברו למנוע השיבוץ.{form.request_exemption && !teacher.is_exempt ? " בקשת הפטור ממתינה לאימות מנהל." : ""}</p>
        <Button className="w-full h-11" onClick={() => navigate("/", { replace: true })}>מעבר למערכת</Button>
      </div>
    </div>
  );

  const steps = [
    <StepIdentity key={0} form={form} set={set} teacher={teacher} />,
    <StepProfessional key={1} form={form} set={set} />,
    <StepHomeroom key={2} form={form} set={set} />,
    <StepDaysOff key={3} form={form} set={set} teacher={teacher} />,
    <StepFinish key={4} form={form} set={set} teacher={teacher} pushStatus={pushStatus} requestPush={requestPush} />
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto p-4 pb-28">
        <div className="pt-4 pb-5">
          <p className="text-xs text-muted-foreground mb-1">שלב {step + 1} מתוך 5</p>
          <h1 className="text-xl font-bold mb-3">{STEP_TITLES[step]}</h1>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${((step + 1) / 5) * 100}%` }} />
          </div>
        </div>

        {steps[step]}

        {error && <p className="mt-4 text-sm rounded-lg p-3 border status-danger">{error}</p>}
      </div>

      <div className="fixed bottom-0 inset-x-0 bg-background/95 backdrop-blur border-t border-border">
        <div className="max-w-lg mx-auto p-4 flex gap-3">
          {step > 0 && (
            <Button variant="outline" className="h-11 flex-1" onClick={() => { setError(""); setStep(s => s - 1); }} disabled={saving}>
              <ChevronRight className="w-4 h-4 ml-1" /> חזרה
            </Button>
          )}
          {step < 4 ? (
            <Button className="h-11 flex-1" onClick={next} disabled={saving}>
              {saving ? "שומר..." : <>הבא <ChevronLeft className="w-4 h-4 mr-1" /></>}
            </Button>
          ) : (
            <Button className="h-11 flex-1" onClick={finish} disabled={saving}>
              {saving ? "שומר..." : "אישור וסיום"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}