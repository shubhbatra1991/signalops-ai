import { expect, test } from "vitest";
import { buildContentSecurityPolicy, productionSecurityHeaders, readCspNonce } from "./security-headers";

const nonce = Buffer.from("security-test-nonce").toString("base64");

test("production CSP binds scripts and styles to a nonce and blocks embedding", () => {
  const policy = buildContentSecurityPolicy(nonce);
  expect(policy).toContain(`script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`);
  expect(policy).toContain(`style-src 'self' 'nonce-${nonce}'`);
  expect(policy).toContain("frame-ancestors 'none'");
  expect(policy).toContain("object-src 'none'");
  expect(policy).toContain("script-src-attr 'none'");
  expect(policy.match(/script-src [^;]+/)?.[0]).not.toContain("'unsafe-inline'");
  expect(policy).not.toContain("'unsafe-eval'");
  expect(policy).not.toContain("*");
});

test("development CSP permits only the runtime exceptions needed for local tooling", () => {
  const policy = buildContentSecurityPolicy(nonce, true);
  expect(policy.match(/script-src [^;]+/)?.[0]).toContain("'unsafe-eval'");
  expect(policy).toContain("connect-src 'self' ws: wss:");
  expect(policy).toContain("style-src-attr 'unsafe-inline'");
});

test("nonce and static response headers fail safely", () => {
  expect(readCspNonce(nonce)).toBe(nonce);
  expect(readCspNonce("bad'; script-src *")).toBeUndefined();
  expect(() => buildContentSecurityPolicy("bad nonce")).toThrow("Invalid CSP nonce");
  expect(Object.fromEntries(productionSecurityHeaders.map(({ key, value }) => [key, value]))).toMatchObject({
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-origin",
  });
});
