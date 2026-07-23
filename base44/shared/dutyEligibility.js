export const DUTY_BLOCK_MESSAGE = "לא ניתן לשבץ מורה זה לתורנות – פטור/מנהל/רכז";

const blockedRoles = new Set(["admin", "management", "coordinator"]);

export function dutyBlockLabels(teacher) {
  if (!teacher) return ["מורה לא נמצא"];
  const labels = [];
  if (teacher.is_exempt) labels.push("פטור מתורנות");
  if (["admin", "management"].includes(teacher.role)) labels.push("מנהל/ת");
  if (teacher.role === "coordinator") labels.push("רכז/ת");
  return labels;
}

export function isDutyEligible(teacher) {
  return !!teacher && !teacher.is_exempt && !blockedRoles.has(teacher.role);
}

export function dutyEligibility(teacher) {
  const labels = dutyBlockLabels(teacher);
  return { eligible: labels.length === 0, labels, reason: labels.length ? DUTY_BLOCK_MESSAGE : "" };
}