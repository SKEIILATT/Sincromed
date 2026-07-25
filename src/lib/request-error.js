export const SESSION_EXPIRED_MESSAGE =
  "Tu sesión venció. Inicia sesión nuevamente para continuar.";

export function requestErrorMessage(data, fallback, status = 0) {
  const message = data?.error || data?.message || data?.details || "";
  const isExpiredSession =
    status === 401 ||
    /invalid jwt|jwt.*expired|token.*expired|invalid claims|unable to parse or verify signature/i.test(
      message,
    );

  return isExpiredSession ? SESSION_EXPIRED_MESSAGE : message || fallback;
}
