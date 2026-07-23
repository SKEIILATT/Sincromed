import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, XCircle, X } from "lucide-react";

export default function Notifications({ items, onDismiss }) {
  return (
    <div className="sm-notif-stack">
      <AnimatePresence>
        {items.map((n) => (
          <NotifItem key={n.id} item={n} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function NotifItem({ item, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(() => onDismiss(item.id), 4000);
    return () => clearTimeout(t);
  }, [item.id, onDismiss]);

  const isSuccess = item.type === "success";

  return (
    <motion.div
      className={`sm-notif ${isSuccess ? "sm-notif--success" : "sm-notif--error"}`}
      initial={{ opacity: 0, x: 60, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.95 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      layout
    >
      <div className="sm-notif-icon">
        {isSuccess
          ? <CheckCircle2 size={18} strokeWidth={2.5} />
          : <XCircle size={18} strokeWidth={2.5} />}
      </div>
      <span className="sm-notif-msg">{item.message}</span>
      <button className="sm-notif-close" onClick={() => onDismiss(item.id)}>
        <X size={14} />
      </button>
    </motion.div>
  );
}
