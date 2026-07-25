import test from "node:test";
import assert from "node:assert/strict";
import { parseAuthCallback } from "./auth-callback.js";

test("parseAuthCallback reads an implicit Supabase session", () => {
  assert.deepEqual(
    parseAuthCallback("#access_token=access&refresh_token=refresh&expires_in=7200&type=signup"),
    {
      accessToken: "access",
      refreshToken: "refresh",
      expiresIn: 7200,
    },
  );
  assert.equal(parseAuthCallback("#error=access_denied"), null);
});
