import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const worker = readFileSync(new URL("../src/index.js", import.meta.url), "utf8");
const app = readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
const schema = readFileSync(new URL("../schema.sql", import.meta.url), "utf8");
const admin = readFileSync(new URL("../public/safe-music-admin.html", import.meta.url), "utf8");

test("safe music administration is secret-protected and rights-aware", () => {
  assert.match(worker, /MUSIC_ADMIN_KEY/);
  assert.match(worker, /aaf-secret-check/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS safe_music_tracks/);
  assert.match(admin, /may sublicense this track/);
  assert.match(admin, /Content ID policy/);
});

test("media deletion is visible and refuses assets still in use", () => {
  assert.match(app, /data-delete-asset/);
  assert.match(worker, /assetUses\(project, asset\.id\)/);
  assert.match(worker, /before deleting it from Media/);
});
