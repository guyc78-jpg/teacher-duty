import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { getCurrentTeacher, formatDateWithDay, todayISO, INCIDENT_CATEGORIES, SEVERITY_LABELS } from "@/lib/dutyUtils";
import { AlertTriangle, Phone, Camera, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Image } from "@/components/ui/image";

export default function Incidents() {
  const [teacher, setTeacher] = useState(null);
  const [myReports, setMyReports] = useState([]);
  const [allReports, setAllReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [settings, setSettings] = useState(null);

  const load = useCallback(async () => {
    const t = await getCurrentTeacher();
    setTeacher(t);
    if (t) {
      const [mine] = await Promise.all([
        base44.entities.IncidentReport.filter({ reporter_id: t.id }, "-event_time", 50)
      ]);
      setMyReports(mine);
      if (t.role === "admin" || t.role === "coordinator") {
        const all = await base44.entities.IncidentReport.list("-event_time", 100);
        setAllReports(all);
      }
      const s = await base44.entities.SystemSettings.list();
      setSettings(s[0]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;
  if (!teacher) return <p className="text-center py-20 text-muted-foreground">לא נמצא פרופיל מורה.</p>;

  const isManagement = teacher.role === "admin" || teacher.role === "coordinator";
  const reports = isManagement ? allReports : myReports;

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">אירועים חריגים</h1>
        <Button onClick={() => setShowCreate(true)} size="sm">
          <AlertTriangle className="w-4 h-4 ml-1" /> דיווח
        </Button>
      </div>

      {settings?.security_coordinator_phone && (
        <a href={`tel:${settings.security_coordinator_phone}`} className="flex items-center gap-3 rounded-xl border border-warning/30 bg-warning/10 p-3">
          <Phone className="w-5 h-5 text-warning" />
          <div>
            <p className="text-sm font-medium">חיוג לרכז הביטחון</p>
            <p className="text-xs text-muted-foreground">{settings.security_coordinator_phone}</p>
          </div>
        </a>
      )}

      {reports.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <AlertTriangle className="w-10 h-10 mx-auto mb-2" />
          אין אירועים להצגה
        </div>
      ) : (
        <div className="space-y-2">
          {reports.map(r => {
            const sev = SEVERITY_LABELS[r.severity] || SEVERITY_LABELS.low;
            const statusLabels = { open: "פתוח", in_progress: "בטיפול", resolved: "טופל" };
            return (
              <div key={r.id} className="rounded-xl border border-border p-3 bg-card">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-medium">{INCIDENT_CATEGORIES[r.category] || r.category}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${sev.class}`}>{sev.label}</span>
                </div>
                <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{r.description}</p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{r.date ? formatDateWithDay(r.date) : ""}</span>
                  <span className={`px-2 py-0.5 rounded-full ${r.status === "resolved" ? "status-success" : "status-warning"}`}>
                    {statusLabels[r.status] || r.status}
                  </span>
                </div>
                {r.station_name && <p className="text-xs text-muted-foreground mt-1">עמדה: {r.station_name}</p>}
              </div>
            );
          })}
        </div>
      )}

      {showCreate && (
        <CreateIncidentModal teacher={teacher} onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load(); }} />
      )}
    </div>
  );
}

function CreateIncidentModal({ teacher, onClose, onCreated }) {
  const [category, setCategory] = useState("other");
  const [severity, setSeverity] = useState("low");
  const [description, setDescription] = useState("");
  const [stationName, setStationName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!description.trim()) { alert("נא להזין תיאור"); return; }
    setSubmitting(true);
    try {
      await base44.entities.IncidentReport.create({
        reporter_id: teacher.id,
        reporter_name: teacher.full_name,
        category,
        severity,
        description: description.trim(),
        station_name: stationName || null,
        image_url: imageUrl || null,
        event_time: new Date().toISOString(),
        date: todayISO(),
        status: "open"
      });
      // Notify admins of severe incidents
      if (severity === "high" || severity === "critical") {
        const admins = await base44.entities.TeacherProfile.filter({ role: "admin", is_active: true });
        for (const a of admins) {
          await base44.entities.Notification.create({
            user_id: a.user_id,
            title: "אירוע חריג חמור",
            body: "דווח אירוע חריג חמור. יש להיכנס למערכת לצפייה בפרטים.",
            type: "incident",
            link: "/incidents",
            is_operational: true,
            created_at: new Date().toISOString()
          });
        }
      }
      onCreated();
    } catch (err) { alert("שגיאה: " + (err.message || "")); }
    finally { setSubmitting(false); }
  };

  const uploadImage = async (file) => {
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setImageUrl(file_url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-background rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[85vh] overflow-y-auto p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg">דיווח אירוע חריג</h2>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1.5">קטגוריה</label>
            <select value={category} onChange={e => setCategory(e.target.value)} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm">
              {Object.entries(INCIDENT_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1.5">דרגת חומרה</label>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(SEVERITY_LABELS).map(([k, v]) => (
                <button key={k} onClick={() => setSeverity(k)} className={`py-2 rounded-lg border text-xs ${severity === k ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>
                  {v.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1.5">עמדה (אופציונלי)</label>
            <input value={stationName} onChange={e => setStationName(e.target.value)} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm" placeholder="שם העמדה" />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1.5">תיאור</label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} placeholder="תארו את האירוע..." />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1.5">תמונה (אופציונלי)</label>
            {imageUrl ? (
              <div className="relative">
                <Image src={imageUrl} className="w-full h-40 rounded-lg object-cover" fittingType="fill" />
                <button onClick={() => setImageUrl("")} className="absolute top-2 left-2 bg-destructive text-destructive-foreground rounded-full p-1"><X className="w-4 h-4" /></button>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 h-32 rounded-lg border-2 border-dashed border-border cursor-pointer hover:bg-muted">
                <Camera className="w-6 h-6 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">העלאת תמונה</span>
                <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files[0] && uploadImage(e.target.files[0])} />
              </label>
            )}
          </div>
          <Button onClick={submit} disabled={submitting} className="w-full h-11">
            {submitting ? "שולח..." : <><Send className="w-4 h-4 ml-2" /> שלח דיווח</>}
          </Button>
        </div>
      </div>
    </div>
  );
}