import { decomposeE164 } from "../data/countries.js";

const NAME_RE = /^[a-zA-ZÀ-ÿñÑ\s'.-]{2,}$/;

export function validateName(name) {
  if (!name.trim()) return "Ingresa tu nombre.";
  if (!NAME_RE.test(name.trim())) return "Ingresa un nombre válido (solo letras).";
  return "";
}

export function validatePatientName(name) {
  if (!name.trim()) return "Ingresa el nombre del adulto mayor.";
  if (!NAME_RE.test(name.trim())) return "Ingresa un nombre válido (solo letras).";
  return "";
}

export function validatePhone(e164digits) {
  if (!e164digits) return "Ingresa un número de teléfono.";
  const { country, national } = decomposeE164(e164digits);
  if (national.length !== country.length) {
    return `El número de ${country.name} debe tener ${country.length} dígitos.`;
  }
  return "";
}

export function validatePassword(pass) {
  if (!pass) return "Ingresa una contraseña.";
  if (pass.length < 6) return "La contraseña debe tener al menos 6 caracteres.";
  return "";
}

export function validateEmail(email) {
  if (!email.trim()) return "Ingresa tu correo electrónico.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return "Ingresa un correo electrónico válido.";
  return "";
}

export function validateMedicationPlan(medications) {
  if (!medications.length) return "Agrega al menos un medicamento.";

  for (const medication of medications) {
    if (!medication.nombre?.trim()) return "Todos los medicamentos necesitan un nombre.";
    if (
      medication.startsOn
      && medication.endsOn
      && medication.endsOn < medication.startsOn
    ) {
      return `La fecha final de ${medication.nombre} no puede ser anterior a la inicial.`;
    }

    const schedules = medication.horarios || [];
    if (!schedules.length) return `${medication.nombre} necesita al menos un horario.`;
    const times = new Set();
    for (const schedule of schedules) {
      if (!/^\d{2}:\d{2}$/.test(schedule.hora || "")) {
        return `Completa todos los horarios de ${medication.nombre}.`;
      }
      if (!schedule.daysOfWeek?.length) {
        return `Selecciona al menos un día para cada horario de ${medication.nombre}.`;
      }
      if (times.has(schedule.hora)) {
        return `${medication.nombre} tiene el horario ${schedule.hora} repetido.`;
      }
      times.add(schedule.hora);
    }
  }
  return "";
}
