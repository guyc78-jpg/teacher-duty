import React, { useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import ScheduleImportDialog from "@/components/teachers/ScheduleImportDialog";

export default function ScheduleImportButton({ teachers }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Upload className="w-4 h-4 ml-1" /> ייבוא מערכות
      </Button>
      {open && <ScheduleImportDialog teachers={teachers} onClose={() => setOpen(false)} />}
    </>
  );
}