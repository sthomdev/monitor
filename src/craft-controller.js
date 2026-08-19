import { evaluateRuntime } from "./cdp.js";

const DEFAULT_ENDPOINT = "http://127.0.0.1:9222";
const CRAFT_COST = 9;
const WAIT_MS = 150;
const VERIFY_WAIT_MS = 100;
const VERIFY_ATTEMPTS = 10;
const LOOP_INTERVAL_MS = 2_000;
const DEFAULT_MIN_ATK_PCT = 0.90;
const DEFAULT_MIN_SKILL_POWER = 0.40;
const RETRYABLE_UI_REASONS = new Set([
  "compound-tab-not-found",
  "craft-window-not-visible",
  "craft-mode-not-found",
  "auto-fill-not-found",
]);

const SNAPSHOT = `(() => {
  const debug = window.__battleDebug?.();
  const state = debug?.state;
  if (!state) return null;
  const equipped = Object.values(state.monsters ?? {})
    .flatMap((monster) => (monster.equipment ?? []).map((item) => item.id));
  const project = (item) => ({
    id: item.id,
    rarity: item.rarity,
    lv: item.lv ?? 1,
    part: item.part,
    locked: !!item.locked,
    stats: [...(item.opts ?? []), ...(item.enhances ?? [])].reduce((totals, entry) => {
      if (entry?.stat) totals[entry.stat] = (totals[entry.stat] ?? 0) + (entry.value ?? 0);
      return totals;
    }, {}),
  });
  return {
    items: (state.items ?? []).map(project),
    storage: state.settings?.cubeUseStorage === false ? [] : (state.storage ?? []).map(project),
    equipped,
  };
})()`;

function bandOf(level) {
  const bands = [
    { min: 1, max: 10 },
    { min: 10, max: 20 },
    { min: 15, max: 30 },
    { min: 20, max: 40 },
    { min: 30, max: 50 },
    { min: 40, max: 65 },
    { min: 65, max: 80 },
  ];
  const itemLevel = Math.max(1, Math.round(level ?? 1));
  for (let index = bands.length - 1; index >= 0; index -= 1) {
    if (itemLevel >= bands[index].min && itemLevel <= bands[index].max) return index;
  }
  return itemLevel > 80 ? bands.length - 1 : 0;
}

export function craftableGroupCount(snapshot, mode = "gear", thresholds = {}) {
  if (!snapshot) return [];
  const minAtkPct = thresholds.minAtkPct ?? DEFAULT_MIN_ATK_PCT;
  const minSkillPower = thresholds.minSkillPower ?? DEFAULT_MIN_SKILL_POWER;
  const equipped = new Set(snapshot.equipped ?? []);
  const groups = new Map();
  for (const item of [...(snapshot.items ?? []), ...(snapshot.storage ?? [])]) {
    const charm = item.part === "charm";
    const itemMode = charm ? "charm" : "gear";
    if (mode !== "both" && mode !== itemMode) continue;
    const protectedItem =
      (item.stats?.atkPct ?? 0) > minAtkPct && (item.stats?.skillPower ?? 0) > minSkillPower;
    if (itemMode === "gear" && protectedItem) continue;
    if (item.locked || equipped.has(item.id)) continue;
    const key = `${itemMode}|${item.rarity}|${bandOf(item.lv)}`;
    groups.set(key, { mode: itemMode, rarity: item.rarity, band: bandOf(item.lv), count: (groups.get(key)?.count ?? 0) + 1 });
  }
  return [...groups.entries()]
    .map(([key, group]) => ({ key, ...group, batches: Math.floor(group.count / CRAFT_COST) }))
    .filter((group) => group.count > 0)
    .sort((left, right) => right.count - left.count);
}

async function gameAction(expression, endpoint) {
  return evaluateRuntime(expression, endpoint, { awaitPromise: true });
}

