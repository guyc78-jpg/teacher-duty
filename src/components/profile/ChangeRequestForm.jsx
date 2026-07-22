import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { saveOnboarding } from "@/functions/saveOnboarding";
import { Button } from "@/components/ui/button";
import StepProfessional from "@/components/onboarding/StepProfessional";
import StepHomeroom from "@/components/onboarding/StepHomeroom";
import StepDaysOff from "@/components/onboarding/StepDaysOff";

export default function ChangeRequestForm({ teacher, onSubmitted, onCancel, directSave = false }) {
  const [form, setForm] = useState({
    subject: teacher.subject || "",
    additional_subjects: teacher.additional_subjects || [],
    is_sport_teacher: !!teacher.is_sport_teacher,
    is_homeroom: !!teacher.is_homeroom,
    homeroom_grade: teacher.homeroom_grade || "",
    homeroom_class: teacher.homeroom_class || "",
    days_off: teacher.days_off || [],
    request_exemption: teacher.exemption_status === "pending" || !!teacher.is_exempt
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (key, value) => { setForm(f => ({ ...f, [key]: value })); setError(""); };

  const submit = async () => {
    if (form.is_homeroom && (!form.homeroom_grade || !form.homeroom_class)) { setError("נא לבחור שכבה וכיתה"); return; }
    setSaving(true);
    setError("");
    try {
      if (directSave) {
        const { request_exemption, ...fields } = form;
        await base44.entities.TeacherProfile.update(teacher.id, {
          ...fields,
          is_exempt: request_exemption,
          exemption_status: request_exemption ? "approved" : "none"
        });
      } else {
        await saveOnboarding({ action: "request_change", data: form });
      }
      onSubmitted();
    } catch (e) {
      setError(e.response?.data?.error || "שגיאה בשליחת הבקשה");
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-5 pt-2">
      <StepProfessional form={form} set={set} />
      <StepHomeroom form={form} set={set} />
      <StepDaysOff form={form} set={set} teacher={teacher} />
      {error && <p className="text-sm rounded-lg p-3 border status-danger">{error}</p>}
      {!directSave && <p className="text-xs text-muted-foreground">השינויים ייכנסו לתוקף וישפיעו על השיבוץ רק לאחר אישור מנהל המערכת.</p>}
      <div className="flex gap-2">
        <Button className="flex-1 h-11" onClick={submit} disabled={saving}>{saving ? "שומר..." : directSave ? "שמירה" : "שלח לאישור מנהל"}</Button>
        <Button variant="outline" className="h-11" onClick={onCancel} disabled={saving}>ביטול</Button>
      </div>
    </div>
  );
}