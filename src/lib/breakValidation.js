const toMinutes = value => {
  const [hours, minutes] = (value || "00:00").split(":").map(Number);
  return hours * 60 + minutes;
};

export function getBreakValidationError(form, breaks, currentId) {
  if (!form.name?.trim() || !form.start_time || !form.end_time) return "יש למלא שם, שעת התחלה ושעת סיום.";
  if (toMinutes(form.end_time) <= toMinutes(form.start_time)) return "שעת הסיום חייבת להיות מאוחרת משעת ההתחלה.";

  const activeDays = form.active_days || [];
  const overlap = breaks.find(item => {
    if (item.id === currentId || item.is_active === false) return false;
    const sharedDay = (item.active_days || []).some(day => activeDays.includes(day));
    return sharedDay && toMinutes(form.start_time) < toMinutes(item.end_time) && toMinutes(item.start_time) < toMinutes(form.end_time);
  });

  return overlap ? `השעות חופפות להפסקה „${overlap.name}” באחד הימים הפעילים.` : "";
}