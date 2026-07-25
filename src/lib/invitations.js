export function buildInvitationLink(token, locationLike = window.location) {
  const url = new URL(locationLike.pathname || "/", locationLike.origin);
  url.searchParams.set("invite", token);
  return url.toString();
}

export function invitationTokenFromLocation(locationLike = window.location) {
  return new URLSearchParams(locationLike.search).get("invite")?.trim() || "";
}

export function clearInvitationFromLocation(locationLike = window.location) {
  const url = new URL(locationLike.href);
  url.searchParams.delete("invite");
  return `${url.pathname}${url.search}${url.hash}`;
}
