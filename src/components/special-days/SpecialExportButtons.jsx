import React from "react";
import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SpecialExportButtons({ day, assignments }) {
  const excel = () => { const rows = [["אירוע","תאריך","מקטע","שעה","עמדה","מורה"], ...assignments.map(a => [day.name, day.date, a.time_slot_name, `${a.start_time}-${a.end_time}`, a.position_name, a.teacher_name])], csv = "\ufeff" + rows.map(r => r.map(v => `"${String(v || "").replaceAll('"','""')}"`).join(",")).join("\n"), url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })), link = document.createElement("a"); link.href = url; link.download = `${day.name}.csv`; link.click(); URL.revokeObjectURL(url); };
  return <div className="flex gap-2 print:hidden"><Button variant="outline" onClick={() => window.print()}><Printer />PDF</Button><Button variant="outline" onClick={excel}><Download />Excel</Button></div>;
}