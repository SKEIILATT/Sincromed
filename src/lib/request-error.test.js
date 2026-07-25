import test from "node:test";
import assert from "node:assert/strict";
import {
  requestErrorMessage,
  SESSION_EXPIRED_MESSAGE,
} from "./request-error.js";

test("replaces expired JWT details with a user-facing session message", () => {
  const message = requestErrorMessage({
    error:
      "invalid JWT: unable to parse or verify signature, token has invalid claims: token is expired",
  });

  assert.equal(message, SESSION_EXPIRED_MESSAGE);
});

test("treats an unauthorized response as an expired session", () => {
  assert.equal(
    requestErrorMessage({ message: "Unauthorized" }, "Fallback", 401),
    SESSION_EXPIRED_MESSAGE,
  );
});

test("keeps useful non-authentication API errors", () => {
  assert.equal(
    requestErrorMessage({ error: "Dose event was not found" }, "Fallback", 404),
    "Dose event was not found",
  );
});
