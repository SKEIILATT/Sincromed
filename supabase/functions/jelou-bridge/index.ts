const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
const JELOU_FUNCTIONS_URL = Deno.env.get("JELOU_FUNCTIONS_URL") || "https://sincromed.fn.jelou.ai";
const JELOU_APPS_KEY = Deno.env.get("JELOU_APPS_KEY") || "";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type BridgePayload = {
  action?: "save-plan" | "connect" | "simulate";
  patientId?: string;
  caregiverName?: string;
  caregiverPhone?: string;
  patientName?: string;
  medications?: Array<Record<string, unknown>>;
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

async function canManagePatient(patientId: string, authorization: string) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/can_manage_patient`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: authorization,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ target_patient_id: patientId }),
  });
  if (!response.ok) return false;
  return await response.json() === true;
}

async function jelouRequest(path: string, body: Record<string, unknown>, authenticated = false) {
  const response = await fetch(`${JELOU_FUNCTIONS_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(authenticated ? { Authorization: `Bearer ${JELOU_APPS_KEY}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || data?.ok === false) {
    throw new Error(data?.error || data?.message || `Jelou request failed (${response.status})`);
  }
  return data;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }
  if (request.method !== "POST") return json(405, { error: "Method not allowed" });
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return json(500, { error: "Bridge is not configured" });
  }

  const authorization = request.headers.get("authorization") || "";
  if (!authorization.startsWith("Bearer ")) return json(401, { error: "Authentication required" });

  let payload: BridgePayload;
  try {
    payload = await request.json();
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }

  if (!payload.action || !UUID_RE.test(payload.patientId || "")) {
    return json(400, { error: "A valid action and patientId are required" });
  }
  if (!await canManagePatient(payload.patientId || "", authorization)) {
    return json(403, { error: "Patient access denied" });
  }

  try {
    if (payload.action === "save-plan") {
      if (!JELOU_APPS_KEY) return json(500, { error: "JELOU_APPS_KEY is not configured" });
      const data = await jelouRequest("/registrar-paciente", {
        patientId: payload.patientId,
        nombreCuidador: payload.caregiverName,
        telefonoCuidador: payload.caregiverPhone,
        nombreAdultoMayor: payload.patientName,
        medicinas: payload.medications || [],
      }, true);
      return json(200, data || { ok: true });
    }

    if (payload.action === "connect") {
      const data = await jelouRequest("/conectar-whatsapp", {
        patientId: payload.patientId,
        telefonoCuidador: payload.caregiverPhone,
        nombreCuidador: payload.caregiverName,
      });
      return json(200, data || { ok: true });
    }

    if (payload.action === "simulate") {
      const data = await jelouRequest("/simular-toma", {
        patientId: payload.patientId,
        telefonoCuidador: payload.caregiverPhone,
      });
      return json(200, data || { ok: true });
    }

    return json(400, { error: "Unsupported action" });
  } catch (error) {
    console.error("jelou-bridge", error);
    return json(502, {
      error: error instanceof Error ? error.message : "Jelou request failed",
    });
  }
});
