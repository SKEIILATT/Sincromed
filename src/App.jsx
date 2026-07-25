import { useState, useCallback, useEffect } from "react";
import { AnimatePresence } from "motion/react";
import "./App.css";
import Landing from "./components/Landing";
import AuthModal from "./components/AuthModal";
import AppShell from "./components/AppShell";
import WelcomeBanner from "./components/WelcomeBanner";
import Notifications from "./components/Notifications";
import { getStoredUser, restoreSession, signOut } from "./lib/auth";

const WELCOME_DURATION = 3000;
const DEMO_MODE = import.meta.env.DEV && import.meta.env.VITE_DEMO_MODE === "true";
const DEMO_USER = {
  id: "demo-user",
  name: "María García",
  email: "maria@sincromed.demo",
  phone: "593987654321",
};

export default function App() {
  const [modal, setModal] = useState(() => (
    new URLSearchParams(window.location.search).has("invite") ? "register" : null
  ));
  const [user, setUser] = useState(() => DEMO_MODE ? DEMO_USER : getStoredUser());
  const [restoringSession, setRestoringSession] = useState(!DEMO_MODE);
  const [welcome, setWelcome] = useState("");
  const [notifs, setNotifs] = useState([]);

  const notify = useCallback((message, type = "success") => {
    const id = Date.now() + Math.random();
    setNotifs((prev) => [...prev, { id, message, type }]);
  }, []);

  const dismiss = useCallback((id) => {
    setNotifs((prev) => prev.filter((n) => n.id !== id));
  }, []);

  useEffect(() => {
    if (DEMO_MODE) return undefined;
    let active = true;
    let initialRestore = true;

    async function syncSession() {
      try {
        const restoredUser = await restoreSession();
        if (!active) return;
        setUser(restoredUser);
        if (!restoredUser && !initialRestore) {
          notify("Tu sesión terminó. Inicia sesión nuevamente.", "error");
        }
      } catch (error) {
        if (active) {
          setUser(null);
          notify(error.message || "No se pudo restaurar la sesión.", "error");
        }
      } finally {
        if (active && initialRestore) {
          initialRestore = false;
          setRestoringSession(false);
        }
      }
    }

    syncSession();
    const interval = window.setInterval(syncSession, 5 * 60 * 1000);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") syncSession();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      active = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [notify]);

  function handleSuccess(u) {
    setUser(u);
    setModal(null);
    setWelcome(`Bienvenido, ${u.name.split(" ")[0]}`);
    setTimeout(() => setWelcome(""), WELCOME_DURATION);
  }
  function handleLogout() {
    setUser(null);
    signOut();
  }

  if (restoringSession) {
    return <div className="sm-session-loading">Cargando SincroMed…</div>;
  }

  return (
    <>
      <AnimatePresence>{welcome && <WelcomeBanner key="welcome" message={welcome} />}</AnimatePresence>
      <Notifications items={notifs} onDismiss={dismiss} />
      {user ? (
        <AppShell user={user} onLogout={handleLogout} notify={notify} />
      ) : (
        <Landing onLogin={() => setModal("login")} onRegister={() => setModal("register")} />
      )}
      <AnimatePresence>
        {modal && !user && (
          <AuthModal key="auth" mode={modal} onClose={() => setModal(null)} onSuccess={handleSuccess} />
        )}
      </AnimatePresence>
    </>
  );
}
