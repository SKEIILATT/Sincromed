export const MAX_EVIDENCE_BYTES = 10 * 1024 * 1024;

export const EVIDENCE_ACCEPT = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "audio/mpeg",
  "audio/mp4",
  "audio/ogg",
  "audio/webm",
];

const TYPE_MAP = {
  foto: "photo",
  photo: "photo",
  imagen: "photo",
  audio: "audio",
  texto: "text",
  text: "text",
};

export function evidenceKindFromMime(mime = "") {
  if (mime.startsWith("image/")) return "photo";
  if (mime.startsWith("audio/")) return "audio";
  return "";
}

export function normalizeEvidence(record = {}) {
  const nested = Array.isArray(record.evidence)
    ? record.evidence[0] || {}
    : record.evidence || record.evidencia || {};
  const mimeType = nested.mime_type || record.mime_type || record.evidencia_mime || "";
  const rawType = nested.type || record.evidencia_tipo || record.evidence_type || evidenceKindFromMime(mimeType);
  const kind = TYPE_MAP[String(rawType || "").toLowerCase()] || "text";
  const directUrl =
    nested.url ||
    nested.signed_url ||
    record.evidencia_url ||
    record.evidence_url ||
    record.foto_url ||
    record.audio_url ||
    "";
  const storagePath =
    nested.storage_path ||
    record.storage_path ||
    record.evidencia_path ||
    "";
  const text =
    nested.text_content ||
    record.text_content ||
    record.evidencia_texto ||
    record.evidence_text ||
    "";

  return {
    id: nested.id || record.evidencia_id || record.id || "",
    kind,
    directUrl,
    storagePath,
    text,
    mimeType,
    originalName: nested.original_name || record.original_name || "",
    createdAt: nested.created_at || record.created || "",
    available: Boolean(directUrl || storagePath || (kind === "text" && text)),
  };
}

export function hasEvidenceReference(record = {}) {
  return Boolean(
    record.evidencia_tipo ||
    record.evidence_type ||
    record.evidencia_url ||
    record.evidence_url ||
    record.storage_path ||
    record.evidencia_path ||
    record.evidencia_texto ||
    record.text_content ||
    (Array.isArray(record.evidence) ? record.evidence.length : record.evidence),
  );
}

export function validateEvidenceFile(file) {
  if (!file) return "Selecciona una foto o un audio.";
  if (!EVIDENCE_ACCEPT.includes(file.type)) return "El archivo debe ser una foto JPG, PNG o WebP, o un audio compatible.";
  if (file.size > MAX_EVIDENCE_BYTES) return "El archivo no puede superar 10 MB.";
  return "";
}

export function safeEvidenceFileName(name = "evidencia") {
  const normalized = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/-\./g, ".")
    .replace(/^-|-$/g, "");
  return normalized || "evidencia";
}
