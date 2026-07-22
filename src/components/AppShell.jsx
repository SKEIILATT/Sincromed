import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { sileo } from "sileo";
import { User, Pill, Plus, X, LogOut, CheckCircle2, AlertCircle, MessageCircle, BellRing } from "lucide-react";
import logotipo from "../assets/logotipo.png";
import PhoneInput from "./PhoneInput";
import { fetchTomas, saveCaregiver, getCaregiverLink, setCaregiverLink, conectarWhatsapp, simularToma, waSandboxLink } from "../lib/api";
import { validateName, validatePhone, validatePatientName } from "../lib/validation";
import AdherenceHistory from "./AdherenceHistory";

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

export default function AppShell({ user, onLogout }) {
  const [meds, setMeds] = useState([{ nombre: "", dosis: "", hora: "" }]);
  const [caregiverName, setCaregiverName] = useState("");
  const [patientName, setPatientName] = useState("");
  // The backend has no link between a family member's account and "their" caregiver,
  // so we remember it locally and reuse it to know which telefono_cuidador to query.
  const [caregiverPhone, setCaregiverPhone] = useState(() => getCaregiverLink(user.phone));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [caregiverErr, setCaregiverErr] = useState("");
  const [tomas, setTomas] = useState([]);
  const [loadingTomas, setLoadingTomas] = useState(true);
  const [simulating, setSimulating] = useState(false);

  useEffect(() => { loadTomas(caregiverPhone); }, []);

  async function loadTomas(phone) {
    if (!phone) { setTomas([]); setLoadingTomas(false); return; }
    setLoadingTomas(true);
    try {
      setTomas(await fetchTomas(phone));
    } catch {
      setTomas([]);
    }
    setLoadingTomas(false);
  }

  function addMed() { setMeds((m) => [...m, { nombre: "", dosis: "", hora: "" }]); }
  function removeMed(i) { setMeds((m) => m.filter((_, j) => j !== i)); }
  function updateMed(i, field, val) {
    setMeds((m) => m.map((med, j) => (j === i ? { ...med, [field]: val } : med)));
  }

  async function handleSave() {
    setCaregiverErr("");
    const nameErr = validateName(caregiverName);
    if (nameErr) { setCaregiverErr(nameErr); return; }
    const patientErr = validatePatientName(patientName);
    if (patientErr) { setCaregiverErr(patientErr); return; }
    const phoneErr = validatePhone(caregiverPhone);
    if (phoneErr) { setCaregiverErr(phoneErr); return; }
    const validMeds = meds.filter((m) => m.nombre && m.hora);
    if (!validMeds.length) {
      setCaregiverErr("Agrega al menos una medicina con nombre y hora.");
      return;
    }
    setSaving(true);
    try {
      await saveCaregiver({ nombreCuidador: caregiverName.trim(), nombreAdultoMayor: patientName.trim(), telefonoCuidador: caregiverPhone, medicinas: validMeds });
      setCaregiverLink(user.phone, caregiverPhone);
      setSaved(true);
      sileo.success({ title: "Cuidador registrado" });
      loadTomas(caregiverPhone);
      // Whitelistea el número en el sandbox de WhatsApp para que el bot pueda escribirle.
      conectarWhatsapp({ telefonoCuidador: caregiverPhone, nombreCuidador: caregiverName.trim() }).catch(() => {});
    } catch {
      sileo.error({ title: "No se pudo guardar" });
    }
    setSaving(false);
  }

  async function handleSimular() {
    if (!caregiverPhone) {
      sileo.error({ title: "Primero registra al cuidador y sus medicinas" });
      return;
    }
    setSimulating(true);
    try {
      const r = await simularToma(caregiverPhone);
      if (r.enviado) {
        sileo.success({
          title: "Recordatorio enviado 📱",
          description: `Revisa WhatsApp: toca tomar ${r.medicina}. La pulsera está vibrando.`,
        });
      } else if (r.error === "no_registrado") {
        sileo.error({ title: "Ese número no tiene cuidador registrado" });
      } else {
        // Sin sesión de 24h abierta el mensaje no entra: abrimos el chat para
        // que salude al bot y pueda volver a intentar.
        window.open(r.waLink || waSandboxLink(caregiverName), "_blank");
        sileo.error({
          title: "Aún no hay chat activo",
          description: "Envía el saludo en WhatsApp y vuelve a presionar Simular toma.",
        });
      }
    } catch {
      sileo.error({ title: "No se pudo simular la toma" });
    }
    setSimulating(false);
  }

  const initials = user.name ? user.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() : "U";

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
        <motion.div className="sm-app-hero" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="sm-app-greeting">Hola, {user.name.split(" ")[0]} 👋</div>
          <div className="sm-app-sub">Registra a tu cuidador y sus medicamentos para activar el recordatorio por WhatsApp.</div>
        </motion.div>

        <AnimatePresence>
          {saved && (
            <motion.div
              className="sm-success-banner"
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: "auto", marginBottom: 20 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.3 }}
            >
              <CheckCircle2 size={18} />
              <span>
                El agente de WhatsApp ya tiene los medicamentos. Último paso:{" "}
                <a href={waSandboxLink(caregiverName)} target="_blank" rel="noreferrer" style={{ fontWeight: 700, textDecoration: "underline", color: "inherit" }}>
                  salúdalo en WhatsApp
                </a>{" "}
                para activar los recordatorios.
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div className="sm-card" variants={cardVariants} initial="hidden" animate="show">
          <div className="sm-card-title"><User size={18} /> Datos del cuidador y el adulto mayor</div>
          <div className="sm-form-row">
            <div className="sm-field">
              <label className="sm-label">Nombre del cuidador</label>
              <input className="sm-input" placeholder="Ej. Doña Marta" value={caregiverName} onChange={(e) => setCaregiverName(e.target.value)} />
            </div>
            <div className="sm-field">
              <label className="sm-label">WhatsApp del cuidador</label>
              <PhoneInput value={caregiverPhone} onChange={setCaregiverPhone} placeholder="98 877 7666" />
            </div>
          </div>
          <div className="sm-field">
            <label className="sm-label">Nombre del adulto mayor</label>
            <input className="sm-input" placeholder="Ej. Don José" value={patientName} onChange={(e) => setPatientName(e.target.value)} />
          </div>
        </motion.div>

        <motion.div className="sm-card" variants={cardVariants} initial="hidden" animate="show" transition={{ delay: 0.08 }}>
          <div className="sm-card-title"><Pill size={18} /> Lista de medicamentos</div>
          <div className="sm-meds-list">
            {meds.map((med, i) => (
              <div key={i} className="sm-med-row">
                <div className="sm-field" style={{ margin: 0 }}>
                  {i === 0 && <label className="sm-label">Medicamento</label>}
                  <input className="sm-input" placeholder="Ej. Enalapril" value={med.nombre} onChange={(e) => updateMed(i, "nombre", e.target.value)} />
                </div>
                <div className="sm-field" style={{ margin: 0 }}>
                  {i === 0 && <label className="sm-label">Dosis</label>}
                  <input className="sm-input" placeholder="Ej. 1 tableta 10mg" value={med.dosis} onChange={(e) => updateMed(i, "dosis", e.target.value)} />
                </div>
                <div className="sm-field" style={{ margin: 0 }}>
                  {i === 0 && <label className="sm-label">Hora</label>}
                  <input className="sm-input" type="time" value={med.hora} onChange={(e) => updateMed(i, "hora", e.target.value)} />
                </div>
                <button className="sm-remove-btn" style={{ marginTop: i === 0 ? 22 : 0 }} onClick={() => removeMed(i)}>
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
          <button className="sm-add-med-btn" onClick={addMed}>
            <Plus size={15} /> Agregar medicamento
          </button>
          {caregiverErr && (
            <p className="sm-auth-error" style={{ marginTop: 14, marginBottom: 0 }}>
              <AlertCircle size={14} /> {caregiverErr}
            </p>
          )}
          <div>
            <motion.button
              className="sm-save-btn"
              disabled={saving}
              onClick={handleSave}
              whileHover={{ scale: saving ? 1 : 1.02 }}
              whileTap={{ scale: saving ? 1 : 0.98 }}
            >
              {saving ? "Guardando…" : "Guardar y activar recordatorios"}
            </motion.button>
          </div>
        </motion.div>

        <motion.div className="sm-card" variants={cardVariants} initial="hidden" animate="show" transition={{ delay: 0.14 }}>
          <div className="sm-card-title"><BellRing size={18} /> Probar la experiencia</div>
          <p style={{ margin: "0 0 14px", color: "var(--sm-text-soft, #5b6572)", fontSize: 14, lineHeight: 1.5 }}>
            Simula la hora de la toma: el cuidador recibe el recordatorio por WhatsApp con la próxima
            medicina y la pulsera SincroMed empieza a vibrar. Al presionar el botón de la pulsera,
            el chat pedirá confirmar qué pastillas se tomó.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <motion.button
              className="sm-save-btn"
              style={{ marginTop: 0 }}
              disabled={simulating}
              onClick={handleSimular}
              whileHover={{ scale: simulating ? 1 : 1.02 }}
              whileTap={{ scale: simulating ? 1 : 0.98 }}
            >
              <BellRing size={15} style={{ verticalAlign: "-2px", marginRight: 6 }} />
              {simulating ? "Enviando…" : "Simular toma"}
            </motion.button>
            <a
              href={waSandboxLink(caregiverName)}
              target="_blank"
              rel="noreferrer"
              className="sm-add-med-btn"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none" }}
            >
              <MessageCircle size={15} /> Abrir chat de WhatsApp
            </a>
          </div>
        </motion.div>

        <AdherenceHistory tomas={tomas} loading={loadingTomas} onRefresh={() => loadTomas(caregiverPhone)} />
      </div>
    </div>
  );
}
