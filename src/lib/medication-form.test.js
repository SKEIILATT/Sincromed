import test from "node:test";
import assert from "node:assert/strict";
import { createEmptySchedule } from "./medication-form.js";

test("a new schedule can inherit an independent copy of the previous days", () => {
  const previousDays = [1, 3, 5];
  const schedule = createEmptySchedule(previousDays);

  assert.deepEqual(schedule.daysOfWeek, previousDays);
  assert.notEqual(schedule.daysOfWeek, previousDays);

  schedule.daysOfWeek.push(0);
  assert.deepEqual(previousDays, [1, 3, 5]);
});

test("the first schedule defaults to every day", () => {
  assert.deepEqual(createEmptySchedule().daysOfWeek, [1, 2, 3, 4, 5, 6, 0]);
});
