import test from "node:test";
import assert from "node:assert/strict";
import {
  MAX_EVIDENCE_BYTES,
  hasEvidenceReference,
  normalizeEvidence,
  safeEvidenceFileName,
  validateEvidenceFile,
} from "./evidence-model.js";

test("normalizeEvidence supports legacy photo URLs", () => {
  const evidence = normalizeEvidence({
    id: "legacy",
    evidencia_tipo: "foto",
    evidencia_url: "https://example.test/photo.jpg",
  });
  assert.equal(evidence.kind, "photo");
  assert.equal(evidence.available, true);
  assert.equal(evidence.directUrl, "https://example.test/photo.jpg");
});

test("normalizeEvidence reads nested Supabase evidence", () => {
  const evidence = normalizeEvidence({
    evidence: [{
      id: "new",
      type: "audio",
      storage_path: "patient/event/audio.ogg",
      mime_type: "audio/ogg",
    }],
  });
  assert.equal(evidence.kind, "audio");
  assert.equal(evidence.storagePath, "patient/event/audio.ogg");
});

test("normalizeEvidence reports missing legacy files honestly", () => {
  const evidence = normalizeEvidence({ evidencia_tipo: "foto" });
  assert.equal(evidence.kind, "photo");
  assert.equal(evidence.available, false);
});

test("hasEvidenceReference ignores pending events without evidence", () => {
  assert.equal(hasEvidenceReference({ estado: "pending", evidence: [] }), false);
  assert.equal(hasEvidenceReference({ evidencia_tipo: "foto" }), true);
});

test("validateEvidenceFile enforces type and size", () => {
  assert.equal(validateEvidenceFile({ type: "image/jpeg", size: 1024 }), "");
  assert.match(validateEvidenceFile({ type: "application/pdf", size: 1024 }), /foto/);
  assert.match(validateEvidenceFile({ type: "image/png", size: MAX_EVIDENCE_BYTES + 1 }), /10 MB/);
});

test("safeEvidenceFileName removes unsafe characters", () => {
  assert.equal(safeEvidenceFileName("Foto mamá (1).JPG"), "foto-mama-1.jpg");
});
