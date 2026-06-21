import { useState } from "react";
import { AnimatePresence } from "motion/react";
import { Toaster } from "sileo";
import "sileo/styles.css";
import "./App.css";
import Landing from "./components/Landing";
import AuthModal from "./components/AuthModal";
import AppShell from "./components/AppShell";
import WelcomeBanner from "./components/WelcomeBanner";
import { getSession, clearSession } from "./lib/api";

const WELCOME_DURATION = 3000;

export default function App() {
  const [modal, setModal] = useState(null); // "login" | "register" | null
  const [user, setUser] = useState(getSession);
  const [welcome, setWelcome] = useState("");

  function handleSuccess(u) {
    setUser(u);
    setModal(null);
    setWelcome(`Bienvenido, ${u.name.split(" ")[0]}`);
    setTimeout(() => setWelcome(""), WELCOME_DURATION);
  }
  function handleLogout() { clearSession(); setUser(null); }

  return (
    <>
      <Toaster position="bottom-right" theme="dark" options={{ fill: "#FFFFFF", roundness: 16 }} />
      <AnimatePresence>{welcome && <WelcomeBanner key="welcome" message={welcome} />}</AnimatePresence>
      {user ? (
        <AppShell user={user} onLogout={handleLogout} />
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
