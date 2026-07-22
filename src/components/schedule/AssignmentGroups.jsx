import React from "react";
import { BREAK_TYPES } from "@/lib/dutyUtils";
import AssignmentCard from "@/components/schedule/AssignmentCard";

const breakOrder = { big: 0, medium: 1, small: 2 };

export default function AssignmentGroups({ assignments, isDraft, teachers, onTeacherChange }) {
  const breaks = Object.entries(assignments.reduce((groups, assignment) => {
    (groups[assignment.break_type] ||= []).push(assignment);
    return groups;
  }, {})).sort(([first], [second]) => (breakOrder[first] ?? 9) - (breakOrder[second] ?? 9));

  return (
    <div className="space-y-3">
      {breaks.map(([breakType, breakAssignments]) => {
        const stations = Object.entries(breakAssignments.reduce((groups, assignment) => {
          (groups[assignment.station_name] ||= []).push(assignment);
          return groups;
        }, {})).sort(([first], [second]) => first.localeCompare(second, "he"));
        const breakInfo = BREAK_TYPES[breakType];
        return (
          <section key={breakType} className="rounded-xl border border-border bg-muted/20 p-2.5">
            <h4 className={`mb-2 inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${breakInfo.color}`}>{breakInfo.label}</h4>
            <div className="space-y-2">
              {stations.map(([station, stationAssignments]) => (
                <div key={station} className="space-y-1.5">
                  <p className="px-1 text-xs font-semibold text-muted-foreground">{station}</p>
                  {stationAssignments.sort((a, b) => a.start_time.localeCompare(b.start_time)).map(assignment => <AssignmentCard key={assignment.id} assignment={assignment} isDraft={isDraft} teachers={teachers} onTeacherChange={onTeacherChange} />)}
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}