// magicLink.test.js -- M2b-2 (par.22.194): normalizePastedToken +
// module-extraction guard. Pure helpers, no DOM (pattern
// App.magiclink.test.js). SENTINEL_M2B2_MAGICLINK_TESTS
import { describe, it, expect } from "vitest";
import { parseMagicLinkToken, normalizePastedToken } from "./magicLink.js";

// 44-char URL-safe token (backend token_plain is empirically 43 chars of
// the same charset; anything >= 20 passes the shared floor).
const VALID = "abcDEF123_-".repeat(4);
const LINK = "https://marketreader-server.taila127de.ts.net/#token=" + VALID;

describe("normalizePastedToken (M2b-2 paste-tolerant)", () => {
  it("accepts a bare token unchanged", () => {
    expect(normalizePastedToken(VALID)).toBe(VALID);
  });

  it("trims whitespace and newlines around a bare token", () => {
    expect(normalizePastedToken("  " + VALID + "\n")).toBe(VALID);
  });

  it("extracts the token from a full magic link", () => {
    expect(normalizePastedToken(LINK)).toBe(VALID);
  });

  it("extracts the token from a full magic link with trailing whitespace", () => {
    expect(normalizePastedToken(LINK + " \n")).toBe(VALID);
  });

  it("extracts the token from a bare '#token=' fragment", () => {
    expect(normalizePastedToken("#token=" + VALID)).toBe(VALID);
  });

  it("tolerates leading text before the link (pasted chat line)", () => {
    expect(normalizePastedToken("Ecco il link: " + LINK)).toBe(VALID);
  });

  it("rejects trailing text after the token (dirty quoted copy, par.22.192)", () => {
    expect(normalizePastedToken(LINK + " grazie")).toBeNull();
  });

  it("rejects a fragment that is not #token=", () => {
    expect(normalizePastedToken("https://host/#altro")).toBeNull();
  });

  it("rejects a too-short bare token (floor 20)", () => {
    expect(normalizePastedToken("short-tok")).toBeNull();
  });

  it("rejects empty and non-string input", () => {
    expect(normalizePastedToken("")).toBeNull();
    expect(normalizePastedToken(undefined)).toBeNull();
    expect(normalizePastedToken(null)).toBeNull();
    expect(normalizePastedToken(42)).toBeNull();
  });
});

describe("parseMagicLinkToken (module extraction guard, M2b-2)", () => {
  it("is importable from magicLink.js and parses a valid fragment", () => {
    expect(parseMagicLinkToken("#token=" + VALID)).toBe(VALID);
  });

  it("still rejects malformed fragments", () => {
    expect(parseMagicLinkToken("token=" + VALID)).toBeNull();
    expect(parseMagicLinkToken("#Token=" + VALID)).toBeNull();
  });
});
