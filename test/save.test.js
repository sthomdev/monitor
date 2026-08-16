import assert from "node:assert/strict";
import test from "node:test";
import { parseSaveText, summarizeSave, validateSave } from "../src/save.js";

const validSave = {
  version: 2,
  stage: 12,
  difficulty: 1,
  gold: 500,
  party: ["m1"],
  monsters: {
    m1: {
      id: "m1",
      speciesId: "slime",
      level: 10,
      rarity: "rare",
      awakening: 1,
      job: "fighter",
      equipment: [],
      equippedSkills: ["slime_hit"],
      iv: { atk: 1.1, hp: 1, crit: 1, spd: 1, def: 1 },
    },
  },
};

test("parseSaveText accepts exported JSON and nested localStorage JSON", () => {
  assert.deepEqual(parseSaveText(JSON.stringify(validSave)), validSave);
  assert.deepEqual(parseSaveText(JSON.stringify(JSON.stringify(validSave))), validSave);
});

test("validateSave checks version and party references", () => {
  assert.deepEqual(validateSave(validSave), []);
  assert.match(validateSave({ version: 9, party: ["missing"], monsters: {} }).join("; "), /unsupported|missing/);
});

test("summarizeSave exposes combat-relevant party fields", () => {
  assert.deepEqual(summarizeSave(validSave).party[0], {
    id: "m1",
    speciesId: "slime",
    level: 10,
    rarity: "rare",
    awakening: 1,
    job: "fighter",
    equipmentCount: 0,
    equippedSkills: ["slime_hit"],
    iv: { atk: 1.1, hp: 1, crit: 1, spd: 1, def: 1 },
  });
});
