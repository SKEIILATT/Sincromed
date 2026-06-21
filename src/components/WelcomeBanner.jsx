import { motion } from "motion/react";
import { CheckCircle2 } from "lucide-react";

export default function WelcomeBanner({ message }) {
  return (
    <motion.div
      className="sm-welcome-banner"
      initial={{ y: "-100%" }}
      animate={{ y: 0 }}
      exit={{ y: "-100%" }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <CheckCircle2 size={17} />
      <span>{message}</span>
    </motion.div>
  );
}
