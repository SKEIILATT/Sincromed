// Backend wiring — see SincroMed-API-Backend.md for full reference.
export const DATUM = "https://hamburgesas-yhttwx.jelou.cloud/api/collections";
export const DATUM_KEY = "db_ueH5CnmoB6iAjvFce3BsiBuB1jGCv5yBXPbhIpgJ53764f36";
export const FN_BASE = "https://sincromed.fn.jelou.ai";
export const APPS_KEY = ""; // Set your Jelou Apps key to use the Functions path instead of direct Datum writes.

export function normPhone(p) {
  return p.replace(/\D/g, "");
}

// Link directo al chat del sandbox de WhatsApp de SincroMed.
export const WA_SANDBOX = "13239183195";
export function waSandboxLink(nombre) {
  const txt = encodeURIComponent(`Hola SincroMed${nombre ? `, soy ${nombre}` : ""}`);
  return `https://wa.me/${WA_SANDBOX}?text=${txt}`;
}

// Whitelistea el número del cuidador en el sandbox de WhatsApp (ruta pública
// de la Function; el secret de Jelou vive del lado del servidor).
export async function conectarWhatsapp({ telefonoCuidador, nombreCuidador }) {
  const res = await fetch(`${FN_BASE}/conectar-whatsapp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ telefonoCuidador, nombreCuidador }),
  });
  return res.json();
}

// Dispara el recordatorio: WhatsApp con la próxima medicina + vibración de la
// pulsera. Devuelve { ok, enviado, vibrando, medicina, error, waLink }.
export async function simularToma(telefonoCuidador) {
  const res = await fetch(`${FN_BASE}/simular-toma`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ telefonoCuidador }),
  });
  return res.json();
}

export async function fetchTomas(phone) {
  const filter = encodeURIComponent(`(telefono_cuidador='${normPhone(phone)}')`);
  // Note: this collection's API rules don't allow sorting by "created", so we
  // fetch unsorted and order by fecha (YYYY-MM-DD, lexicographically sortable) instead.
  const res = await fetch(`${DATUM}/sincromed_tomas/records?filter=${filter}&perPage=50`, {
    headers: { "x-api-key": DATUM_KEY },
  });
  const data = await res.json();
  const items = data.items || [];
  return items.sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0));
}

export async function saveCaregiver({ nombreCuidador, telefonoCuidador, medicinas, nombreAdultoMayor }) {
  // The Jelou Function normalizes the phone and upserts in one call when an apps key is set.
  if (APPS_KEY) {
    const headers = { "Content-Type": "application/json", Authorization: `Bearer ${APPS_KEY}` };
    await fetch(`${FN_BASE}/registrar-paciente`, {
      method: "POST",
      headers,
      body: JSON.stringify({ nombreCuidador, telefonoCuidador, medicinas, nombreAdultoMayor }),
    });
    return;
  }

  // Without an apps key, talk to Datum directly (manual upsert by phone).
  const phone = normPhone(telefonoCuidador);
  const filterStr = encodeURIComponent(`(telefono_cuidador='${phone}')`);
  const existing = await (
    await fetch(`${DATUM}/sincromed_pacientes/records?filter=${filterStr}`, {
      headers: { "x-api-key": DATUM_KEY },
    })
  ).json();
  const payload = {
    telefono_cuidador: phone,
    nombre_cuidador: nombreCuidador,
    nombre_adulto_mayor: nombreAdultoMayor,
    medicinas: JSON.stringify(medicinas),
  };
  if (existing.items?.length) {
    await fetch(`${DATUM}/sincromed_pacientes/records/${existing.items[0].id}`, {
      method: "PATCH",
      headers: { "x-api-key": DATUM_KEY, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } else {
    await fetch(`${DATUM}/sincromed_pacientes/records`, {
      method: "POST",
      headers: { "x-api-key": DATUM_KEY, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }
}

const SB_URL = import.meta.env.VITE_SUPABASE_URL;
const SB_KEY = import.meta.env.VITE_SUPABASE_KEY;
const SB_HEADERS = {
  "Content-Type": "application/json",
  apikey: SB_KEY,
  Authorization: `Bearer ${SB_KEY}`,
};

async function hashPass(pass) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(pass));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function registerLocalUser({ name, phone, pass }) {
  const hash = await hashPass(pass);
  const res = await fetch(`${SB_URL}/rest/v1/usuarios`, {
    method: "POST",
    headers: { ...SB_HEADERS, Prefer: "return=representation" },
    body: JSON.stringify({ nombre: name, telefono: phone, pass_hash: hash }),
  });
  if (res.status === 409) throw new Error("Este número ya está registrado.");
  if (!res.ok) throw new Error("No se pudo crear la cuenta.");
  const session = { phone, name };
  localStorage.setItem("sm_session", JSON.stringify(session));
  return session;
}

export async function loginLocalUser({ phone, pass }) {
  const hash = await hashPass(pass);
  const res = await fetch(
    `${SB_URL}/rest/v1/usuarios?telefono=eq.${phone}&select=nombre,pass_hash`,
    { headers: SB_HEADERS }
  );
  const rows = await res.json();
  if (!rows.length || rows[0].pass_hash !== hash) throw new Error("Número o contraseña incorrectos.");
  const session = { phone, name: rows[0].nombre };
  localStorage.setItem("sm_session", JSON.stringify(session));
  return session;
}

export function getSession() {
  try {
    return JSON.parse(localStorage.getItem("sm_session"));
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem("sm_session");
}

// Links a logged-in family member to the caregiver phone they manage, so the
// dashboard knows which telefono_cuidador to query after a page reload
// (the backend itself has no concept of the family member's account).
export function getCaregiverLink(userPhone) {
  const links = JSON.parse(localStorage.getItem("sm_caregiver_links") || "{}");
  return links[userPhone] || "";
}

export function setCaregiverLink(userPhone, caregiverPhone) {
  const links = JSON.parse(localStorage.getItem("sm_caregiver_links") || "{}");
  links[userPhone] = caregiverPhone;
  localStorage.setItem("sm_caregiver_links", JSON.stringify(links));
}
