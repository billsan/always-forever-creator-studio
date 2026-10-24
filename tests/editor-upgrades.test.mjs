import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const app = await readFile(new URL("../public/app.js", import.meta.url), "utf8");
const html = await readFile(new URL("../public/index.html", import.meta.url), "utf8");
const css = await readFile(new URL("../public/styles.css", import.meta.url), "utf8");
const breakthroughCss = await readFile(new URL("../public/cinematic-breakthrough.css", import.meta.url), "utf8");

test("mobile audio uses the supported muted property before timed activation", () => {
  assert.match(app, /audio\.muted = start > 0/);
  assert.match(app, /audio\.muted = false/);
});

test("text supports direct pointer placement with normalized coordinates", () => {
  assert.match(app, /function beginTextDrag/);
  assert.match(app, /item\.position = "custom"/);
  assert.match(css, /\.canvas-overlay-text\.position-custom/);
});

test("touch-friendly slide ordering and photo restoration controls are present", () => {
  assert.match(html, /id="move-item-earlier"/);
  assert.match(html, /id="move-item-later"/);
  assert.match(html, /id="item-photo-restore"/);
  assert.match(app, /function applyPhotoRestore/);
});

test("captions and overlay words have transparent backgrounds", () => {
  assert.match(css, /\.canvas-caption\{background:transparent!important/);
  assert.match(css, /\.canvas-overlay-text\{background:transparent!important/);
});

test("version 1 supports brightness, per-slide frames, and multi-photo layouts", () => {
  assert.match(html, /id="item-photo-brightness"/);
  assert.match(html, /id="item-frame-style"/);
  assert.match(html, /data-add-collage="2"/);
  assert.match(html, /data-add-collage="4"/);
  assert.match(app, /function addCollage/);
  assert.match(app, /item\.type === "collage"/);
});

test("mobile audio synchronization does not repeatedly seek a playing track", () => {
  assert.doesNotMatch(app, /Math\.abs\(audio\.currentTime - expected\)/);
  assert.match(app, /if \(!track\.active\)/);
});

test("preview duration includes audio and timed text beyond the visual track", () => {
  assert.match(app, /const previewDuration = \(\) => Math\.max/);
  assert.match(app, /filter\(\(item\) => item\.type === "audio"\)/);
  assert.match(app, /elapsed >= previewDuration\(\)/);
});

test("clean photo defaults, categorized motion uploads, and cinematic actions are available", () => {
  assert.match(app, /cinematicAction: "none"/);
  assert.match(app, /selected\.motionBackground = \{ type: "none" \}/);
  assert.match(app, /motionCategories/);
  assert.match(html, /id="motion-category-filter"/);
  assert.match(html, /value="cloud-reveal"/);
  assert.match(html, /id="clear-slide-styling"/);
});

test("dramatic scene breakthrough actions are available by occasion", () => {
  assert.match(html, /value="cloud-breakthrough"/);
  assert.match(html, /value="garden-breakthrough"/);
  assert.match(html, /value="confetti-breakthrough"/);
  assert.match(html, /value="golden-breakthrough"/);
  assert.match(app, /particleCount = action\.includes\("breakthrough"\)/);
  assert.match(breakthroughCss, /@keyframes aafPhotoBreakthrough/);
  assert.match(breakthroughCss, /@keyframes aafBreakParticles/);
});

test("photo preparation and paid release foundations are present", () => {
  assert.match(html, /data-panel="prep"/);
  assert.match(html, /id="remove-photo-background"/);
  assert.match(html, /id="prep-consent"/);
  assert.match(app, /removeSelectedPhotoBackground/);
  assert.match(html, /data-panel="release"/);
  assert.match(app, /project\.entitlement\?\.paid === true/);
  assert.match(app, /navigator\.share/);
});
