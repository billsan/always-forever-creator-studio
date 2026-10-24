import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/index.js";

test("template catalog contains the twelve original starter templates", async () => {
  const response = await worker.fetch(new Request("https://studio.example/api/templates"), {});
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.templates.length, 12);
  assert.deepEqual(
    body.templates.map((template) => template.name),
    [
      "Gentle Light", "Garden Legacy", "Faithful Journey",
      "Ivory Promise", "Garden Romance", "Golden Vows",
      "Bright Years", "Milestone Celebration",
      "Our Golden Story", "Then and Now",
      "Life in Color", "Elegant Celebration"
    ]
  );
  for (const template of body.templates) {
    assert.equal(template.sceneCount, 7);
    assert.equal(template.colors.length, 3);
    assert.ok(template.aspectRatios.includes("16:9"));
    assert.ok(template.summary.length > 20);
    assert.ok(template.effectPack);
  }
  assert.equal(new Set(body.templates.map((template) => template.effectPack)).size, 12);
  assert.equal(body.templates.find((template) => template.id === "gentle-light").defaultEffect, "gentle-light");
});
