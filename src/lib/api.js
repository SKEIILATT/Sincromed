// Backend wiring — see SincroMed-API-Backend.md for full reference.
export const DATUM = "https://hamburgesas-yhttwx.jelou.cloud/api/collections";
export const DATUM_KEY = "db_ueH5CnmoB6iAjvFce3BsiBuB1jGCv5yBXPbhIpgJ53764f36";
export const FN_BASE = "https://sincromed.fn.jelou.ai";
export const APPS_KEY = ""; // Set your Jelou Apps key to use the Functions path instead of direct Datum writes.

export function normPhone(p) {
  return p.replace(/\D/g, "");
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

// No real accounts exist in the backend (it only keys patients by caregiver phone),
// so the family-member login is a local session layer on top of it. Both phone
// values are already normalized E.164 digit strings (see PhoneInput), so the same
// number always maps to the same key regardless of how it was typed.
export function registerLocalUser({ name, phone, pass }) {
  const stored = JSON.parse(localStorage.getItem("sm_users") || "{}");
  if (stored[phone]) throw new Error("Este número ya está registrado.");
  stored[phone] = { name, pass };
  localStorage.setItem("sm_users", JSON.stringify(stored));
  const session = { phone, name };
  localStorage.setItem("sm_session", JSON.stringify(session));
  return session;
}

export function loginLocalUser({ phone, pass }) {
  const stored = JSON.parse(localStorage.getItem("sm_users") || "{}");
  const u = stored[phone];
  if (!u || u.pass !== pass) throw new Error("Número o contraseña incorrectos.");
  const session = { phone, name: u.name };
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
