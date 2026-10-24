import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const worker = readFileSync(new URL("../src/index.js", import.meta.url), "utf8");
const app = readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
const schema = readFileSync(new URL("../schema.sql", import.meta.url), "utf8");
const html = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
const wrangler = readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8");

test("WooCommerce access uses signed, expiring server sessions", () => {
  assert.match(worker, /STUDIO_AUTH_SECRET/);
  assert.match(worker, /crypto\.subtle\.verify\("HMAC"/);
  assert.match(worker, /HttpOnly; Secure; SameSite=Lax/);
  assert.match(worker, /claims\.iss !== "alwaysandforever\.life"/);
  assert.doesNotMatch(app, /demo-customer/);
  assert.doesNotMatch(app, /X-Studio-User/);
  assert.match(wrangler, /"\/auth\/\*"/);
  assert.match(worker, /"\/api\/auth\/woocommerce"/);
});

test("administrators can open the new-project dialog while retaining existing projects", () => {
  assert.match(html, /id="new-project-button"/);
  assert.match(app, /new-project-button/);
  assert.match(app, /welcome-dialog/);
});

test("paid grants limit project creation and photo uploads while administrators bypass limits", () => {
  assert.match(schema, /CREATE TABLE IF NOT EXISTS studio_grants/);
  assert.match(worker, /session\.role !== "administrator"/);
  assert.match(worker, /projects_created < project_limit/);
  assert.match(worker, /This package includes \$\{limit\} photos/);
  assert.match(worker, /supports a video up to \$\{project\.entitlement\.minutes\} minutes/);
});
