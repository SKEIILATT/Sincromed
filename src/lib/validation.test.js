import test from "node:test";
import assert from "node:assert/strict";
import { validateEmail, validateMedicationPlan, validatePassword } from "./validation.js";

test("validateEmail accepts a normalized email address", () => {
  assert.equal(validateEmail(" familiar@sincromed.ec "), "");
});

test("validateEmail rejects missing and malformed values", () => {
  assert.equal(validateEmail(""), "Ingresa tu correo electrónico.");
  assert.equal(validateEmail("correo-invalido"), "Ingresa un correo electrónico válido.");
});

test("validatePassword requires at least six characters", () => {
  assert.equal(validatePassword("12345"), "La contraseña debe tener al menos 6 caracteres.");
  assert.equal(validatePassword("123456"), "");
});

test("validateMedicationPlan accepts several schedules for one medication", () => {
  assert.equal(validateMedicationPlan([{
    nombre: "Enalapril",
    startsOn: "2026-07-24",
    endsOn: "2026-08-24",
    horarios: [
      { hora: "08:00", daysOfWeek: [1, 2, 3, 4, 5] },
      { hora: "20:00", daysOfWeek: [1, 2, 3, 4, 5] },
    ],
  }]), "");
});

test("validateMedicationPlan rejects duplicate times and empty weekdays", () => {
  assert.match(validateMedicationPlan([{
    nombre: "Enalapril",
    horarios: [
      { hora: "08:00", daysOfWeek: [1] },
      { hora: "08:00", daysOfWeek: [2] },
    ],
  }]), /repetido/);
  assert.match(validateMedicationPlan([{
    nombre: "Losartán",
    horarios: [{ hora: "09:00", daysOfWeek: [] }],
  }]), /al menos un día/);
});
