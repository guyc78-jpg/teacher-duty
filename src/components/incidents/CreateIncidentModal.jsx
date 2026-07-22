import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Camera, Phone, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import CloseButton from "@/components/ui/close-button";
import { Textarea } from "@/components/ui/textarea";
import { Image } from "@/components/ui/image";
import { BREAK_TYPES, INCIDENT_CATEGORIES, SEVERITY_LABELS, formatDate, formatTime, formatTimeRange, todayISO } from "@/lib/dutyUtils";

export default function CreateIncidentModal({ teacher, securityPhone, onClose, onCreated }) {
  const [form, setForm] = useState({ category: "other", severity: "low", description: "" });
  const [assignment, setAssignment] = useState(null);
  const [eventTime] = useState(() => new Date());
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadCurrentDuty = async () => {
      const currentTime = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jerusalem", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(eventTime);
      const duties = await base44.entities.Assignment.filter({ teacher_id: teacher.id, date: todayISO(), plan_status: "published" });
      setAssignment(duties.find(duty => duty.start_time <= currentTime && currentTime <= duty.end_time) || null);
    };
    loadCurrentDuty();
  }, [eventTime, teacher.id]);

  const uploadImage = async (file) => {
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setImageUrl(file_url);
    setUploading(false);
  };

  const submit = async () => {
    if (!form.description.trim()) return;
    setSubmitting(true);
    try {
      await base44.entities.IncidentReport.create({
        reporter_id: teacher.id, reporter_name: teacher.full_name,
        assignment_id: assignment?.id || null, station_id: assignment?.station_id || null,
        station_name: assignment?.station_name || null, category: form.category,
        severity: form.severity, description: form.description.trim(), image_url: imageUrl || null,
        event_time: eventTime.toISOString(), date: todayISO(), status: "open"
      });
      if (form.severity === "high" || form.severity === "critical") {
        const admins = await base44.entities.TeacherProfile.filter({ role: "admin", is_active: true });
        await Promise.all(admins.filter(admin => admin.user_id).map(admin => base44.entities.Notification.create({
          user_id: admin.user_id, title: "אירוע חריג חמור", body: "דווח אירוע חריג חמור. יש להיכנס למערכת לצפייה בפרטים.",
          type: "incident", link: "/incidents", is_operational: true, created_at: new Date().toISOString()
        })));
      }
      onCreated();
    } catch (error) {
      alert("שגיאה: " + (error.message || ""));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full sm:max-w-md max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-background p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-lg">דיווח אירוע חריג</h2>
          <CloseButton onClick={onClose} label="סגירת דיווח אירוע" />
        </div>

        <div className="mb-3 rounded-lg bg-muted p-2.5 text-xs">
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
            <span>תאריך: <strong className="text-foreground">{formatDate(todayISO())}</strong></span>
            <span>שעה: <strong className="text-foreground">{formatTime(eventTime)}</strong></span>
          </div>
          <p className="mt-1 font-medium">
            {assignment ? `${BREAK_TYPES[assignment.break_type]?.label || assignment.break_name} · ${formatTimeRange(assignment.start_time, assignment.end_time)} · ${assignment.station_name}` : "אין תורנות פעילה כרגע"}
          </p>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="text-sm font-medium">קטגוריה
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="mt-1 w-full h-9 rounded-lg border border-input bg-background px-2 text-sm">
                {Object.entries(INCIDENT_CATEGORIES).map(([key, value]) => <option key={key} value={key}>{value}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium">חומרה
              <select value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value })} className="mt-1 w-full h-9 rounded-lg border border-input bg-background px-2 text-sm">
                {Object.entries(SEVERITY_LABELS).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}
              </select>
            </label>
          </div>

          {form.severity === "critical" && (securityPhone ? (
            <a href={`tel:${securityPhone}`} className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-destructive px-3 text-sm font-bold text-destructive-foreground">
              <Phone className="w-4 h-4" /> התקשר מיד לרכז הביטחון
            </a>
          ) : (
            <button disabled className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-destructive/15 px-3 text-sm font-bold text-destructive">
              <Phone className="w-4 h-4" /> מספר רכז הביטחון לא הוגדר
            </button>
          ))}

          <label className="block text-sm font-medium">תיאור <span className="text-destructive">*</span>
            <Textarea required value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} className="mt-1" placeholder="תארו בקצרה מה קרה..." />
          </label>

          <div>
            <span className="text-sm font-medium">תמונה <span className="font-normal text-muted-foreground">(אופציונלי)</span></span>
            {imageUrl ? (
              <div className="relative mt-1 w-24">
                <Image src={imageUrl} className="h-16 w-24 rounded-md" fittingType="fill" />
                <button onClick={() => setImageUrl("")} className="absolute -left-2 -top-2 rounded-full bg-destructive p-1 text-destructive-foreground" aria-label="הסרת תמונה"><X className="w-3 h-3" /></button>
              </div>
            ) : (
              <label className="mt-1 flex h-12 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border hover:bg-muted">
                <Camera className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{uploading ? "מעלה תמונה..." : "הוספת תמונה"}</span>
                <input type="file" accept="image/*" disabled={uploading} className="hidden" onChange={e => e.target.files[0] && uploadImage(e.target.files[0])} />
              </label>
            )}
          </div>

          <Button onClick={submit} disabled={submitting || uploading || !form.description.trim()} className="w-full h-10">
            {submitting ? "שולח..." : <><Send className="w-4 h-4 ml-1" /> שלח דיווח</>}
          </Button>
        </div>
      </div>
    </div>
  );
}