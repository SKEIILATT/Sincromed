import test from "node:test";
import assert from "node:assert/strict";
import {
  localDateKey,
  mapDoseEventRows,
  mapMedicationRows,
  mergeDoseRecords,
} from "./care-model.js";

test("localDateKey respects the patient timezone", () => {
  assert.equal(localDateKey("2026-07-25T03:30:00.000Z", "America/Guayaquil"), "2026-07-24");
});

test("mapMedicationRows keeps relational identifiers", () => {
  const rows = mapMedicationRows([{
    id: "med-1",
    name: "Enalapril",
    dose: "10 mg",
    instructions: "Después de comer",
    starts_on: "2026-07-24",
    ends_on: null,
    medication_schedules: [
      {
        id: "schedule-2",
        local_time: "19:00:00",
        days_of_week: [1, 2, 3],
        active: true,
      },
      {
        id: "schedule-1",
        local_time: "07:00:00",
        days_of_week: [1, 2, 3],
        active: true,
      },
    ],
  }]);
  assert.deepEqual(rows[0], {
    id: "med-1",
    nombre: "Enalapril",
    dosis: "10 mg",
    instrucciones: "Después de comer",
    startsOn: "2026-07-24",
    endsOn: "",
    horarios: [{
      id: "schedule-1",
      hora: "07:00",
      daysOfWeek: [1, 2, 3],
    }, {
      id: "schedule-2",
      hora: "19:00",
      daysOfWeek: [1, 2, 3],
    }],
  });
});

test("mapDoseEventRows exposes nested evidence to the viewer", () => {
  const rows = mapDoseEventRows([{
    id: "event-1",
    patient_id: "patient-1",
    scheduled_for: "2026-07-24T12:00:00.000Z",
    status: "confirmed",
    medications: { name: "Enalapril", dose: "10 mg" },
    evidence: [{ id: "evidence-1", type: "photo", storage_path: "patient/event/photo.jpg" }],
  }]);
  assert.equal(rows[0].confirmado, true);
  assert.equal(rows[0].evidencia_tipo, "foto");
  assert.equal(rows[0].evidence[0].storage_path, "patient/event/photo.jpg");
});

test("mergeDoseRecords orders relational and legacy records", () => {
  const merged = mergeDoseRecords(
    [{ id: "new", scheduled_for: "2026-07-24T12:00:00Z" }],
    [{ id: "old", created: "2026-07-23T12:00:00Z" }],
  );
  assert.deepEqual(merged.map((row) => row.id), ["new", "old"]);
});
