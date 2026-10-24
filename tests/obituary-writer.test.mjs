import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const worker = fs.readFileSync(new URL("../src/index.js", import.meta.url), "utf8");
const app = fs.readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
const html = fs.readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
const wrangler = fs.readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8");
const pkg = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8"));

test("v1.7.6.1 exposes the complete obituary writer", () => {
  assert.equal(pkg.version, "1.7.6.1");
  for (const label of ["AI Obituary Writer", "Write from memories", "Traditional", "Warm &amp; Personal", "Celebration of Life", "Faith-Based", "Short Newspaper Style", "Create Memorial Video Script", "Memorial QR Code", "Download QR Code", "Print QR Code"]) assert.match(html, new RegExp(label));
});

test("AI calls remain server-side and project-scoped", () => {
  assert.match(worker, /OPENAI_API_KEY/);
  assert.match(worker, /https:\/\/api\.openai\.com\/v1\/responses/);
  assert.match(worker, /parts\[3\] === "obituary"/);
  assert.doesNotMatch(app, /OPENAI_API_KEY|api\.openai\.com/);
});

test("obituary and narration persist through existing project saves", () => {
  assert.match(worker, /project\.obituary =/);
  assert.match(worker, /saveProject\(env, project\)/);
  assert.match(app, /obituary: project\.obituary/);
  assert.match(app, /obituary\/video-script/);
});


test("obituary QR share page is permanent and project-scoped", () => {
  assert.match(worker, /parts\[3\] === "obituary" && parts\[4\] === "share"/);
  assert.match(worker, /\/memorial\//);
  assert.match(worker, /QRCode\.toString/);
  assert.match(worker, /sharedMemorialProject/);
  assert.match(app, /ensureMemorialShare/);
  assert.match(app, /copyMemorialLink/);
  assert.match(app, /printMemorialQr/);
});


test("standalone obituary route and memorial worker routing are present", () => {
  assert.match(worker, /obituaryWriterPage/);
  assert.match(worker, /\/obituary-writer/);
  assert.match(wrangler, /\/memorial\/\*/);
  assert.match(wrangler, /\/obituary-writer/);
});


test("v1.7.4 adds social memorial sharing in both obituary writers", () => {
  for (const label of ["Share QR Image", "Facebook", "WhatsApp", "Email"]) assert.match(html, new RegExp(label));
  assert.match(app, /shareMemorialQrImage/);
  assert.match(app, /memorialQrSocialFile/);
  assert.match(app, /facebook\.com\/sharer/);
  assert.match(app, /wa\.me/);
  assert.match(worker, /share-qr-image/);
  assert.match(worker, /socialQrFile/);
});


test("v1.7.4.2 keeps standalone social email newlines escaped inside the generated script", () => {
  assert.match(worker, /socialText\(\)\+'\\\\n\\\\n'\+d\.memorialUrl/);
  assert.doesNotMatch(worker, /socialText\(\)\+'\n\n'\+d\.memorialUrl/);
});


test("v1.7.6.1 keeps mobile share controls on the public memorial page", () => {
  for (const label of ["Share This Memorial", "More Share Options", "Text Message", "Download QR"]) assert.match(worker, new RegExp(label));
  assert.match(worker, /navigator\.share/);
  assert.match(worker, /memorial-facebook/);
  assert.match(worker, /memorial-whatsapp/);
  assert.match(worker, /memorial-sms/);
  assert.match(html, /share-memorial-more/);
  assert.match(app, /shareMemorialMore/);
});

test("v1.7.6.1 gives administrators a clear new obituary workflow", () => {
  assert.match(worker, /id="new-obituary"/);
  assert.match(worker, /Clear \/ New Obituary/);
  assert.match(worker, /function newObituary/);
  assert.match(worker, /localStorage\.removeItem\(DRAFT_KEY\)/);
  assert.match(worker, /project\?\.entitlement\?\.administrator/);
  assert.match(worker, /title:'New Obituary'/);
});


test("v1.7.6.1 supports one memorial QR with obituary and livestream destinations", () => {
  assert.match(worker, /livestreamUrl/);
  assert.match(worker, /memorialLinksPage/);
  assert.match(worker, /memorialLinksPage/);
  assert.match(worker, /Watch Livestream/);
  assert.match(worker, /View Obituary &amp; Memorial/);
  assert.match(html, /obit-livestream-url/);
  assert.match(app, /obit-livestream-url/);
});


test("v1.7.6.1 QR hotfix uses direct memorial URL for QR generation", () => {
  const worker = fs.readFileSync(new URL("../src/index.js", import.meta.url), "utf8");
  assert.match(worker, /QRCode\.toString\(`\$\{url\.origin\}\/memorial\/\$\{token\}`/);
  assert.doesNotMatch(worker, /QRCode\.toString\(`\$\{url\.origin\}\/memorial\/\$\{token\}\/links`/);
});
