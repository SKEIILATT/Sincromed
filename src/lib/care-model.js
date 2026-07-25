export function localDateKey(value, timeZone = "America/Guayaquil") {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function mapMedicationRows(rows = []) {
  return rows.map((row) => {
    const schedules = (Array.isArray(row.medication_schedules) ? row.medication_schedules : [])
      .filter((item) => item.active !== false)
      .sort((a, b) => String(a.local_time).localeCompare(String(b.local_time)));
    return {
      id: row.id,
      nombre: row.name || "",
      dosis: row.dose || "",
      instrucciones: row.instructions || "",
      startsOn: row.starts_on || "",
      endsOn: row.ends_on || "",
      horarios: schedules.map((schedule) => ({
        id: schedule.id,
        hora: schedule.local_time?.slice(0, 5) || "",
        daysOfWeek: schedule.days_of_week || [0, 1, 2, 3, 4, 5, 6],
      })),
    };
  });
}

export function normalizeMedicationList(rows = []) {
  const normalized = [];
  const legacyGroups = new Map();

  rows.forEach((row) => {
    const schedules = Array.isArray(row.horarios) && row.horarios.length
      ? row.horarios
      : [{
          id: row.scheduleId || "",
          hora: row.hora || "",
          daysOfWeek: row.daysOfWeek || [0, 1, 2, 3, 4, 5, 6],
        }];
    const medication = {
      id: row.id || "",
      nombre: row.nombre || "",
      dosis: row.dosis || "",
      instrucciones: row.instrucciones || "",
      startsOn: row.startsOn || "",
      endsOn: row.endsOn || "",
      horarios: schedules,
    };

    if (medication.id) {
      normalized.push(medication);
      return;
    }

    const groupKey = [
      medication.nombre.trim().toLowerCase(),
      medication.dosis.trim().toLowerCase(),
      medication.instrucciones.trim().toLowerCase(),
    ].join("|");
    const existing = legacyGroups.get(groupKey);
    if (existing && medication.nombre) {
      existing.horarios.push(...medication.horarios);
    } else {
      legacyGroups.set(groupKey, medication);
      normalized.push(medication);
    }
  });

  return normalized;
}

export function mapDoseEventRows(rows = [], timeZone = "America/Guayaquil") {
  return rows.map((row) => {
    const evidence = Array.isArray(row.evidence) ? row.evidence : [];
    const medication = row.medications || {};
    const firstEvidence = evidence[0];
    const confirmed = row.status === "confirmed";
    return {
      id: row.id,
      patient_id: row.patient_id,
      fecha: localDateKey(row.scheduled_for, timeZone),
      scheduled_for: row.scheduled_for,
      confirmado: confirmed,
      estado: row.status,
      confirmed_at: row.confirmed_at,
      medicinas_tomadas: medication.name ? [medication.name] : [],
      dosis: medication.dose || "",
      evidencia_tipo: firstEvidence?.type === "photo"
        ? "foto"
        : firstEvidence?.type === "text"
          ? "texto"
          : firstEvidence?.type || "texto",
      evidence,
      created: row.created_at,
    };
  });
}

export function mergeDoseRecords(primary = [], legacy = []) {
  const seen = new Set();
  return [...primary, ...legacy]
    .filter((record) => {
      const key = record.id || `${record.fecha}-${record.medicinas_tomadas?.join("|")}-${record.confirmado}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => {
      const aTime = a.scheduled_for || a.created || `${a.fecha}T00:00:00`;
      const bTime = b.scheduled_for || b.created || `${b.fecha}T00:00:00`;
      return String(bTime).localeCompare(String(aTime));
    });
}
