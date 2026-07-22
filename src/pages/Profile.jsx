import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { getCurrentTeacher } from "@/lib/dutyUtils";
import PersonalProfileSection from "@/components/profile/PersonalProfileSection";
import ProfessionalProfileSection from "@/components/profile/ProfessionalProfileSection";
import NotificationPreferences from "@/components/profile/NotificationPreferences";

export default function Profile() {
  const [teacher, setTeacher] = useState(null);
  const [activeTab, setActiveTab] = useState("personal");
  const [editing, setEditing] = useState(false);
  const [pendingRequest, setPendingRequest] = useState(null);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const t = await getCurrentTeacher();
    setTeacher(t);
    if (t) {
      const reqs = await base44.entities.ProfileChangeRequest.filter({ teacher_id: t.id, status: "pending" });
      setPendingRequest(reqs[0] || null);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (!teacher) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  const tabs = [
    { key: "personal", label: "אישי" },
    { key: "professional", label: "מקצועי" },
    { key: "notifications", label: "התראות" }
  ];

  return (
    <div className="max-w-2xl space-y-3 pb-4">
      <h1 className="text-2xl font-bold">פרופיל והעדפות</h1>
      <nav className="grid grid-cols-3 rounded-lg bg-muted p-1" aria-label="חלקי הפרופיל">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`min-h-10 rounded-md px-3 text-sm font-medium transition-colors ${activeTab === tab.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            {tab.label}
          </button>
        ))}
      </nav>
      {message && activeTab === "professional" && <p className="rounded-lg border p-3 text-sm status-success">{message}</p>}
      {activeTab === "personal" && <PersonalProfileSection teacher={teacher} />}
      {activeTab === "professional" && (
        <ProfessionalProfileSection
          teacher={teacher}
          pendingRequest={pendingRequest}
          editing={editing}
          setEditing={setEditing}
          onSubmitted={() => { setEditing(false); setMessage(teacher.role === "admin" ? "הפרופיל עודכן בהצלחה." : "הבקשה נשלחה לאישור מנהל המערכת."); load(); }}
        />
      )}
      {activeTab === "notifications" && <NotificationPreferences teacher={teacher} />}
    </div>
  );
}