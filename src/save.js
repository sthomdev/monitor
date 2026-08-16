import fs from "node:fs/promises";

export const SAVE_KEY = "taskbar-idle-rpg-save";
export const BACKUP_KEY = "taskbar-idle-rpg-save-backup";
export const SAVE_VERSION = 2;

function parseJsonText(text, source) {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Invalid JSON in ${source}: ${error.message}`);
  }
}

export function parseSaveText(text, source = "save") {
  const parsed = parseJsonText(text, source);
  const state = typeof parsed === "string" ? parseJsonText(parsed, source) : parsed;
  if (!state || typeof state !== "object" || Array.isArray(state)) {
    throw new Error(`${source} does not contain a state object`);
  }
  return state;
}

export async function readSave(filePath) {
  const text = await fs.readFile(filePath, "utf8");
  return parseSaveText(text, filePath);
}

export function validateSave(state) {
  const errors = [];
  if (state.version !== SAVE_VERSION && state.version !== 1) {
    errors.push(`unsupported save version: ${state.version ?? "missing"}`);
  }
  if (!Array.isArray(state.party) || state.party.length === 0) {
    errors.push("party must be a non-empty array");
  }
  for (const id of state.party ?? []) {
    if (!state.monsters?.[id]) errors.push(`party member is missing: ${id}`);
  }
  return errors;
}

function monsterSummary(monster) {
  return {
    id: monster.id ?? null,
    speciesId: monster.speciesId ?? null,
    level: monster.level ?? null,
    rarity: monster.rarity ?? null,
    awakening: monster.awakening ?? 0,
    job: monster.job ?? null,
    equipmentCount: Array.isArray(monster.equipment) ? monster.equipment.length : 0,
    equippedSkills: monster.equippedSkills ?? [],
    iv: monster.iv ?? {},
  };
}

export function summarizeSave(state) {
  const party = (state.party ?? []).map((id) => monsterSummary(state.monsters?.[id] ?? { id }));
  return {
    version: state.version ?? null,
    stage: state.stage ?? null,
    difficulty: state.difficulty ?? null,
    gold: state.gold ?? null,
    monsterCount: Object.keys(state.monsters ?? {}).length,
    party,
  };
}
