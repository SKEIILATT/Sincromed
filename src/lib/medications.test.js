import test from "node:test";
import assert from "node:assert/strict";
import { formatScheduleDays, getNextMedication, sortMedicationsByTime } from "./medications.js";

const MEDICATIONS = [
  { nombre: "Nocturna", dosis: "1 tableta", hora: "21:00" },
  { nombre: "Mañana", dosis: "10 mg", hora: "07:00" },
  { nombre: "", dosis: "", hora: "09:00" },
];

test("getNextMedication returns the next dose today", () => {
  const next = getNextMedication(MEDICATIONS, new Date(2026, 6, 24, 8, 0));
  assert.equal(next?.nombre, "Nocturna");
  assert.equal(next?.isTomorrow, false);
});

test("getNextMedication rolls past schedules to tomorrow", () => {
  const next = getNextMedication(MEDICATIONS, new Date(2026, 6, 24, 22, 0));
  assert.equal(next?.nombre, "Mañana");
  assert.equal(next?.isTomorrow, true);
  assert.equal(next?.scheduledAt.getDate(), 25);
});

test("sortMedicationsByTime ignores empty rows and orders schedules", () => {
  assert.deepEqual(
    sortMedicationsByTime(MEDICATIONS).map((med) => med.nombre),
    ["Mañana", "Nocturna"],
  );
});

test("getNextMedication evaluates all schedules and active weekdays", () => {
  const medications = [{
    nombre: "Enalapril",
    dosis: "10 mg",
    horarios: [
      { hora: "07:00", daysOfWeek: [5] },
      { hora: "20:00", daysOfWeek: [5] },
    ],
  }];
  const next = getNextMedication(medications, new Date(2026, 6, 24, 8, 0));
  assert.equal(next?.hora, "20:00");
  assert.equal(next?.isTomorrow, false);
});

test("sortMedicationsByTime keeps schedules from every configured weekday", () => {
  const medications = [{
    nombre: "Losartán",
    horarios: [
      { hora: "08:00", daysOfWeek: [5] },
      { hora: "20:00", daysOfWeek: [1] },
    ],
  }];
  const friday = new Date(2026, 6, 24, 7, 0);
  assert.deepEqual(
    sortMedicationsByTime(medications, friday).map((medication) => medication.hora),
    ["08:00", "20:00"],
  );
});

test("formatScheduleDays summarizes common weekday selections", () => {
  assert.equal(formatScheduleDays([0, 1, 2, 3, 4, 5, 6]), "Todos los días");
  assert.equal(formatScheduleDays([1, 2, 3, 4, 5]), "Lun a vie");
  assert.equal(formatScheduleDays([1, 3, 5]), "Lun, Mié, Vie");
});
