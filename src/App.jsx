import { useState, useCallback } from "react";
import { AnimatePresence } from "motion/react";
import "./App.css";
import Landing from "./components/Landing";
import AuthModal from "./components/AuthModal";
import AppShell from "./components/AppShell";
import WelcomeBanner from "./components/WelcomeBanner";
import Notifications from "./components/Notifications";
import { getSession, clearSession } from "./lib/api";

const WELCOME_DURATION = 3000;

export default function App() {
  const [modal, setModal] = useState(null);
  const [user, setUser] = useState(getSession);
  const [welcome, setWelcome] = useState("");
  const [notifs, setNotifs] = useState([]);

  const notify = useCallback((message, type = "success") => {
    const id = Date.now() + Math.random();
    setNotifs((prev) => [...prev, { id, message, type }]);
  }, []);

  const dismiss = useCallback((id) => {
    setNotifs((prev) => prev.filter((n) => n.id !== id));
  }, []);

  function handleSuccess(u) {
    setUser(u);
    setModal(null);
    setWelcome(`Bienvenido, ${u.name.split(" ")[0]}`);
    setTimeout(() => setWelcome(""), WELCOME_DURATION);
  }
  function handleLogout() { clearSession(); setUser(null); }

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
