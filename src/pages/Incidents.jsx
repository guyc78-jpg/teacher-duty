import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { getCurrentTeacher, formatDateWithDay, INCIDENT_CATEGORIES, SEVERITY_LABELS } from "@/lib/dutyUtils";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import CreateIncidentModal from "@/components/incidents/CreateIncidentModal";

export default function Incidents() {
  const [teacher, setTeacher] = useState(null);
  const [myReports, setMyReports] = useState([]);
  const [allReports, setAllReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [settings, setSettings] = useState(null);

  const load = useCallback(async () => {
    const currentTeacher = await getCurrentTeacher();
    setTeacher(currentTeacher);
    if (currentTeacher) {
      const mine = await base44.entities.IncidentReport.filter({ reporter_id: currentTeacher.id }, "-event_time", 50);
      setMyReports(mine);
      if (currentTeacher.role === "admin" || currentTeacher.role === "coordinator") {
        setAllReports(await base44.entities.IncidentReport.list("-event_time", 100));
      }
      const systemSettings = await base44.entities.SystemSettings.list();
      setSettings(systemSettings[0]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" /></div>;
  if (!teacher) return <p className="py-20 text-center text-muted-foreground">לא נמצא פרופיל מורה.</p>;

  const isManagement = teacher.role === "admin" || teacher.role === "coordinator";
  const reports = isManagement ? allReports : myReports;

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">אירועים חריגים</h1>
        <Button onClick={() => setShowCreate(true)} size="sm"><AlertTriangle className="h-4 w-4" />דיווח</Button>
      </div>

      {reports.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground"><AlertTriangle className="mx-auto mb-2 h-10 w-10" />אין אירועים להצגה</div>
      ) : (
        <div className="space-y-2">
          {reports.map(report => {
            const severity = SEVERITY_LABELS[report.severity] || SEVERITY_LABELS.low;
            const statusLabels = { open: "פתוח", in_progress: "בטיפול", resolved: "טופל" };
            return (
              <div key={report.id} className="rounded-xl border border-border bg-card p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="font-medium">{INCIDENT_CATEGORIES[report.category] || report.category}</span>
                  <span className={`rounded-full border px-2 py-0.5 text-xs ${severity.class}`}>{severity.label}</span>
                </div>
                <p className="mb-2 line-clamp-2 text-sm text-muted-foreground">{report.description}</p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{report.date ? formatDateWithDay(report.date) : ""}</span>
                  <span className={`rounded-full px-2 py-0.5 ${report.status === "resolved" ? "status-success" : "status-warning"}`}>{statusLabels[report.status] || report.status}</span>
                </div>
                {report.station_name && <p className="mt-1 text-xs text-muted-foreground">עמדה: {report.station_name}</p>}
              </div>
            );
          })}
        </div>
      )}

      {showCreate && (
        <CreateIncidentModal
          teacher={teacher}
          securityPhone={settings?.security_coordinator_phone}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); load(); }}
        />
      )}
    </div>
  );
}