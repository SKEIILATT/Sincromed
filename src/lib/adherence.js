const DAY_LABELS = ["D", "L", "M", "M", "J", "V", "S"];

// Local calendar date (not UTC) — toISOString() would roll over a day early/late
// depending on the user's timezone offset (e.g. Ecuador is UTC-5).
function dateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function computeStreak(tomas) {
  const confirmedDates = new Set(tomas.filter((t) => t.confirmado).map((t) => t.fecha));
  let streak = 0;
  const cursor = new Date();
  while (confirmedDates.has(dateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function countLast7Days(tomas) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 6);
  const cutoffKey = dateKey(cutoff);
  return tomas.filter((t) => t.confirmado && t.fecha >= cutoffKey).length;
}

export function lastConfirmed(tomas) {
  return tomas.find((t) => t.confirmado) || null;
}

export function buildWeekStrip(tomas) {
  const byDate = new Map();
  tomas.forEach((t) => {
    const entry = byDate.get(t.fecha) || { confirmed: false };
    if (t.confirmado) entry.confirmed = true;
    byDate.set(t.fecha, entry);
  });

  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = dateKey(d);
    const entry = byDate.get(key);
    days.push({
      key,
      label: DAY_LABELS[d.getDay()],
      dayNum: d.getDate(),
      status: entry?.confirmed ? "done" : "none",
      isToday: i === 0,
    });
  }
  return days;
}
