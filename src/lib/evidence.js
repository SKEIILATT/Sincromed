import { getAccessToken } from "./auth";
import { requestErrorMessage, SESSION_EXPIRED_MESSAGE } from "./request-error";
import {
  evidenceKindFromMime,
  safeEvidenceFileName,
  validateEvidenceFile,
} from "./evidence-model";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;
const BUCKET = "evidence";

function ensureSupabase() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error("El almacenamiento de evidencias no está configurado.");
  }
}

function authHeaders(contentType) {
  const token = getAccessToken();
  if (!token) throw new Error(SESSION_EXPIRED_MESSAGE);
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${token}`,
    ...(contentType ? { "Content-Type": contentType } : {}),
  };
}

async function jsonResponse(response, fallback) {
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(requestErrorMessage(data, fallback, response.status));
  }
  return data;
}

function encodedPath(path) {
  return path.split("/").map(encodeURIComponent).join("/");
}

export async function getSignedEvidenceUrl(path, expiresIn = 900) {
  ensureSupabase();
  const response = await fetch(
    `${SUPABASE_URL}/storage/v1/object/sign/${BUCKET}/${encodedPath(path)}`,
    {
      method: "POST",
      headers: authHeaders("application/json"),
      body: JSON.stringify({ expiresIn }),
    },
  );
  const data = await jsonResponse(response, "No se pudo abrir la evidencia.");
  const signedPath = data.signedURL || data.signedUrl;
  if (!signedPath) throw new Error("Supabase no devolvió una URL para la evidencia.");
  return signedPath.startsWith("http") ? signedPath : `${SUPABASE_URL}/storage/v1${signedPath}`;
}

async function removeUploadedObject(path) {
  try {
    await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodedPath(path)}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
  } catch {
    // Cleanup is best effort; the database insert error remains the useful one.
  }
}

export async function uploadEvidence({ patientId, doseEventId, file }) {
  ensureSupabase();
  const validationError = validateEvidenceFile(file);
  if (validationError) throw new Error(validationError);
  if (!patientId || !doseEventId) throw new Error("La toma no está vinculada a un paciente.");

  const objectName = `${crypto.randomUUID()}-${safeEvidenceFileName(file.name)}`;
  const path = `${patientId}/${doseEventId}/${objectName}`;
  const uploadResponse = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodedPath(path)}`,
    {
      method: "POST",
      headers: {
        ...authHeaders(file.type),
        "x-upsert": "false",
      },
      body: file,
    },
  );
  await jsonResponse(uploadResponse, "No se pudo subir la evidencia.");

  const payload = {
    dose_event_id: doseEventId,
    type: evidenceKindFromMime(file.type),
    storage_path: path,
    original_name: file.name,
    mime_type: file.type,
    size_bytes: file.size,
  };
  const recordResponse = await fetch(`${SUPABASE_URL}/rest/v1/evidence`, {
    method: "POST",
    headers: {
      ...authHeaders("application/json"),
      Prefer: "return=representation",
    },
    body: JSON.stringify(payload),
  });

  let evidenceRecord;
  try {
    const records = await jsonResponse(recordResponse, "El archivo subió, pero no se pudo asociar a la toma.");
    evidenceRecord = Array.isArray(records) ? records[0] : records;
  } catch (error) {
    await removeUploadedObject(path);
    throw error;
  }

  try {
    const confirmationResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/dose_events?id=eq.${encodeURIComponent(doseEventId)}`,
      {
        method: "PATCH",
        headers: {
          ...authHeaders("application/json"),
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          status: "confirmed",
          confirmed_at: new Date().toISOString(),
        }),
      },
    );
    await jsonResponse(confirmationResponse, "La evidencia se guardó, pero la toma no pudo confirmarse.");
  } catch (error) {
    return { ...evidenceRecord, confirmationWarning: error.message };
  }
  return evidenceRecord;
}
