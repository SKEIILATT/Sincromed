import { getAccessToken } from "./auth";
import { mapDoseEventRows, mapMedicationRows } from "./care-model";
import { requestErrorMessage, SESSION_EXPIRED_MESSAGE } from "./request-error";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;

function requestHeaders(contentType = false, prefer = "") {
  const token = getAccessToken();
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error("Supabase no está configurado.");
  if (!token) throw new Error(SESSION_EXPIRED_MESSAGE);
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${token}`,
    ...(contentType ? { "Content-Type": "application/json" } : {}),
    ...(prefer ? { Prefer: prefer } : {}),
  };
}

async function rest(path, options = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      ...requestHeaders(Boolean(options.body), options.prefer),
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      requestErrorMessage(
        data,
        "No se pudo consultar la información de cuidado.",
        response.status,
      ),
    );
  }
  return data;
}

function firstCaregiver(linkRows) {
  const link = linkRows.find((row) => row.active !== false) || linkRows[0];
  const caregiver = Array.isArray(link?.caregivers) ? link.caregivers[0] : link?.caregivers;
  if (!caregiver) return null;
  return {
    id: caregiver.id,
    name: caregiver.full_name || "",
    phone: caregiver.phone || "",
    whatsappStatus: link.whatsapp_status || "pending",
  };
}

function doseEventsPath(patientId) {
  const now = encodeURIComponent(new Date().toISOString());
  return `dose_events?patient_id=eq.${encodeURIComponent(patientId)}&scheduled_for=lte.${now}&select=id,patient_id,scheduled_for,status,confirmed_at,notes,created_at,medications(name,dose),evidence(id,type,storage_path,original_name,mime_type,size_bytes,text_content,created_at)&order=scheduled_for.desc&limit=50`;
}

export async function fetchPatients() {
  return rest("patients?select=id,full_name,timezone,created_by,created_at&order=created_at.asc");
}

export async function fetchCareContext(selectedPatientId = "") {
  const patientFilter = selectedPatientId
    ? `&id=eq.${encodeURIComponent(selectedPatientId)}`
    : "";
  const patients = await rest(
    `patients?select=id,full_name,timezone,created_by&order=created_at.asc${patientFilter}&limit=1`,
  );
  const patient = patients[0];
  if (!patient) {
    return {
      patient: null,
      caregiver: null,
      medications: [],
      doseEvents: [],
      currentRole: "",
    };
  }

  await syncDoseEvents(patient.id);
  const patientId = encodeURIComponent(patient.id);
  const [caregiverLinks, medicationRows, doseRows, access] = await Promise.all([
    rest(`patient_caregivers?patient_id=eq.${patientId}&select=whatsapp_status,active,caregivers(id,full_name,phone)`),
    rest(`medications?patient_id=eq.${patientId}&select=id,name,dose,instructions,starts_on,ends_on,active,medication_schedules(id,local_time,days_of_week,timezone,active)&order=created_at.asc`),
    rest(doseEventsPath(patient.id)),
    fetchPatientAccess(patient.id),
  ]);

  return {
    patient,
    caregiver: firstCaregiver(caregiverLinks),
    medications: mapMedicationRows(medicationRows.filter((row) => row.active !== false)),
    doseEvents: mapDoseEventRows(doseRows, patient.timezone),
    currentRole: access.currentRole,
  };
}

export async function fetchRelationalDoseEvents(patientId, timeZone = "America/Guayaquil") {
  if (!patientId) return [];
  await syncDoseEvents(patientId);
  const rows = await rest(doseEventsPath(patientId));
  return mapDoseEventRows(rows, timeZone);
}

export async function syncDoseEvents(patientId, daysAhead = 30) {
  if (!patientId) return 0;
  return rest("rpc/sync_dose_events", {
    method: "POST",
    body: JSON.stringify({
      p_patient_id: patientId,
      p_days_ahead: daysAhead,
    }),
  });
}

export async function fetchPatientAccess(patientId) {
  if (!patientId) return { currentRole: "", members: [], invitations: [] };
  return rest("rpc/get_patient_access", {
    method: "POST",
    body: JSON.stringify({ p_patient_id: patientId }),
  });
}

export async function createPatientInvitation({ patientId, email, role }) {
  return rest("rpc/create_patient_invitation", {
    method: "POST",
    body: JSON.stringify({
      p_patient_id: patientId,
      p_email: email.trim().toLowerCase(),
      p_role: role,
    }),
  });
}

export async function acceptPatientInvitation(token) {
  return rest("rpc/accept_patient_invitation", {
    method: "POST",
    body: JSON.stringify({ p_token: token }),
  });
}

export async function updatePatientMemberRole({ patientId, userId, role }) {
  return rest("rpc/update_patient_member_role", {
    method: "POST",
    body: JSON.stringify({
      p_patient_id: patientId,
      p_user_id: userId,
      p_role: role,
    }),
  });
}

export async function revokePatientInvitation(invitationId) {
  return rest("rpc/revoke_patient_invitation", {
    method: "POST",
    body: JSON.stringify({ p_invitation_id: invitationId }),
  });
}

export async function saveCareContext({
  patientId,
  caregiverId,
  patientName,
  timeZone = "America/Guayaquil",
  caregiverName,
  caregiverPhone,
  medications,
}) {
  const result = await rest("rpc/save_care_plan", {
    method: "POST",
    body: JSON.stringify({
      p_patient_id: patientId || null,
      p_patient_name: patientName.trim(),
      p_timezone: timeZone,
      p_caregiver_id: caregiverId || null,
      p_caregiver_name: caregiverName.trim(),
      p_caregiver_phone: caregiverPhone,
      p_medications: medications,
    }),
  });
  return {
    patient: result.patient,
    caregiver: result.caregiver,
    medications: result.medications || [],
  };
}
