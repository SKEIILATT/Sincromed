import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { User, Pill, Plus, LogOut, CheckCircle2, AlertCircle, MessageCircle, BellRing, Mail, Phone, ShieldCheck } from "lucide-react";
import logotipo from "../assets/logotipo.png";
import PhoneInput from "./PhoneInput";
import { saveCaregiver, conectarWhatsapp, simularToma, waSandboxLink } from "../lib/api";
import {
  acceptPatientInvitation,
  fetchCareContext,
  fetchPatients,
  fetchRelationalDoseEvents,
  saveCareContext,
} from "../lib/care-data";
import { normalizeMedicationList } from "../lib/care-model";
import { medicationSchedules } from "../lib/medications";
import { validateMedicationPlan, validateName, validatePhone, validatePatientName } from "../lib/validation";
import AdherenceHistory from "./AdherenceHistory";
import DashboardTabs from "./DashboardTabs";
import DashboardOverview from "./DashboardOverview";
import MedicationPlanEditor from "./MedicationPlanEditor";
import { createEmptyMedication, createEmptySchedule } from "../lib/medication-form";
import PatientSwitcher from "./PatientSwitcher";
import PatientAccessPanel from "./PatientAccessPanel";
import {
  clearInvitationFromLocation,
  invitationTokenFromLocation,
} from "../lib/invitations";

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

const TAB_CONTENT = {
  overview: { label: "Resumen", description: "Próximas tomas y estado reciente del plan." },
  plan: { label: "Plan", description: "Paciente, cuidador, medicamentos y horarios." },
  evidence: { label: "Evidencias", description: "Confirmaciones recibidas por WhatsApp." },
  people: { label: "Personas", description: "Personas vinculadas al cuidado." },
  settings: { label: "Ajustes", description: "Conexión de WhatsApp y seguridad de la cuenta." },
};

function selectedPatientStorageKey(userKey) {
  return `sm_selected_patient_${userKey}`;
}

function getRememberedPatient(userKey) {
  try {
    return localStorage.getItem(selectedPatientStorageKey(userKey)) || "";
  } catch {
    return "";
  }
}

function rememberPatient(userKey, patientId) {
  try {
    localStorage.setItem(selectedPatientStorageKey(userKey), patientId);
  } catch {
    // The first linked patient remains the fallback when storage is unavailable.
  }
}