function craftUiExpression(mode, band) {
  const modeValue = mode === "charm" ? "craftCharm" : "craft";
  return `(async () => {
    const text = (node) => node?.textContent?.replace(/\\s+/g, " ").trim() ?? "";
    const visible = (node) => {
      if (!node || node.classList.contains("hidden")) return false;
      const style = getComputedStyle(node);
      const box = node.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && box.width > 0 && box.height > 0;
    };
    const clickText = (selector, expected) => {
      const node = [...document.querySelectorAll(selector)].find((candidate) => visible(candidate) && text(candidate) === expected);
      if (!node) return false;
      node.click();
      return true;
    };
    let body = document.querySelector("#cube-body");
    if (!visible(body)) {
      const tab = document.querySelector('.bar-tab[data-win="compound"]');
      if (!tab) return { ok: false, reason: "compound-tab-not-found" };
      tab.click();
      await new Promise((resolve) => setTimeout(resolve, 100));
      body = document.querySelector("#cube-body");
    }
    if (!visible(body)) return { ok: false, reason: "craft-window-not-visible" };
    const modeSel = document.querySelector("#cube-body select.cube-band");
    if (!modeSel || ![...modeSel.options].some((option) => option.value === ${JSON.stringify(modeValue)}))
      return { ok: false, reason: "craft-mode-not-found" };
    modeSel.value = ${JSON.stringify(modeValue)};
    modeSel.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 50));
    const bandSel = [...document.querySelectorAll("#cube-body select.cube-band")]
      .find((select) => [...select.options].some((option) => option.value === ${JSON.stringify(String(band))}));
    if (!bandSel || ![...bandSel.options].some((option) => option.value === ${JSON.stringify(String(band))}))
      return { ok: false, reason: "craft-band-not-found" };
    bandSel.value = ${JSON.stringify(String(band))};
    bandSel.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 50));
    const auto = [...body.querySelectorAll("button")]
      .find((button) => ["自動入力", "Auto-fill"].includes(text(button)));
    if (!auto) return { ok: false, reason: "auto-fill-not-found" };
    auto.click();
    await new Promise((resolve) => setTimeout(resolve, 80));
    const slots = [...document.querySelectorAll("#cube-grid .cube-slot.filled:not(.result)")].length;
    if (slots !== ${CRAFT_COST}) return { ok: true, slots, crafted: false, reason: "fewer-than-nine" };
    const craft = body.querySelector(".cube-craft-btn");
    if (!craft || craft.disabled) return { ok: false, reason: "craft-button-disabled", slots };
    craft.click();
    await new Promise((resolve) => setTimeout(resolve, ${WAIT_MS}));
    return { ok: true, slots, crafted: true };
  })()`;
}

const OPEN_PENDING_CHESTS = `(() => {
  const debug = window.__battleDebug?.();
  const state = debug?.state;
  const openAll = debug?.openChestOfKind;
  if (!state || typeof openAll !== "function") return { ok: false, reason: "chest-batch-api-unavailable" };
  const before = state.chests?.length ?? 0;
  openAll(null);
  const remaining = state.chests?.length ?? 0;
  return { ok: true, opened: before - remaining, remaining };
})()`;

const ALCHEMIZE_LOW_EGGS = `(async () => {
  const text = (node) => node?.textContent?.replace(/\\s+/g, " ").trim() ?? "";
  const visible = (node) => {
    if (!node || node.classList.contains("hidden")) return false;
    const style = getComputedStyle(node);
    const box = node.getBoundingClientRect();
    return style.display !== "none" && style.visibility !== "hidden" && box.width > 0 && box.height > 0;
  };
  const debug = window.__battleDebug?.();
  const state = debug?.state;
  if (!state) return { ok: false, reason: "battle-state-unavailable" };
  const before = (state.eggs ?? []).filter((egg) => ["common", "rare"].includes(egg.rarity)).length;
  if (before === 0) return { ok: true, count: 0 };
  let body = document.querySelector("#cube-body");
  if (!visible(body)) {
    const tab = document.querySelector('.bar-tab[data-win="compound"]');
    if (!tab) return { ok: false, reason: "compound-tab-not-found" };
    tab.click();
    await new Promise((resolve) => setTimeout(resolve, 100));
    body = document.querySelector("#cube-body");
  }
  if (!visible(body)) return { ok: false, reason: "craft-window-not-visible" };
  const modeSel = body.querySelector("select.cube-band");
  if (!modeSel) return { ok: false, reason: "alchemy-mode-not-found" };
  if (modeSel.value !== "alchemy") {
    if (![...modeSel.options].some((option) => option.value === "alchemy")) return { ok: false, reason: "alchemy-mode-not-found" };
    modeSel.value = "alchemy";
    modeSel.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  body = document.querySelector("#cube-body");
  let eggButton = null;
  for (let attempt = 0; attempt < 5 && !eggButton; attempt += 1) {
    eggButton = [...(body?.querySelectorAll("button") ?? [])]
      .find((button) => visible(button) && ["コモン/レアの卵", "Common/Rare eggs"].some((label) => text(button).includes(label)));
    if (!eggButton) await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (!eggButton) return { ok: false, reason: "egg-alchemy-button-not-found" };
  if (eggButton.disabled) return { ok: false, reason: "egg-alchemy-button-disabled", count: before };
  eggButton.click();
  await new Promise((resolve) => setTimeout(resolve, 100));
  const after = (state.eggs ?? []).filter((egg) => ["common", "rare"].includes(egg.rarity)).length;
  return { ok: after === 0, count: before - after, remaining: after };
})()`;

