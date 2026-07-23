export function patchSchedulerData(old, saved) {
  if (!old) return old;
  const match = item => item.break_type === saved.break_type && item.station_id === saved.station_id;
  const exceptions = (old.exceptions || []).filter(item => !(item.date === saved.date && match(item)));
  if (saved.scope === "fixed") {
    const template_assignments = (old.template_assignments || []).filter(item => !(Number(item.day_of_week) === saved.day_of_week && match(item)));
    if (saved.teacher_ids.length) template_assignments.push({ day_of_week: saved.day_of_week, break_type: saved.break_type, station_id: saved.station_id, teacher_ids: saved.teacher_ids, teacher_names: saved.teacher_names });
    return { ...old, template_assignments, exceptions };
  }
  exceptions.push({ date: saved.date, day_of_week: saved.day_of_week, break_type: saved.break_type, station_id: saved.station_id, teacher_ids: saved.teacher_ids, teacher_names: saved.teacher_names });
  return { ...old, exceptions };
}