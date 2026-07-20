import { useState } from "react";
import { Star, Send, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Reveal from "./Reveal";

const SCRIPT_URL = import.meta.env.VITE_GOOGLE_SCRIPT_URL || "";

const LABELS = ["Muy mala", "Regular", "Buena", "Muy buena", "Excelente"];

export default function FeedbackSection() {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [opinion, setOpinion] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!rating) { setError("Por favor selecciona una calificación."); return; }
    if (!nombre.trim()) { setError("Ingresa tu nombre."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("Ingresa un email válido."); return; }
    setError("");
    setLoading(true);
    try {
      await fetch(SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: nombre.trim(), email: email.trim(), rating, opinion: opinion.trim() }),
      });
      setDone(true);
    } catch {
      setError("No se pudo enviar. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  const active = hovered || rating;

  return (
    <section className="sm-feedback-section">
      <div className="sm-feedback-inner">
        <Reveal>
          <div className="sm-feedback-label">Tu opinión</div>
          <h2 className="sm-feedback-title">¿Qué te parece SincroMed?</h2>
          <p className="sm-feedback-sub">
            Esta propuesta está en construcción. Cuéntanos si te sería útil
            y qué mejorarías — tu voz define el producto.
          </p>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="sm-feedback-card">
            <AnimatePresence mode="wait">
              {done ? (
                <motion.div
                  key="success"
                  className="sm-feedback-success"
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                >
                  <CheckCircle2 size={44} strokeWidth={1.5} className="sm-feedback-check" />
                  <p className="sm-feedback-success-title">¡Gracias por tu opinión!</p>
                  <p className="sm-feedback-success-sub">
                    Nos ayuda mucho. Te contactaremos cuando SincroMed esté disponible.
                  </p>
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  className="sm-feedback-form"
                  onSubmit={handleSubmit}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {/* Stars */}
                  <div className="sm-feedback-stars-wrap">
                    <div
                      className="sm-feedback-stars"
                      onMouseLeave={() => setHovered(0)}
                    >
                      {[1, 2, 3, 4, 5].map((n) => (
                        <motion.button
                          key={n}
                          type="button"
                          className={`sm-feedback-star ${n <= active ? "active" : ""}`}
                          onMouseEnter={() => setHovered(n)}
                          onClick={() => setRating(n)}
                          whileTap={{ scale: 0.85 }}
                          transition={{ type: "spring", stiffness: 400, damping: 20 }}
                          aria-label={`${n} estrella${n > 1 ? "s" : ""}`}
                        >
                          <Star
                            size={34}
                            strokeWidth={1.5}
                            fill={n <= active ? "currentColor" : "none"}
                          />
                        </motion.button>
                      ))}
                    </div>
                    <AnimatePresence mode="wait">
                      {active > 0 && (
                        <motion.span
                          key={active}
                          className="sm-feedback-star-label"
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.18 }}
                        >
                          {LABELS[active - 1]}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Fields */}
                  <div className="sm-feedback-row">
                    <div className="sm-feedback-field">
                      <label>Nombre</label>
                      <input
                        type="text"
                        placeholder="Tu nombre"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        autoComplete="name"
                      />
                    </div>
                    <div className="sm-feedback-field">
                      <label>Correo electrónico</label>
                      <input
                        type="email"
                        placeholder="tu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  <div className="sm-feedback-field">
                    <label>
                      ¿Qué agregarías o cambiarías?{" "}
                      <span className="sm-feedback-optional">(opcional)</span>
                    </label>
                    <textarea
                      placeholder="Cuéntanos lo que se te ocurra…"
                      rows={3}
                      value={opinion}
                      onChange={(e) => setOpinion(e.target.value)}
                    />
                  </div>

                  {error && <p className="sm-feedback-error">{error}</p>}

                  <motion.button
                    type="submit"
                    className="sm-feedback-submit"
                    disabled={loading}
                    whileTap={{ scale: 0.97 }}
                  >
                    {loading ? (
                      <span className="sm-feedback-spinner" />
                    ) : (
                      <>
                        <Send size={16} />
                        Enviar opinión
                      </>
                    )}
                  </motion.button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
