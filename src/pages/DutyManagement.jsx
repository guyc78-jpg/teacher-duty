import React from "react";
import { useSearchParams } from "react-router-dom";
import ScheduleEditor from "@/pages/ScheduleEditor";
import FixedSchedule from "@/pages/FixedSchedule";

const tabs = [
  { value: "actual", label: "לוח בפועל", description: "שיבוצים לפי תאריך, כולל חריגים ושינויים" },
  { value: "fixed", label: "לוח קבוע", description: "תבנית שבועית חוזרת" }
];

export default function DutyManagement() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") === "fixed" ? "fixed" : "actual";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">ניהול תורנויות</h1>
        <p className="text-sm text-muted-foreground">הלוח הקבוע מגדיר את התבנית, והלוח בפועל מציג את השיבוצים לפי תאריך.</p>
      </div>
      <div className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-muted p-1" role="tablist" aria-label="סוג לוח">
        {tabs.map(tab => (
          <button key={tab.value} type="button" role="tab" aria-selected={activeTab === tab.value} onClick={() => setSearchParams({ tab: tab.value })} className={`min-h-14 rounded-lg px-3 py-2 text-right transition-colors ${activeTab === tab.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            <span className="block text-sm font-bold">{tab.label}</span>
            <span className="hidden text-xs sm:block">{tab.description}</span>
          </button>
        ))}
      </div>
      {activeTab === "fixed" ? <FixedSchedule embedded /> : <ScheduleEditor embedded />}
    </div>
  );
}