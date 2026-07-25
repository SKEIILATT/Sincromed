const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const WEBHOOK_SECRET = Deno.env.get("JELOU_WEBHOOK_SECRET") || "";
const MEDIA_TOKEN = Deno.env.get("JELOU_MEDIA_TOKEN") || "";
const ALLOWED_MEDIA_HOSTS = new Set(
  (Deno.env.get("JELOU_MEDIA_HOSTS") || "")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean),
);

const BUCKET = "evidence";
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MIME_EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/ogg": "ogg",
  "audio/webm": "webm",
};

type JelouPayload = {
  doseEventId?: string;
  dose_event_id?: string;
  patientId?: string;
  patient_id?: string;
  messageId?: string;
  external_message_id?: string;
  type?: "photo" | "audio" | "text" | "foto" | "texto";
  mimeType?: string;
  mime_type?: string;
  fileName?: string;
  file_name?: string;
  mediaUrl?: string;
  media_url?: string;
  mediaBase64?: string;
  media_base64?: string;
  text?: string;
  text_content?: string;
};

class SupabaseHttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function serviceHeaders(contentType = "application/json") {
  return {
    apikey: SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    ...(contentType ? { "Content-Type": contentType } : {}),
  };
}

async function supabaseRequest(path: string, init: RequestInit = {}) {
  const response = await fetch(`${SUPABASE_URL}${path}`, {
    ...init,
    headers: {
      ...serviceHeaders(init.body instanceof Uint8Array ? "" : "application/json"),
      ...init.headers,
    },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new SupabaseHttpError(
      response.status,
      data?.message || data?.error || `Supabase request failed (${response.status})`,
    );
  }
  return data;
}

function normalizeType(value = "") {
  if (value === "photo" || value === "foto") return "photo";
  if (value === "audio") return "audio";
  if (value === "text" || value === "texto") return "text";
  return "";
}

function decodeBase64(value: string) {
  const normalized = value.includes(",") ? value.slice(value.indexOf(",") + 1) : value;
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function readMedia(payload: JelouPayload, mimeType: string) {
  const mediaBase64 = payload.mediaBase64 || payload.media_base64;
  if (mediaBase64) return decodeBase64(mediaBase64);

  const mediaUrl = payload.mediaUrl || payload.media_url;
  if (!mediaUrl) throw new Error("Media evidence requires mediaUrl or mediaBase64");

  const parsedUrl = new URL(mediaUrl);
  if (parsedUrl.protocol !== "https:") throw new Error("Media URL must use HTTPS");
  if (!ALLOWED_MEDIA_HOSTS.has(parsedUrl.hostname.toLowerCase())) {
    throw new Error("Media host is not allowed");
  }

  const response = await fetch(parsedUrl, {
    headers: MEDIA_TOKEN ? { Authorization: `Bearer ${MEDIA_TOKEN}` } : {},
  });
  if (!response.ok) throw new Error(`Media download failed (${response.status})`);

  const declaredLength = Number(response.headers.get("content-length") || 0);
  if (declaredLength > MAX_FILE_SIZE) throw new Error("Media file exceeds 10 MB");
  const responseType = response.headers.get("content-type")?.split(";")[0] || "";
  if (responseType && responseType !== mimeType) throw new Error("Downloaded media type does not match");
  return new Uint8Array(await response.arrayBuffer());
}

async function removeObject(path: string) {
  await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
    method: "DELETE",
    headers: serviceHeaders(""),
  }).catch(() => undefined);
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json(405, { error: "Method not allowed" });
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !WEBHOOK_SECRET) {
    return json(500, { error: "Webhook is not configured" });
  }
  if (request.headers.get("x-webhook-secret") !== WEBHOOK_SECRET) {
    return json(401, { error: "Invalid webhook secret" });
  }

  let payload: JelouPayload;
  try {
    payload = await request.json();
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }

  const doseEventId = payload.doseEventId || payload.dose_event_id || "";
  const patientId = payload.patientId || payload.patient_id || "";
  const messageId = (payload.messageId || payload.external_message_id || "").trim();
  const evidenceType = normalizeType(payload.type);
  const mimeType = (payload.mimeType || payload.mime_type || "").split(";")[0].toLowerCase();
  const textContent = (payload.text || payload.text_content || "").trim();

  if (!UUID_RE.test(doseEventId) || (patientId && !UUID_RE.test(patientId))) {
    return json(400, { error: "A valid doseEventId and patientId are required" });
  }
  if (!messageId || messageId.length > 255) {
    return json(400, { error: "A valid messageId is required" });
  }
  if (!evidenceType) return json(400, { error: "Evidence type is invalid" });
  if (evidenceType === "text" && !textContent) {
    return json(400, { error: "Text evidence is empty" });
  }
  if (evidenceType !== "text" && !MIME_EXTENSION[mimeType]) {
    return json(400, { error: "Media type is not allowed" });
  }

  try {
    const duplicate = await supabaseRequest(
      `/rest/v1/evidence?source=eq.jelou&external_message_id=eq.${encodeURIComponent(messageId)}&select=id,dose_event_id&limit=1`,
    );
    if (duplicate[0]) {
      return json(200, {
        ok: true,
        duplicate: true,
        evidenceId: duplicate[0].id,
        doseEventId: duplicate[0].dose_event_id,
      });
    }

    const events = await supabaseRequest(
      `/rest/v1/dose_events?id=eq.${encodeURIComponent(doseEventId)}&select=id,patient_id,status&limit=1`,
    );
    const doseEvent = events[0];
    if (!doseEvent || (patientId && doseEvent.patient_id !== patientId)) {
      return json(404, { error: "Dose event was not found for this patient" });
    }
    if (["missed", "skipped"].includes(doseEvent.status)) {
      return json(409, { error: `Dose event cannot be confirmed from status ${doseEvent.status}` });
    }

    let storagePath: string | null = null;
    let fileBytes: Uint8Array | null = null;
    if (evidenceType !== "text") {
      fileBytes = await readMedia(payload, mimeType);
      if (fileBytes.byteLength === 0 || fileBytes.byteLength > MAX_FILE_SIZE) {
        return json(400, { error: "Media file must be between 1 byte and 10 MB" });
      }

      const extension = MIME_EXTENSION[mimeType];
      storagePath = `${doseEvent.patient_id}/${doseEventId}/jelou-${crypto.randomUUID()}.${extension}`;
      const upload = await fetch(
        `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${storagePath}`,
        {
          method: "POST",
          headers: {
            ...serviceHeaders(mimeType),
            "x-upsert": "false",
          },
          body: fileBytes,
        },
      );
      if (!upload.ok) {
        const uploadError = await upload.json().catch(() => null);
        throw new Error(uploadError?.message || "Evidence upload failed");
      }
    }

    const evidencePayload = {
      dose_event_id: doseEventId,
      type: evidenceType,
      storage_path: storagePath,
      original_name: payload.fileName || payload.file_name || null,
      mime_type: evidenceType === "text" ? null : mimeType,
      size_bytes: fileBytes?.byteLength || null,
      text_content: evidenceType === "text" ? textContent : null,
      source: "jelou",
      external_message_id: messageId,
      metadata: { provider: "jelou" },
    };

    let evidence;
    try {
      const records = await supabaseRequest("/rest/v1/evidence", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(evidencePayload),
      });
      evidence = records[0];
    } catch (error) {
      if (storagePath) await removeObject(storagePath);
      if (error instanceof SupabaseHttpError && error.status === 409) {
        const duplicates = await supabaseRequest(
          `/rest/v1/evidence?source=eq.jelou&external_message_id=eq.${encodeURIComponent(messageId)}&select=id,dose_event_id&limit=1`,
        );
        if (duplicates[0]) {
          evidence = duplicates[0];
        } else {
          throw error;
        }
      } else {
        throw error;
      }
    }

    await supabaseRequest(
      `/rest/v1/dose_events?id=eq.${encodeURIComponent(doseEventId)}`,
      {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({
          status: "confirmed",
          confirmed_at: new Date().toISOString(),
        }),
      },
    );

    return json(200, {
      ok: true,
      duplicate: false,
      evidenceId: evidence.id,
      doseEventId,
    });
  } catch (error) {
    console.error("jelou-evidence-webhook", error);
    return json(500, {
      error: error instanceof Error ? error.message : "Webhook processing failed",
    });
  }
});
