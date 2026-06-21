import { motion } from "motion/react";
import Reveal from "./Reveal";

export default function CtaSection({ onRegister, onLogin }) {
  return (
    <section className="sm-cta-section">
      <Reveal as="h2">
        Tranquilidad para tu familia, <em>autonomía para los tuyos.</em>
      </Reveal>
      <Reveal as="p" delay={0.1}>Configura el primer cuidador en menos de 10 minutos.</Reveal>
      <Reveal className="sm-cta-section-btns" delay={0.2}>
        <motion.button className="sm-hero-cta-main" whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }} onClick={onRegister}>
          Crear mi cuenta gratis
        </motion.button>
        <motion.button className="sm-hero-cta-sec" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} onClick={onLogin}>
          Ya tengo cuenta
        </motion.button>
      </Reveal>
    </section>
  );
}
