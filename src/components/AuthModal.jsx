import { useState } from "react";
import { motion } from "motion/react";
import { Eye, EyeOff, AlertCircle } from "lucide-react";
import logotipo from "../assets/logotipo.png";
import PhoneInput from "./PhoneInput";
import { registerLocalUser, loginLocalUser } from "../lib/api";
import { validateName, validatePhone, validatePassword } from "../lib/validation";

export default function AuthModal({ mode, onClose, onSuccess }) {
  const [tab, setTab] = useState(mode);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function handleSubmit() {
    setErr("");

    if (tab === "register") {
      const nameErr = validateName(name);
      if (nameErr) { setErr(nameErr); return; }
    }
    const phoneErr = validatePhone(phone);
    if (phoneErr) { setErr(phoneErr); return; }
    const passErr = tab === "register" ? validatePassword(pass) : (!pass ? "Ingresa tu contraseña." : "");
    if (passErr) { setErr(passErr); return; }

    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    try {
      const session = tab === "register"
        ? registerLocalUser({ name: name.trim(), phone, pass })
        : loginLocalUser({ phone, pass });
      onSuccess(session);
    } catch (e) {
      setErr(e.message);
    }
    setLoading(false);
  }

  return (
    <motion.div
      className="sm-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className="sm-auth"
        initial={{ opacity: 0, y: 28, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.97 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="sm-auth-header">
          <img src={logotipo} alt="SincroMed" />
          <button className="sm-auth-close" onClick={onClose}>✕</button>
        </div>
        <div className="sm-auth-tabs">
          <button className={"sm-auth-tab" + (tab === "login" ? " active" : "")} onClick={() => { setTab("login"); setErr(""); }}>Iniciar sesión</button>
          <button className={"sm-auth-tab" + (tab === "register" ? " active" : "")} onClick={() => { setTab("register"); setErr(""); }}>Registrarse</button>
        </div>
        <div className="sm-auth-body">
          {tab === "register" && (
            <div className="sm-field">
              <label className="sm-label">Tu nombre completo</label>
              <input className="sm-input" placeholder="Ej. María García" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          )}
          <div className="sm-field">
            <label className="sm-label">Número de teléfono (tu usuario)</label>
            <PhoneInput value={phone} onChange={setPhone} />
          </div>
          <div className="sm-field">
            <label className="sm-label">Contraseña</label>
            <div className="sm-input-wrap">
              <input
                className="sm-input"
                type={showPass ? "text" : "password"}
                placeholder="••••••••"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              />
              <button type="button" className="sm-input-eye" onClick={() => setShowPass((v) => !v)} tabIndex={-1}>
                {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>
          {err && (
            <p className="sm-auth-error">
              <AlertCircle size={14} /> {err}
            </p>
          )}
          <motion.button
            className="sm-auth-submit"
            disabled={loading}
            onClick={handleSubmit}
            whileHover={{ scale: loading ? 1 : 1.02 }}
            whileTap={{ scale: loading ? 1 : 0.98 }}
          >
            {loading ? "Un momento…" : tab === "login" ? "Entrar" : "Crear cuenta"}
          </motion.button>
          <p className="sm-auth-alt">
            {tab === "login" ? "¿No tienes cuenta?" : "¿Ya tienes cuenta?"}
            {" "}
            <button onClick={() => { setTab(tab === "login" ? "register" : "login"); setErr(""); }}>
              {tab === "login" ? "Regístrate" : "Inicia sesión"}
            </button>
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
