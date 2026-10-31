import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const worker = readFileSync(new URL("../src/index.js", import.meta.url), "utf8");
const app = readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
const html = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
const wrangler = readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8");

test("Shotstack rendering uses a secret, signed source URLs, and private R2 output", () => {
  assert.match(worker, /env\.SHOTSTACK_API_KEY/);
  assert.doesNotMatch(worker, /x-api-key["']?\s*:\s*["'][A-Za-z0-9_-]{20}/);
  assert.match(worker, /signedRenderMediaUrl/);
  assert.match(worker, /destinations:\s*\[\s*\{\s*provider:\s*"shotstack",\s*exclude:\s*true\s*\}\s*\]/);
  assert.match(worker, /persistCompletedRender/);
  assert.match(worker, /env\.MEDIA\.put\(stored, provider\.body/);
  assert.match(wrangler, /"\/render-media\/\*"/);
  assert.match(wrangler, /"SHOTSTACK_ENVIRONMENT":\s*"v1"/);
});

test("customers can poll, privately download, and create an unlisted share page with QR", () => {
  assert.match(app, /pollRenderStatus/);
  assert.match(worker, /"\/final\/"/);
  assert.match(worker, /sharedProject/);
  assert.match(worker, /QRCode\.toString/);
  assert.match(html, /id="share-qr"/);
  assert.match(html, /id="copy-share-link"/);
});

test("administrators can render and release an existing test project", () => {
  assert.match(worker, /item\.entitlement = \{ \.\.\.\(item\.entitlement \|\| \{\}\), paid: true, administrator: true/);
});
