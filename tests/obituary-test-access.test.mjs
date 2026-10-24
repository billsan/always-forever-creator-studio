import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const worker = readFileSync(new URL("../src/index.js", import.meta.url), "utf8");
const wrangler = readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8");
const setup = readFileSync(new URL("../connect-obituary-test-access.cmd", import.meta.url), "utf8");

test("secure obituary test access is private and does not remove WooCommerce", () => {
  assert.match(worker, /OBITUARY_TEST_KEY/);
  assert.match(worker, /\/test-obituary/);
  assert.match(worker, /\/auth\/test-obituary/);
  assert.match(worker, /request\.formData\(\)/);
  assert.match(worker, /signStudioToken/);
  assert.match(worker, /role: "administrator"/);
  assert.match(worker, /exp: issued \+ 2 \* 60 \* 60/);
  assert.match(worker, /HttpOnly; Secure; SameSite=Lax/);
  assert.match(worker, /\/auth\/woocommerce/);
  assert.match(wrangler, /"\/test-obituary"/);
  assert.match(setup, /wrangler secret put OBITUARY_TEST_KEY/);
});
