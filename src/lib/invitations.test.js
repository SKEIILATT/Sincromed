import test from "node:test";
import assert from "node:assert/strict";
import {
  buildInvitationLink,
  clearInvitationFromLocation,
  invitationTokenFromLocation,
} from "./invitations.js";

test("invitation helpers preserve a token through the authentication flow", () => {
  const location = {
    origin: "https://sincromed.example",
    pathname: "/",
    search: "?invite=secure-token",
    href: "https://sincromed.example/?invite=secure-token",
  };
  assert.equal(invitationTokenFromLocation(location), "secure-token");
  assert.equal(buildInvitationLink("new-token", location), "https://sincromed.example/?invite=new-token");
  assert.equal(clearInvitationFromLocation(location), "/");
});
