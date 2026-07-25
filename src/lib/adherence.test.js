import test from "node:test";
import assert from "node:assert/strict";
import {
  computeStreak,
  countLast7Days,
  dateKey,
  lastConfirmed,
  relativeDay,
} from "./adherence.js";

function daysFromToday(offset) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return dateKey(date);
}

test("dateKey uses the local calendar date", () => {
  const date = new Date(2026, 6, 24, 23, 30);
  assert.equal(dateKey(date), "2026-07-24");
});

test("relativeDay compares local dates", () => {
  const now = new Date(2026, 6, 24, 1, 0);
  assert.equal(relativeDay("2026-07-24", now), "Hoy");
  assert.equal(relativeDay("2026-07-23", now), "Ayer");
  assert.equal(relativeDay("2026-07-20", now), "2026-07-20");
});

test("countLast7Days excludes future and unconfirmed records", () => {
  const records = [
    { fecha: daysFromToday(0), confirmado: true },
    { fecha: daysFromToday(-6), confirmado: true },
    { fecha: daysFromToday(-7), confirmado: true },
    { fecha: daysFromToday(1), confirmado: true },
    { fecha: daysFromToday(-1), confirmado: false },
  ];
  assert.equal(countLast7Days(records), 2);
});

test("computeStreak counts consecutive confirmed local days", () => {
  const records = [
    { fecha: daysFromToday(0), confirmado: true },
    { fecha: daysFromToday(-1), confirmado: true },
    { fecha: daysFromToday(-2), confirmado: true },
    { fecha: daysFromToday(-3), confirmado: false },
  ];
  assert.equal(computeStreak(records), 3);
});

test("lastConfirmed sorts confirmed records by date and creation time", () => {
  const records = [
    { id: "old", fecha: "2026-07-22", created: "2026-07-22T10:00:00Z", confirmado: true },
    { id: "ignored", fecha: "2026-07-24", created: "2026-07-24T12:00:00Z", confirmado: false },
    { id: "latest", fecha: "2026-07-24", created: "2026-07-24T11:00:00Z", confirmado: true },
    { id: "earlier", fecha: "2026-07-24", created: "2026-07-24T09:00:00Z", confirmado: true },
  ];
  assert.equal(lastConfirmed(records)?.id, "latest");
});
