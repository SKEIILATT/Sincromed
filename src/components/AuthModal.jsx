import { useState } from "react";
import { motion } from "motion/react";
import { Eye, EyeOff, AlertCircle, MailCheck, X } from "lucide-react";
import logotipo from "../assets/logotipo.png";
import PhoneInput from "./PhoneInput";
import { registerUser, loginUser } from "../lib/auth";
import { validateEmail, validateName, validatePhone, validatePassword } from "../lib/validation";

export default function AuthModal({ mode, onClose, onSuccess }) {
  const [tab, setTab] = useState(mode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [confirmationEmail, setConfirmationEmail] = useState("");

  async function handleSubmit(event) {
    event?.preventDefault();
    setErr("");

    if (tab === "register") {
      const nameErr = validateName(name);
      if (nameErr) { setErr(nameErr); return; }
      const phoneErr = validatePhone(phone);
      if (phoneErr) { setErr(phoneErr); return; }
    }
    const emailErr = validateEmail(email);
    if (emailErr) { setErr(emailErr); return; }
    const passErr = tab === "register" ? validatePassword(pass) : (!pass ? "Ingresa tu contraseña." : "");
    if (passErr) { setErr(passErr); return; }

    setLoading(true);
    try {
      if (tab === "register") {
        const result = await registerUser({ name: name.trim(), email, phone, pass });
        if (result.requiresConfirmation) {
          setConfirmationEmail(result.email);
        } else {
          onSuccess(result.user);
        }
      } else {
        onSuccess(await loginUser({ email, pass }));
      }
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
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
        role="dialog"
        aria-modal="true"
        aria-label={tab === "login" ? "Iniciar sesión" : "Crear cuenta"}
        initial={{ opacity: 0, y: 28, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.97 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="sm-auth-header">
          <img src={logotipo} alt="SincroMed" />
          <button className="sm-auth-close" type="button" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>
        {confirmationEmail ? (
          <div className="sm-auth-body sm-auth-confirm">
            <MailCheck size={42} />
            <h2>Revisa tu correo</h2>
            <p>
              Enviamos un enlace de confirmación a <strong>{confirmationEmail}</strong>.
              Después de confirmarlo podrás iniciar sesión.
            </p>
            <button
              className="sm-auth-submit"
              onClick={() => { setConfirmationEmail(""); setTab("login"); setPass(""); }}
            >
              Ir a iniciar sesión
            </button>
          </div>
        ) : (
          <>
            <div className="sm-auth-tabs">
              <button type="button" className={"sm-auth-tab" + (tab === "login" ? " active" : "")} onClick={() => { setTab("login"); setErr(""); }}>Iniciar sesión</button>
              <button type="button" className={"sm-auth-tab" + (tab === "register" ? " active" : "")} onClick={() => { setTab("register"); setErr(""); }}>Registrarse</button>
            </div>
            <form className="sm-auth-body" onSubmit={handleSubmit}>
              {tab === "register" && (
                <div className="sm-field">
                  <label className="sm-label" htmlFor="auth-name">Tu nombre completo</label>
                  <input id="auth-name" className="sm-input" placeholder="Ej. María García" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
                </div>
              )}
            <div className="sm-field">
              <label className="sm-label" htmlFor="auth-email">Correo electrónico</label>
              <input
                id="auth-email"
                className="sm-input"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            {tab === "register" && (
              <div className="sm-field">
                <label className="sm-label">Número de WhatsApp</label>
                <PhoneInput value={phone} onChange={setPhone} />
              </div>
            )}
          <div className="sm-field">
            <label className="sm-label" htmlFor="auth-password">Contraseña</label>
            <div className="sm-input-wrap">
              <input
                id="auth-password"
                className="sm-input"
                type={showPass ? "text" : "password"}
                placeholder="••••••••"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                autoComplete={tab === "login" ? "current-password" : "new-password"}
              />
              <button type="button" className="sm-input-eye" onClick={() => setShowPass((v) => !v)} aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}>
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
            type="submit"
            className="sm-auth-submit"
            disabled={loading}
            whileHover={{ scale: loading ? 1 : 1.02 }}
            whileTap={{ scale: loading ? 1 : 0.98 }}
          >
            {loading ? "Un momento…" : tab === "login" ? "Entrar" : "Crear cuenta"}
          </motion.button>
          <p className="sm-auth-alt">
            {tab === "login" ? "¿No tienes cuenta?" : "¿Ya tienes cuenta?"}
            {" "}
            <button type="button" onClick={() => { setTab(tab === "login" ? "register" : "login"); setErr(""); }}>
              {tab === "login" ? "Regístrate" : "Inicia sesión"}
            </button>
          </p>
            </form>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
