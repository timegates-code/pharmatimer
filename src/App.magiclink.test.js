// SENTINEL_M2A_MAGIC_LINK tests -- par.22.191 (magic link E-1-alt).
// Pure-helper tests, pattern App.autoclear.test.js: no DOM, no mocks of
// location / localStorage / reload. The impure shell inside LoginGate is a
// thin wrapper around these decision cores.
// Mandated cases (pre-frozen prompt par.191): valid hash / absent hash /
// malformed hash / token already stored (precedence, ratified Q1=A).
import { describe, it, expect } from "vitest";
import { parseMagicLinkToken, loginGateAction } from "./App.jsx";

// Same charset/length shape as the real backend token_plain (43 url-safe chars);
// never a real token.
const VALID = "Ab3-_".repeat(8) + "Xy_";

describe("parseMagicLinkToken (M2a fragment parsing)", () => {
  it("extracts a valid url-safe token from '#token=<tok>'", () => {
    expect(VALID).toHaveLength(43);
    expect(parseMagicLinkToken(`#token=${VALID}`)).toBe(VALID);
  });

  it("returns null when the hash is absent or empty", () => {
    expect(parseMagicLinkToken("")).toBeNull();
    expect(parseMagicLinkToken(undefined)).toBeNull();
    expect(parseMagicLinkToken(null)).toBeNull();
  });

  it("returns null on malformed hashes (Q3=A: total no-op)", () => {
    expect(parseMagicLinkToken("#token=")).toBeNull();
    expect(parseMagicLinkToken("#altro")).toBeNull();
    expect(parseMagicLinkToken("#token=short-tok")).toBeNull();
    expect(parseMagicLinkToken(`#token=${VALID}&extra=1`)).toBeNull();
    expect(parseMagicLinkToken(`#token=${VALID.slice(0, 40)}%2F`)).toBeNull();
    expect(parseMagicLinkToken(`token=${VALID}`)).toBeNull();
    expect(parseMagicLinkToken(`#Token=${VALID}`)).toBeNull();
  });
});

describe("loginGateAction (M2a gate decision core)", () => {
  it("applies the magic token when the fragment is valid and no token is stored", () => {
    expect(loginGateAction(true, `#token=${VALID}`, false)).toBe("apply-magic");
  });

  it("fragment OVERRIDES a stored token (Q1=A, remote regeneration runbook 5.4)", () => {
    expect(loginGateAction(true, `#token=${VALID}`, true)).toBe("apply-magic");
  });

  it("shows LoginDialog when API repo is active with no fragment and no stored token", () => {
    expect(loginGateAction(true, "", false)).toBe("show-login");
    expect(loginGateAction(true, "#altro", false)).toBe("show-login");
  });

  it("passes when a token is already stored and no fragment is present", () => {
    expect(loginGateAction(true, "", true)).toBe("pass");
    expect(loginGateAction(true, "#altro", true)).toBe("pass");
  });

  it("is a total no-op outside API repo mode, even with a valid fragment", () => {
    expect(loginGateAction(false, `#token=${VALID}`, false)).toBe("pass");
    expect(loginGateAction(false, "", true)).toBe("pass");
  });
});
