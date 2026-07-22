const toMinutes = time => {
  const [hours, minutes] = (time || "00:00").split(":").map(Number);
  return hours * 60 + minutes;
};

const overlaps = (first, second) =>
  toMinutes(first.start_time) < toMinutes(second.end_time) &&
  toMinutes(second.start_time) < toMinutes(first.end_time);

export function validateAssignments(assignments) {
  const uncovered = assignments.filter(assignment => !assignment.teacher_id);
  const conflicts = [];

  assignments.forEach((assignment, index) => {
    if (!assignment.teacher_id) return;
    assignments.slice(index + 1).forEach(other => {
      if (assignment.teacher_id === other.teacher_id && assignment.date === other.date && overlaps(assignment, other)) {
        conflicts.push({ first: assignment, second: other });
      }
    });
  });

  return {
    covered: assignments.length - uncovered.length,
    total: assignments.length,
    uncovered,
    conflicts,
    isValid: assignments.length > 0 && uncovered.length === 0 && conflicts.length === 0,
  };
}