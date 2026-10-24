import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const worker = await readFile(new URL("../src/index.js", import.meta.url), "utf8");

test("background removal keeps its API key secret and streams output to R2", () => {
  assert.match(worker, /env\.REMOVE_BG_API_KEY/);
  assert.match(worker, /https:\/\/api\.remove\.bg\/v1\.0\/removebg/);
  assert.match(worker, /MAX_BACKGROUND_INPUT_BYTES = 22 \* 1024 \* 1024/);
  assert.match(worker, /await env\.MEDIA\.put\(outputKey, processed\.body/);
  assert.doesNotMatch(worker, /REMOVE_BG_API_KEY\s*=\s*["'][^"']+["']/);
});

test("processed cutouts are separate assets linked to their originals", () => {
  assert.match(worker, /sourceAssetId: original\.id/);
  assert.match(worker, /processing: "background-removal"/);
  assert.match(worker, /project\.assets\.push\(asset\)/);
});
