const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const DAY_LABELS = [
  { value: 1, label: "Lun" },
  { value: 2, label: "Mar" },
  { value: 3, label: "Mié" },
  { value: 4, label: "Jue" },
  { value: 5, label: "Vie" },
  { value: 6, label: "Sáb" },
  { value: 0, label: "Dom" },
];

export function medicationSchedules(medications = []) {
  return medications.flatMap((medication) => {
    const schedules = Array.isArray(medication.horarios) && medication.horarios.length
      ? medication.horarios
      : [{
          id: medication.scheduleId || "",
          hora: medication.hora || "",
          daysOfWeek: medication.daysOfWeek || ALL_DAYS,
        }];
    return schedules.map((schedule) => ({
      ...medication,
      scheduleId: schedule.id || "",
      hora: schedule.hora || "",
      daysOfWeek: schedule.daysOfWeek || ALL_DAYS,
    }));
  });
}

function localDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isMedicationActive(medication, date) {
  const dateKey = localDateKey(date);
  return (!medication.startsOn || medication.startsOn <= dateKey)
    && (!medication.endsOn || medication.endsOn >= dateKey);
}

export function getNextMedication(medications, now = new Date()) {
  const candidates = [];

  medicationSchedules(medications).forEach((medication) => {
    if (!medication?.nombre || !/^\d{2}:\d{2}$/.test(medication.hora)) return;
    for (let dayOffset = 0; dayOffset <= 7; dayOffset += 1) {
      const scheduledAt = new Date(now);
      scheduledAt.setDate(now.getDate() + dayOffset);
      if (!medication.daysOfWeek.includes(scheduledAt.getDay())) continue;
      if (!isMedicationActive(medication, scheduledAt)) continue;

      const [hours, minutes] = medication.hora.split(":").map(Number);
      scheduledAt.setHours(hours, minutes, 0, 0);
      if (scheduledAt <= now) continue;
      candidates.push({
        ...medication,
        scheduledAt,
        isTomorrow: dayOffset === 1,
        dayLabel: dayOffset === 0
          ? "Hoy"
          : dayOffset === 1
            ? "Mañana"
            : new Intl.DateTimeFormat("es-EC", {
                weekday: "long",
                day: "numeric",
                month: "short",
              }).format(scheduledAt),
      });
      break;
    }
  });

  candidates.sort((a, b) => a.scheduledAt - b.scheduledAt);

  return candidates[0] || null;
}

export function sortMedicationsByTime(medications) {
  return medicationSchedules(medications)
    .filter((med) => med?.nombre)
    .sort((a, b) => String(a.hora || "99:99").localeCompare(String(b.hora || "99:99")));
}

export function formatScheduleDays(daysOfWeek = ALL_DAYS) {
  const selected = new Set(daysOfWeek);
  if (selected.size === 7) return "Todos los días";
  if ([1, 2, 3, 4, 5].every((day) => selected.has(day)) && selected.size === 5) {
    return "Lun a vie";
  }
  return DAY_LABELS
    .filter((day) => selected.has(day.value))
    .map((day) => day.label)
    .join(", ");
}
