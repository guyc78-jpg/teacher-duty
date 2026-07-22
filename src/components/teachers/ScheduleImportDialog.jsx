import React from "react";
import { FileSpreadsheet, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import useScheduleImport from "@/components/teachers/useScheduleImport";

export default function ScheduleImportDialog({ teachers, onClose }) {
  const importer = useScheduleImport(teachers);
  const busy = importer.status === "analyzing" || importer.status === "importing";
  const teacherCount = new Set(importer.rows.map(row => row.teacher_id)).size;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-foreground/40" onClick={busy ? undefined : onClose} />
      <div className="relative bg-background rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div><h2 className="font-bold text-lg">ייבוא מערכות שעות</h2><p className="text-sm text-muted-foreground">Excel ‏(.xlsx) או PDF, בהתאמה לפי שם מלא</p></div>
          <button onClick={onClose} disabled={busy}><X className="w-5 h-5" /></button>
        </div>
        {importer.status === "idle" && <label className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border p-8 cursor-pointer hover:bg-muted/50">
          <FileSpreadsheet className="w-10 h-10 text-primary" /><span className="font-medium">בחירת קובץ</span><span className="text-xs text-muted-foreground">הקובץ לא יישמר לאחר סיום הייבוא</span>
          <input type="file" accept=".xlsx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" onChange={event => event.target.files?.[0] && importer.analyze(event.target.files[0])} />
        </label>}
        {importer.status === "analyzing" && <Status text="קורא ומנתח את מערכות השעות..." />}
        {(importer.status === "preview" || importer.status === "importing") && <>
          <div className="rounded-xl bg-muted p-4 text-sm"><strong>{importer.rows.length}</strong> שיעורים נמצאו עבור <strong>{teacherCount}</strong> מורים.</div>
          {importer.unmatched.length > 0 && <div className="rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm"><strong>לא נמצאה התאמה:</strong> {importer.unmatched.join(", ")}. שורות אלו לא ייובאו.</div>}
          <p className="text-sm text-muted-foreground">האישור יחליף את מערכות השעות הקיימות של המורים שנמצאו בקובץ.</p>
          <Button className="w-full" disabled={!importer.rows.length || busy} onClick={importer.importRows}>{busy ? <><Loader2 className="animate-spin" /> שומר...</> : "אישור והחלפת מערכות"}</Button>
        </>}
        {importer.status === "done" && <><div className="rounded-xl bg-success/10 text-success p-4 text-center">{importer.imported} שיעורים יובאו בהצלחה.</div><Button className="w-full" onClick={onClose}>סיום</Button></>}
        {importer.error && <p className="text-sm text-destructive">{importer.error}</p>}
      </div>
    </div>
  );
}

function Status({ text }) { return <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground"><Loader2 className="animate-spin" /> {text}</div>; }