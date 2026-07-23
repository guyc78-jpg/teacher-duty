import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Edit, MoreVertical, Trash2, CalendarPlus, CalendarDays, Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import CloseButton from "@/components/ui/close-button";
import { clearDetailsCache } from "@/components/teachers/details/detailsData";
import PersonalDetailsSection from "@/components/teachers/details/PersonalDetailsSection";
import FixedDutiesSection from "@/components/teachers/details/FixedDutiesSection";
import UpcomingChangesSection from "@/components/teachers/details/UpcomingChangesSection";
import DutyBalanceSection from "@/components/teachers/details/DutyBalanceSection";
import AvailabilitySection from "@/components/teachers/details/AvailabilitySection";
import SwapsSection from "@/components/teachers/details/SwapsSection";
import AdminAlertsSection from "@/components/teachers/details/AdminAlertsSection";
import TeacherScheduleSection from "@/components/teachers/TeacherScheduleSection";

export default function TeacherDetailsCard({ teacher, onClose, onEdit, onDelete, canEdit }) {
  const navigate = useNavigate();
  useEffect(() => { clearDetailsCache(); }, [teacher.id]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button aria-label="סגירת פרטי מורה" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative flex max-h-[88vh] w-full flex-col rounded-t-2xl bg-background sm:max-w-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-border p-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold">{teacher.full_name}</h2>
            <p className="text-sm text-muted-foreground">כרטיס מורה מקצועי</p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <Button size="sm" variant="outline" onClick={onEdit}><Edit className="h-4 w-4" /> עריכה</Button>
            {onDelete && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="ghost" aria-label="פעולות נוספות"><MoreVertical className="h-4 w-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={onDelete}>
                    <Trash2 className="ml-2 h-4 w-4" /> מחיקת מורה
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <CloseButton onClick={onClose} label="סגירת פרטי המורה" />
          </div>
        </div>
        <div className="flex flex-wrap gap-2 border-b border-border px-4 py-3">
          <Button size="sm" variant="secondary" onClick={() => navigate("/fixed-schedule")}><CalendarPlus className="h-4 w-4" /> שבץ לתורנות</Button>
          <Button size="sm" variant="secondary" onClick={() => navigate("/schedule")}><CalendarDays className="h-4 w-4" /> צפה בלוח השבועי</Button>
          <Button size="sm" variant="secondary" onClick={() => navigate("/swaps")}><Repeat className="h-4 w-4" /> צור החלפה</Button>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          <PersonalDetailsSection teacher={teacher} />
          <FixedDutiesSection teacherId={teacher.id} />
          <UpcomingChangesSection teacher={teacher} />
          <DutyBalanceSection teacher={teacher} />
          <AvailabilitySection teacher={teacher} />
          <TeacherScheduleSection teacherId={teacher.id} editable={canEdit} />
          <SwapsSection teacherId={teacher.id} />
          <AdminAlertsSection teacher={teacher} />
        </div>
      </div>
    </div>
  );
}