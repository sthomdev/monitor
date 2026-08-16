import { evaluateRuntime } from "./cdp.js";

const DEFAULT_ENDPOINT = "http://127.0.0.1:9222";
const CRAFT_COST = 9;
const WAIT_MS = 150;
const LOOP_INTERVAL_MS = 10_000;
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
  });
  return {
    items: (state.items ?? []).map(project),
    storage: state.settings?.cubeUseStorage === false ? [] : (state.storage ?? []).map(project),
    equipped,
  };
})()`;

function bandOf(level) {
  const bands = [1, 10, 15, 20, 30, 40, 50, 60, 65, 80];
  let result = 0;
  for (let index = 0; index < bands.length; index += 1) {
    if (level >= bands[index]) result = index;
  }
  return result;
}

export function craftableGroupCount(snapshot, mode = "gear") {
  if (!snapshot) return [];
  const equipped = new Set(snapshot.equipped ?? []);
  const groups = new Map();
  for (const item of [...(snapshot.items ?? []), ...(snapshot.storage ?? [])]) {
    const charm = item.part === "charm";
    if (mode === "charm" ? !charm : charm) continue;
    if (item.locked || equipped.has(item.id)) continue;
    const key = `${item.rarity}|${bandOf(item.lv)}`;
    groups.set(key, (groups.get(key) ?? 0) + 1);
  }
  return [...groups.entries()]
    .map(([key, count]) => ({ key, count, batches: Math.floor(count / CRAFT_COST) }))
    .filter((group) => group.count > 0)
    .sort((left, right) => right.count - left.count);
}

async function gameAction(expression, endpoint) {
  return evaluateRuntime(expression, endpoint, { awaitPromise: true });
}

function craftUiExpression(mode) {
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

export async function runCraftController({ endpoint = DEFAULT_ENDPOINT, maxRuns = 1, mode = "gear", confirm = false, loop = false, log = console.log } = {}) {
  if (!confirm) throw new Error("Craft automation changes game state; rerun with --confirm to enable it");
  if (!Number.isInteger(maxRuns) || maxRuns < 1) throw new Error("maxRuns must be a positive integer");
  if (!new Set(["gear", "charm"]).has(mode)) throw new Error("mode must be gear or charm");

  const results = [];
  let exitReason = loop ? "stopped-by-user" : "max-runs-reached";
  for (let run = 0; loop || run < maxRuns; run += 1) {
    const before = await evaluateRuntime(SNAPSHOT, endpoint);
    const groups = craftableGroupCount(before, mode);
    if (!groups.some((group) => group.batches > 0)) {
      if (!loop) {
        results.push({ run: run + 1, crafted: false, reason: "no-safe-nine-item-group", groups });
        exitReason = "no-safe-nine-item-group";
        break;
      }
      log(`No safe nine-item group; checking again in 10 seconds`);
      await new Promise((resolve) => setTimeout(resolve, LOOP_INTERVAL_MS));
      continue;
    }
    const action = await gameAction(craftUiExpression(mode), endpoint);
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
    const after = await evaluateRuntime(SNAPSHOT, endpoint);
    const beforeCount = (before.items?.length ?? 0) + (before.storage?.length ?? 0);
    const afterCount = (after?.items?.length ?? 0) + (after?.storage?.length ?? 0);
    const beforeIds = new Set([
      ...(before.items ?? []).map((item) => item.id),
      ...(before.storage ?? []).map((item) => item.id),
    ]);
    const newItemCount = [...(after?.items ?? []), ...(after?.storage ?? [])]
      .filter((item) => !beforeIds.has(item.id)).length;
    const verified = afterCount === beforeCount - (CRAFT_COST - 1) && newItemCount === 1;
    results.push({ run: run + 1, crafted: true, slots: action.slots, verified, before, after });
    if (!verified) {
      exitReason = "post-craft-verification-failed";
      break;
    }
    log(loop ? `Craft ${run + 1}: verified; next run in 10 seconds` : `Craft ${run + 1}/${maxRuns}: verified`);
    if (loop) await new Promise((resolve) => setTimeout(resolve, LOOP_INTERVAL_MS));
  }
  log(`Craft controller exiting: ${exitReason}`);
  return { results, exitReason };
}

export { SNAPSHOT };