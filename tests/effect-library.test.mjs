import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("effect library contains thirty-six unique per-slide effects", async () => {
  const source = await readFile(new URL("../public/app.js", import.meta.url), "utf8");
  const catalog = source.slice(source.indexOf("const effectPacks = ["), source.indexOf("];", source.indexOf("const effectPacks = [")) + 2);
  const ids = [...catalog.matchAll(/\{ id: "([^"]+)"/g)].map((match) => match[1]);
  assert.equal(ids.length, 36);
  assert.equal(new Set(ids).size, 36);
});

test("built-in motion library retains only Heavenly Clouds", async () => {
  const source = await readFile(new URL("../public/app.js", import.meta.url), "utf8");
  const start = source.indexOf("const motionBackgrounds = [");
  const catalog = source.slice(start, source.indexOf("];", start) + 2);
  const ids = [...catalog.matchAll(/\{ id: "([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(ids, ["heavenly-clouds"]);
});
