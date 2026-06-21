import { motion } from "motion/react";
import { CheckCircle2 } from "lucide-react";
import Carousel from "./Carousel";
import isotipo from "../assets/isotipo.png";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
};

export default function Hero({ onRegister }) {
  return (
    <section className="sm-hero">
      <motion.img
        className="sm-hero-isotipo"
        src={isotipo}
        alt=""
        animate={{ y: [0, -18, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="sm-hero-bg-circle"
        animate={{ y: [0, 22, 0], x: [0, -12, 0] }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="sm-hero-bg-circle"
        animate={{ y: [0, -16, 0], x: [0, 10, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="sm-hero-inner">
        <motion.div variants={container} initial="hidden" animate="show">
          <motion.div className="sm-hero-eyebrow" variants={item}>
            <motion.div
              className="sm-hero-eyebrow-dot"
              animate={{ opacity: [1, 0.35, 1] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            />
            <span>Adherencia a medicamentos · WhatsApp</span>
          </motion.div>
          <motion.h1 className="sm-hero-h1" variants={item}>
            El cuidador no necesita una app nueva. <em>Tú sí necesitas saber que tomó sus pastillas.</em>
          </motion.h1>
          <motion.p className="sm-hero-sub" variants={item}>
            Registras las medicinas una vez. SincroMed le escribe al cuidador por WhatsApp a la hora exacta
            de cada pastilla y tú ves la adherencia en tiempo real, sin llamadas de control.
          </motion.p>
          <motion.div className="sm-hero-cta" variants={item}>
            <motion.button
              className="sm-hero-cta-main"
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={onRegister}
            >
              Empieza gratis
            </motion.button>
            <motion.button
              className="sm-hero-cta-sec"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => document.getElementById("sm-how")?.scrollIntoView({ behavior: "smooth" })}
            >
              ¿Cómo funciona?
            </motion.button>
          </motion.div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          style={{ position: "relative" }}
        >
          <Carousel />
          <motion.div
            className="sm-hero-bubble"
            initial={{ opacity: 0, scale: 0.6, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 1.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <CheckCircle2 size={16} />
            Toma confirmada · 08:00
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