export default function AppShell({ user, onLogout, notify }) {
  const userKey = user.id || user.phone;
  const [meds, setMeds] = useState(() => [createEmptyMedication()]);
  const [caregiverName, setCaregiverName] = useState("");
  const [patientName, setPatientName] = useState("");
  const [caregiverPhone, setCaregiverPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [caregiverErr, setCaregiverErr] = useState("");
  const [tomas, setTomas] = useState([]);
  const [loadingTomas, setLoadingTomas] = useState(true);
  const [tomasError, setTomasError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [patientId, setPatientId] = useState("");
  const [caregiverId, setCaregiverId] = useState("");
  const [patientTimeZone, setPatientTimeZone] = useState("America/Guayaquil");
  const [patients, setPatients] = useState([]);
  const [creatingPatient, setCreatingPatient] = useState(false);
  const [switchingPatient, setSwitchingPatient] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [patientRole, setPatientRole] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadInitialData() {
      setLoadingTomas(true);
      try {
        let invitedPatientId = "";
        const invitationToken = invitationTokenFromLocation();
        if (invitationToken) {
          try {
            const acceptedInvitation = await acceptPatientInvitation(invitationToken);
            invitedPatientId = acceptedInvitation.patientId;
            notify(`Ya tienes acceso al perfil de ${acceptedInvitation.patientName}.`);
          } catch (error) {
            notify(error.message || "La invitación no es válida o ya venció.", "error");
          } finally {
            window.history.replaceState({}, "", clearInvitationFromLocation());
          }
        }

        const availablePatients = await fetchPatients();
        if (cancelled) return;
        setPatients(availablePatients);
        const rememberedPatientId = getRememberedPatient(userKey);
        const selectedPatient = availablePatients.find(
          (patient) => patient.id === invitedPatientId,
        ) || availablePatients.find(
          (patient) => patient.id === rememberedPatientId,
        ) || availablePatients[0];
        const context = await fetchCareContext(selectedPatient?.id);
        if (cancelled) return;
        if (context.patient) {
          const relationalPhone = context.caregiver?.phone || "";
          setPatientId(context.patient.id);
          setPatientName(context.patient.full_name || "");
          setPatientTimeZone(context.patient.timezone || "America/Guayaquil");
          setCaregiverId(context.caregiver?.id || "");
          setCaregiverName(context.caregiver?.name || "");
          setCaregiverPhone(relationalPhone);
          setMeds(context.medications.length
            ? normalizeMedicationList(context.medications)
            : [createEmptyMedication()]);
          setPatientRole(context.currentRole || "");
          setCreatingPatient(false);
          setDirty(false);
          rememberPatient(userKey, context.patient.id);
          setTomas(context.doseEvents);
          setTomasError("");
          setLoadingTomas(false);
          return;
        }
        setCreatingPatient(availablePatients.length === 0);
        setLoadingTomas(false);
      } catch (error) {
        if (cancelled) return;
        setTomas([]);
        setTomasError(error.message || "No se pudo cargar la información de cuidado.");
        notify(error.message || "No se pudo cargar la información de cuidado.", "error");
        setLoadingTomas(false);
      }
    }

    loadInitialData();
    return () => { cancelled = true; };
  }, [notify, userKey]);

  async function loadTomas(
    relationalPatientId = patientId,
    timeZone = patientTimeZone,
  ) {
    if (!relationalPatientId) {
      setTomas([]);
      setTomasError("");
      setLoadingTomas(false);
      return;
    }
    setLoadingTomas(true);
    try {
      setTomas(await fetchRelationalDoseEvents(relationalPatientId, timeZone));
      setTomasError("");
    } catch (error) {
      setTomas([]);
      setTomasError(error.message || "No se pudo cargar el historial.");
    }
    setLoadingTomas(false);
  }

  function markUnsaved() {
    setSaved(false);
    setDirty(true);
  }

  async function handlePatientChange(nextPatientId) {
    if (!nextPatientId || nextPatientId === patientId) return;
    if (dirty && !window.confirm("Hay cambios sin guardar. ¿Deseas cambiar de paciente?")) return;

    setSwitchingPatient(true);
    setLoadingTomas(true);
    try {
      const context = await fetchCareContext(nextPatientId);
      if (!context.patient) throw new Error("No se encontró el paciente seleccionado.");
      const nextPhone = context.caregiver?.phone || "";

      setPatientId(context.patient.id);
      setPatientName(context.patient.full_name || "");
      setPatientTimeZone(context.patient.timezone || "America/Guayaquil");
      setCaregiverId(context.caregiver?.id || "");
      setCaregiverName(context.caregiver?.name || "");
      setCaregiverPhone(nextPhone);
      setMeds(context.medications.length
        ? normalizeMedicationList(context.medications)
        : [createEmptyMedication()]);
      setPatientRole(context.currentRole || "");
      setTomas(context.doseEvents);
      setTomasError("");
      setSaved(false);
      setDirty(false);
      setCreatingPatient(false);
      rememberPatient(userKey, context.patient.id);
    } catch (error) {
      notify(error.message || "No se pudo cambiar de paciente.", "error");
    } finally {
      setLoadingTomas(false);
      setSwitchingPatient(false);
    }
  }

  function handleCreatePatient() {
    if (dirty && !window.confirm("Hay cambios sin guardar. ¿Deseas crear otro paciente?")) return;
    setPatientId("");
    setPatientName("");
    setPatientTimeZone("America/Guayaquil");
    setCaregiverId("");
    setCaregiverName("");
    setCaregiverPhone("");
    setMeds([createEmptyMedication()]);
    setPatientRole("owner");
    setTomas([]);
    setTomasError("");
    setSaved(false);
    setDirty(false);
    setCreatingPatient(true);
    setActiveTab("plan");
  }
  function addMed() {
    markUnsaved();
    setMeds((current) => [...current, createEmptyMedication()]);
  }
  function removeMed(i) {
    markUnsaved();
    setMeds((current) => current.filter((_, index) => index !== i));
  }
  function updateMed(i, field, val) {
    markUnsaved();
    setMeds((current) => current.map((medication, index) => (
      index === i ? { ...medication, [field]: val } : medication
    )));
  }
  function addSchedule(medicationIndex) {
    markUnsaved();
    setMeds((current) => current.map((medication, index) => (
      index === medicationIndex
        ? {
            ...medication,
            horarios: [
              ...medication.horarios,
              createEmptySchedule(medication.horarios.at(-1)?.daysOfWeek),
            ],
          }
        : medication
    )));
  }
  function updateSchedule(medicationIndex, scheduleIndex, field, value) {
    markUnsaved();
    setMeds((current) => current.map((medication, index) => (
      index === medicationIndex
        ? {
            ...medication,
            horarios: medication.horarios.map((schedule, currentScheduleIndex) => (
              currentScheduleIndex === scheduleIndex
                ? { ...schedule, [field]: value }
                : schedule
            )),
          }
        : medication
    )));
  }
  function removeSchedule(medicationIndex, scheduleIndex) {
    markUnsaved();
    setMeds((current) => current.map((medication, index) => (
      index === medicationIndex && medication.horarios.length > 1
        ? {
            ...medication,
            horarios: medication.horarios.filter(
              (_, currentScheduleIndex) => currentScheduleIndex !== scheduleIndex,
            ),
          }
        : medication
    )));
  }
  function toggleScheduleDay(medicationIndex, scheduleIndex, day) {
    const schedule = meds[medicationIndex]?.horarios[scheduleIndex];
    if (!schedule) return;
    const daysOfWeek = schedule.daysOfWeek.includes(day)
      ? schedule.daysOfWeek.filter((currentDay) => currentDay !== day)
      : [...schedule.daysOfWeek, day].sort((a, b) => a - b);
    updateSchedule(medicationIndex, scheduleIndex, "daysOfWeek", daysOfWeek);
  }

  async function handleSave() {
    setCaregiverErr("");
    const nameErr = validateName(caregiverName);
    if (nameErr) { setCaregiverErr(nameErr); return; }
    const patientErr = validatePatientName(patientName);
    if (patientErr) { setCaregiverErr(patientErr); return; }
    const phoneErr = validatePhone(caregiverPhone);
    if (phoneErr) { setCaregiverErr(phoneErr); return; }
    const medicationError = validateMedicationPlan(meds);
    if (medicationError) {
      setCaregiverErr(medicationError);
      return;
    }
    const validMeds = meds;
    setSaving(true);
    try {
      const savedContext = await saveCareContext({
        patientId,
        caregiverId,
        patientName: patientName.trim(),
        timeZone: patientTimeZone,
        caregiverName: caregiverName.trim(),
        caregiverPhone,
        medications: validMeds,
      });
      setPatientId(savedContext.patient.id);
      setCaregiverId(savedContext.caregiver.id);
      setMeds(normalizeMedicationList(savedContext.medications));
      setPatients((current) => {
        const nextPatient = {
          id: savedContext.patient.id,
          full_name: savedContext.patient.full_name,
          timezone: savedContext.patient.timezone,
          created_by: savedContext.patient.created_by,
          created_at: savedContext.patient.created_at,
        };
        return current.some((patient) => patient.id === nextPatient.id)
          ? current.map((patient) => patient.id === nextPatient.id ? nextPatient : patient)
          : [...current, nextPatient];
      });
      setCreatingPatient(false);
      setDirty(false);
      setPatientRole("owner");
      rememberPatient(userKey, savedContext.patient.id);
      setSaved(true);
      notify("Plan de cuidado guardado correctamente");

      try {
        const jelouMedications = medicationSchedules(validMeds).map((medication) => ({
          nombre: medication.nombre,
          dosis: medication.dosis,
          hora: medication.hora,
          dias_semana: medication.daysOfWeek,
          indicaciones: medication.instrucciones,
          fecha_inicio: medication.startsOn || null,
          fecha_fin: medication.endsOn || null,
        }));
        await saveCaregiver({
          patientId: savedContext.patient.id,
          caregiverName: caregiverName.trim(),
          patientName: patientName.trim(),
          caregiverPhone,
          medications: jelouMedications,
        });
      } catch (error) {
        notify(`El plan se guardó, pero Jelou no se actualizó: ${error.message}`, "error");
      }

      await loadTomas(
        savedContext.patient.id,
        savedContext.patient.timezone || patientTimeZone,
      );
      try {
        await conectarWhatsapp({
          patientId: savedContext.patient.id,
          caregiverPhone,
          caregiverName: caregiverName.trim(),
        });
      } catch (error) {
        notify(`Los datos se guardaron, pero WhatsApp no se conectó: ${error.message}`, "error");
      }
    } catch (error) {
      notify(error.message || "No se pudo guardar, intenta de nuevo", "error");
    }
    setSaving(false);
  }

  // Un solo botón: abre WhatsApp (gesto del usuario, evita bloqueo de popup) y
  // en paralelo dispara el envío del recordatorio por la API de Jelou.
  async function handleSimular() {
    const phoneErr = validatePhone(caregiverPhone);
    if (phoneErr) {
      notify(phoneErr, "error");
      return;
    }
    window.open(waSandboxLink(caregiverName), "_blank");
    try {
      const result = await simularToma({ patientId, caregiverPhone });
      const medicina = result?.medicina ? ` para ${result.medicina}` : "";
      if (result?.enviado && result?.vibrando) {
        notify(`💊 Recordatorio enviado y bandita activada${medicina}`);
      } else if (result?.vibrando) {
        notify(
          `⌚ Bandita activada${medicina}, pero WhatsApp no pudo enviar el mensaje`,
          "error",
        );
      } else if (result?.enviado) {
        notify(
          `💬 Recordatorio enviado${medicina}, pero la bandita no pudo activarse`,
          "error",
        );
      } else {
        throw new Error(result?.error || "No se pudo iniciar la simulación.");
      }
    } catch (error) {
      notify(error.message || "No se pudo enviar el recordatorio de prueba.", "error");
    }
  }

  const initials = user.name ? user.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() : "U";
  const activeTabConfig = TAB_CONTENT[activeTab] || TAB_CONTENT.overview;
  const canManagePatient = !patientId
    || creatingPatient
    || ["owner", "manager"].includes(patientRole);

  return (
    <div className="sm-app">
      <div className="sm-app-topbar">
        <img src={logotipo} alt="SincroMed" />
        <div className="sm-app-user">
          <div className="sm-app-avatar">{initials}</div>
          <span className="sm-app-username">{user.name}</span>
          <button className="sm-app-logout" onClick={onLogout}>
            <LogOut size={14} /> Salir
          </button>
        </div>
      </div>

      <div className="sm-app-content">
        <header className="sm-dashboard-header">
          <div>
            <span className="sm-dashboard-welcome">Hola, {user.name.split(" ")[0]}</span>
            <h1>{activeTabConfig.label}</h1>
            <p>{activeTabConfig.description}</p>
          </div>
          <PatientSwitcher
            patients={patients}
            selectedPatientId={patientId}
            creating={creatingPatient}
            disabled={switchingPatient || saving}
            onChange={handlePatientChange}
            onCreate={handleCreatePatient}
          />
        </header>

        <DashboardTabs active={activeTab} onChange={setActiveTab} />

        <AnimatePresence mode="wait">
          <motion.main
            key={activeTab}
            id={`dashboard-panel-${activeTab}`}
            className="sm-dashboard-panel-wrap"
            role="tabpanel"
            aria-labelledby={`dashboard-tab-${activeTab}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === "overview" && (
              <DashboardOverview
                patientName={patientName}
                caregiverName={caregiverName}
                meds={meds}
                tomas={tomas}
              />
            )}

            {activeTab === "plan" && (
              canManagePatient ? <>
                <AnimatePresence>
                  {saved && (
                    <motion.div
                      className="sm-success-banner"
                      initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                      animate={{ opacity: 1, height: "auto", marginBottom: 20 }}
                      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    >
                      <CheckCircle2 size={18} />
                      <span>
                        Plan guardado.{" "}
                        <a href={waSandboxLink(caregiverName)} target="_blank" rel="noreferrer">
                          Abre WhatsApp
                        </a>{" "}
                        para completar la activación.
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.section className="sm-card" variants={cardVariants} initial="hidden" animate="show">
                  <div className="sm-card-title"><User size={18} /> Paciente y cuidador</div>
                  <div className="sm-form-row">
                    <div className="sm-field">
                      <label className="sm-label" htmlFor="caregiver-name">Nombre del cuidador</label>
                      <input id="caregiver-name" className="sm-input" placeholder="Ej. Doña Marta" value={caregiverName} onChange={(e) => { markUnsaved(); setCaregiverName(e.target.value); }} />
                    </div>
                    <div className="sm-field">
                      <label className="sm-label">WhatsApp del cuidador</label>
                      <PhoneInput value={caregiverPhone} onChange={(value) => { markUnsaved(); setCaregiverPhone(value); }} placeholder="98 877 7666" />
                    </div>
                  </div>
                  <div className="sm-field">
                    <label className="sm-label" htmlFor="patient-name">Nombre del adulto mayor</label>
                    <input id="patient-name" className="sm-input" placeholder="Ej. Don José" value={patientName} onChange={(e) => { markUnsaved(); setPatientName(e.target.value); }} />
                  </div>
                </motion.section>

                <motion.section className="sm-card" variants={cardVariants} initial="hidden" animate="show">
                  <div className="sm-card-title"><Pill size={18} /> Medicamentos y horarios</div>
                  <MedicationPlanEditor
                    medications={meds}
                    onMedicationChange={updateMed}
                    onRemoveMedication={removeMed}
                    onAddSchedule={addSchedule}
                    onScheduleChange={updateSchedule}
                    onRemoveSchedule={removeSchedule}
                    onToggleDay={toggleScheduleDay}
                  />
                  <button className="sm-add-med-btn" onClick={addMed}>
                    <Plus size={15} /> Agregar medicamento
                  </button>
                  {caregiverErr && (
                    <p className="sm-auth-error sm-plan-error">
                      <AlertCircle size={14} /> {caregiverErr}
                    </p>
                  )}
                  <motion.button className="sm-save-btn" disabled={saving} onClick={handleSave} whileTap={{ scale: saving ? 1 : 0.98 }}>
                    {saving ? "Guardando…" : "Guardar plan"}
                  </motion.button>
                </motion.section>
              </> : (
                <section className="sm-dashboard-panel sm-readonly-panel">
                  <ShieldCheck size={24} />
                  <div>
                    <h2>Acceso de solo lectura</h2>
                    <p>Puedes revisar el tratamiento, pero solo un propietario o administrador puede modificarlo.</p>
                  </div>
                </section>
              )
            )}

            {activeTab === "evidence" && (
              <AdherenceHistory
                tomas={tomas}
                loading={loadingTomas}
                error={tomasError}
                onRefresh={() => loadTomas()}
                canManage={canManagePatient}
              />
            )}

            {activeTab === "people" && (
              <div className="sm-people-layout">
                <section className="sm-dashboard-panel sm-patient-list-panel">
                  <div className="sm-panel-heading">
                    <div>
                      <span className="sm-overview-kicker">Perfiles de cuidado</span>
                      <h2>Pacientes vinculados</h2>
                    </div>
                    <button className="sm-new-patient-btn" type="button" onClick={handleCreatePatient}>
                      <Plus size={15} /> Nuevo paciente
                    </button>
                  </div>
                  <div className="sm-linked-patients">
                    {patients.map((patient) => (
                      <button
                        type="button"
                        key={patient.id}
                        className={patient.id === patientId ? "active" : ""}
                        onClick={() => handlePatientChange(patient.id)}
                      >
                        <span className="sm-person-avatar small"><User size={18} /></span>
                        <span>
                          <strong>{patient.full_name}</strong>
                          <small>{patient.id === patientId ? "Paciente activo" : "Ver tratamiento"}</small>
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
                <PatientAccessPanel
                  key={patientId}
                  patientId={patientId}
                  currentUserId={user.id}
                  notify={notify}
                />
                <div className="sm-people-grid">
                <section className="sm-dashboard-panel">
                  <div className="sm-person-avatar">{initials}</div>
                  <span className="sm-overview-kicker">Cuenta familiar</span>
                  <h2>{user.name}</h2>
                  <div className="sm-person-detail"><Mail size={15} /> {user.email || "Correo no disponible"}</div>
                  <div className="sm-person-detail"><Phone size={15} /> {user.phone ? `+${user.phone}` : "Teléfono no disponible"}</div>
                  <span className="sm-role-badge"><ShieldCheck size={13} /> Propietario</span>
                </section>
                <section className="sm-dashboard-panel">
                  <div className="sm-person-avatar caregiver"><User size={22} /></div>
                  <span className="sm-overview-kicker">Cuidador principal</span>
                  <h2>{caregiverName || "Sin cuidador vinculado"}</h2>
                  <div className="sm-person-detail"><Phone size={15} /> {caregiverPhone ? `+${caregiverPhone}` : "WhatsApp pendiente"}</div>
                  <button className="sm-secondary-action" onClick={() => setActiveTab("plan")}>
                    {caregiverName ? "Editar datos" : "Agregar cuidador"}
                  </button>
                </section>
                </div>
              </div>
            )}

            {activeTab === "settings" && (
              <div className="sm-settings-grid">
                <section className="sm-dashboard-panel">
                  <div className="sm-card-title"><BellRing size={18} /> Conexión de WhatsApp</div>
                  <p className="sm-panel-copy">
                    Envía un recordatorio de prueba y abre el chat del agente para confirmar el flujo.
                  </p>
                  <motion.button
                    className="sm-save-btn sm-no-margin"
                    onClick={handleSimular}
                    disabled={!canManagePatient}
                    whileTap={{ scale: canManagePatient ? 0.98 : 1 }}
                  >
                    <MessageCircle size={16} /> Simular toma
                  </motion.button>
                </section>
                <section className="sm-dashboard-panel">
                  <div className="sm-card-title"><ShieldCheck size={18} /> Cuenta y seguridad</div>
                  <p className="sm-panel-copy">Sesión protegida por Supabase Auth para {user.email || user.name}.</p>
                  <button className="sm-danger-action" onClick={onLogout}>
                    <LogOut size={15} /> Cerrar sesión
                  </button>
                </section>
              </div>
            )}
          </motion.main>
        </AnimatePresence>
      </div>
    </div>
  );
}