export async function runCraftController({ endpoint = DEFAULT_ENDPOINT, maxRuns = 1, mode = "gear", confirm = false, loop = false, minAtkPct = DEFAULT_MIN_ATK_PCT, minSkillPower = DEFAULT_MIN_SKILL_POWER, log = console.log } = {}) {
  if (!confirm) throw new Error("Craft automation changes game state; rerun with --confirm to enable it");
  if (!Number.isInteger(maxRuns) || maxRuns < 1) throw new Error("maxRuns must be a positive integer");
  if (!new Set(["gear", "charm", "both"]).has(mode)) throw new Error("mode must be gear, charm, or both");

  const results = [];
  let exitReason = loop ? "stopped-by-user" : "max-runs-reached";
  for (let run = 0; loop || run < maxRuns; run += 1) {
    let chests = { ok: true, opened: 0, remaining: 0 };
    if (mode !== "charm") {
      chests = await gameAction(OPEN_PENDING_CHESTS, endpoint);
      if (!chests?.ok) {
        if (loop) {
          log(`Chest batch unavailable (${chests?.reason}); checking again in 10 seconds`);
          await new Promise((resolve) => setTimeout(resolve, LOOP_INTERVAL_MS));
          continue;
        }
        results.push({ run: run + 1, crafted: false, reason: chests?.reason ?? "chest-batch-open-failed", chests });
        exitReason = chests?.reason ?? "chest-batch-open-failed";
        break;
      }
      if (chests.opened > 0) log(`Opened ${chests.opened} pending chests`);
    }
    const before = await evaluateRuntime(SNAPSHOT, endpoint);
    const groups = craftableGroupCount(before, mode, { minAtkPct, minSkillPower });
    const group = groups.find((candidate) => candidate.batches > 0);
    if (!group) {
      if (!loop) {
        results.push({ run: run + 1, crafted: false, reason: "no-safe-nine-item-group", groups, chests });
        exitReason = "no-safe-nine-item-group";
        break;
      }
      log(`No safe nine-item group; checking again in 10 seconds`);
      await new Promise((resolve) => setTimeout(resolve, LOOP_INTERVAL_MS));
      continue;
    }
    const action = await gameAction(craftUiExpression(group.mode, group.band), endpoint);
    if (!action?.ok || !action.crafted) {
      if (loop && RETRYABLE_UI_REASONS.has(action?.reason)) {
        log(`Craft menu unavailable (${action.reason}); retrying in 10 seconds`);
        await new Promise((resolve) => setTimeout(resolve, LOOP_INTERVAL_MS));
        continue;
      }
      results.push({ run: run + 1, crafted: false, ...action });
      exitReason = action?.reason ?? "craft-action-failed";
      break;
    }
    const beforeCount = (before.items?.length ?? 0) + (before.storage?.length ?? 0);
    const beforeIds = new Set([
      ...(before.items ?? []).map((item) => item.id),
      ...(before.storage ?? []).map((item) => item.id),
    ]);
    let after = null;
    let afterCount = beforeCount;
    let newItemCount = 0;
    let verified = false;
    for (let attempt = 0; attempt < VERIFY_ATTEMPTS; attempt += 1) {
      after = await evaluateRuntime(SNAPSHOT, endpoint);
      afterCount = (after?.items?.length ?? 0) + (after?.storage?.length ?? 0);
      newItemCount = [...(after?.items ?? []), ...(after?.storage ?? [])]
        .filter((item) => !beforeIds.has(item.id)).length;
      verified = afterCount === beforeCount - (CRAFT_COST - 1) && newItemCount === 1;
      if (verified) break;
      await new Promise((resolve) => setTimeout(resolve, VERIFY_WAIT_MS));
    }
    if (!verified) {
      results.push({ run: run + 1, crafted: true, slots: action.slots, verified, before, after });
      exitReason = "post-craft-verification-failed";
      break;
    }
    let alchemy = { ok: true, count: 0 };
    if (group.mode === "gear") {
      alchemy = await gameAction(ALCHEMIZE_LOW_EGGS, endpoint);
      if (!alchemy?.ok) {
        results.push({ run: run + 1, crafted: true, slots: action.slots, verified, alchemy, chests });
        exitReason = alchemy?.reason ?? "egg-alchemy-failed";
        break;
      }
      chests = await gameAction(OPEN_PENDING_CHESTS, endpoint);
      if (!chests?.ok) {
        results.push({ run: run + 1, crafted: true, slots: action.slots, verified, chests });
        exitReason = chests?.reason ?? "chest-batch-open-failed";
        break;
      }
    }
    results.push({ run: run + 1, crafted: true, slots: action.slots, verified, alchemy, chests, before, after });
    const eggMessage = group.mode === "gear" ? `; alchemized ${alchemy.count} common/rare eggs` : "";
    log(loop
      ? `Craft ${run + 1}: verified${eggMessage}; opened ${chests.opened} chests; next run in 10 seconds`
      : `Craft ${run + 1}/${maxRuns}: verified${eggMessage}; opened ${chests.opened} chests`);
    if (loop) await new Promise((resolve) => setTimeout(resolve, LOOP_INTERVAL_MS));
  }
  log(`Craft controller exiting: ${exitReason}`);
  return { results, exitReason };
}

export { SNAPSHOT };