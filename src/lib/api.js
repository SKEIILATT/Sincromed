import { getAccessToken } from "./auth";
import { requestErrorMessage, SESSION_EXPIRED_MESSAGE } from "./request-error";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;
const WA_SANDBOX = "593979040410";

export function normPhone(phone) {
  return String(phone || "").replace(/\D/g, "");
}

export function waSandboxLink(name) {
  const text = encodeURIComponent(`Hola${name ? `, soy ${name}` : ""}`);
  return `https://wa.me/${WA_SANDBOX}?text=${text}`;
}

async function invokeJelou(action, payload) {
  const token = getAccessToken();
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error("Supabase no está configurado.");
  if (!token) throw new Error(SESSION_EXPIRED_MESSAGE);

  const response = await fetch(`${SUPABASE_URL}/functions/v1/jelou-bridge`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action, ...payload }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || data?.ok === false) {
    throw new Error(
      requestErrorMessage(
        data,
        "No se pudo completar la operación con Jelou.",
        response.status,
      ),
    );
  }
  return data;
}

export function saveCaregiver({
  patientId,
  caregiverName,
  caregiverPhone,
  medications,
  patientName,
}) {
  return invokeJelou("save-plan", {
    patientId,
    caregiverName,
    caregiverPhone: normPhone(caregiverPhone),
    medications,
    patientName,
  });
}

export function conectarWhatsapp({ patientId, caregiverPhone, caregiverName }) {
  return invokeJelou("connect", {
    patientId,
    caregiverPhone: normPhone(caregiverPhone),
    caregiverName,
  });
}

export function simularToma({ patientId, caregiverPhone }) {
  return invokeJelou("simulate", {
    patientId,
    caregiverPhone: normPhone(caregiverPhone),
  });
}
