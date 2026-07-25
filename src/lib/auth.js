import { parseAuthCallback } from "./auth-callback";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;
const SESSION_KEY = "sm_auth_session";

function ensureConfigured() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error("La autenticación no está configurada.");
  }
}

function authError(data, fallback) {
  const message = data?.msg || data?.message || data?.error_description || data?.error;
  if (!message) return fallback;
  if (/invalid login credentials/i.test(message)) return "Correo o contraseña incorrectos.";
  if (/user already registered/i.test(message)) return "Este correo ya está registrado.";
  if (/email not confirmed/i.test(message)) return "Confirma tu correo antes de iniciar sesión.";
  if (/password should be at least/i.test(message)) return "La contraseña debe tener al menos 6 caracteres.";
  return message;
}

async function authRequest(path, { body, token } = {}) {
  ensureConfigured();
  const res = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(authError(data, "No se pudo completar la autenticación."));
  return data;
}

function readStoredSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}

function storeSession(session) {
  if (!session?.access_token || !session?.user) return;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function toAppUser(session) {
  const authUser = session?.user;
  if (!authUser) return null;
  const metadata = authUser.user_metadata || {};
  return {
    id: authUser.id,
    email: authUser.email || "",
    name: metadata.full_name || authUser.email?.split("@")[0] || "Usuario",
    phone: metadata.phone || "",
  };
}

async function consumeAuthCallback() {
  const callback = parseAuthCallback(window.location.hash);
  if (!callback) return null;

  ensureConfigured();
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${callback.accessToken}`,
    },
  });
  const user = await response.json().catch(() => null);
  if (!response.ok || !user?.id) {
    throw new Error(authError(user, "No se pudo confirmar la sesión."));
  }

  const session = {
    access_token: callback.accessToken,
    refresh_token: callback.refreshToken,
    expires_at: Math.floor(Date.now() / 1000) + callback.expiresIn,
    user,
  };
  storeSession(session);
  window.history.replaceState(
    {},
    "",
    `${window.location.pathname}${window.location.search}`,
  );
  return session;
}

export async function registerUser({ name, email, phone, pass }) {
  const redirectTo = encodeURIComponent(
    `${window.location.origin}${window.location.pathname}${window.location.search}`,
  );
  const data = await authRequest(`signup?redirect_to=${redirectTo}`, {
    body: {
      email: email.trim().toLowerCase(),
      password: pass,
      data: {
        full_name: name.trim(),
        phone,
      },
    },
  });

  if (!data.access_token) {
    return { requiresConfirmation: true, email: email.trim().toLowerCase() };
  }

  storeSession(data);
  return { user: toAppUser(data), requiresConfirmation: false };
}

export async function loginUser({ email, pass }) {
  const session = await authRequest("token?grant_type=password", {
    body: {
      email: email.trim().toLowerCase(),
      password: pass,
    },
  });
  storeSession(session);
  return toAppUser(session);
}

export function getStoredUser() {
  return toAppUser(readStoredSession());
}

export function getAccessToken() {
  return readStoredSession()?.access_token || "";
}

export async function restoreSession() {
  const callbackSession = await consumeAuthCallback();
  if (callbackSession) return toAppUser(callbackSession);

  const session = readStoredSession();
  if (!session) return null;

  const expiresAt = Number(session.expires_at || 0);
  if (expiresAt > Math.floor(Date.now() / 1000) + 60) {
    return toAppUser(session);
  }

  if (!session.refresh_token) {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }

  try {
    const refreshed = await authRequest("token?grant_type=refresh_token", {
      body: { refresh_token: session.refresh_token },
    });
    storeSession(refreshed);
    return toAppUser(refreshed);
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export async function signOut() {
  const session = readStoredSession();
  localStorage.removeItem(SESSION_KEY);
  if (!session?.access_token) return;
  try {
    await authRequest("logout", { token: session.access_token });
  } catch {
    // Local logout is authoritative even when the remote session already expired.
  }
}
