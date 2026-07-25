export function parseAuthCallback(hash = "") {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const accessToken = params.get("access_token") || "";
  if (!accessToken) return null;

  return {
    accessToken,
    refreshToken: params.get("refresh_token") || "",
    expiresIn: Number(params.get("expires_in") || 3600),
  };
}
