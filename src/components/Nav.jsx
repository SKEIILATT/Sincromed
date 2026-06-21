import { useEffect, useState } from "react";
import { motion } from "motion/react";
import logotipo from "../assets/logotipo.png";

export default function Nav({ onLogin, onRegister }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.nav
      className={"sm-nav" + (scrolled ? " scrolled" : "")}
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="sm-nav-logo">
        <img src={logotipo} alt="SincroMed" />
      </div>
      <div className="sm-nav-actions">
        <motion.button className="sm-btn-ghost" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={onLogin}>
          Iniciar sesión
        </motion.button>
        <motion.button className="sm-btn-primary" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={onRegister}>
          Registrarse
        </motion.button>
      </div>
    </motion.nav>
  );
}
