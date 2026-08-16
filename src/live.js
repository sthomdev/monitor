import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { evaluateRuntime } from "./cdp.js";
import { AWAKENING, DEX_BUFF_CAPS, EGG_DROP_CHANCE, JOBS, PERKS, SKILLS, dexTotals } from "../extracted/data.js";

const LEVEL_CAP = 100;
const EMA_TIME_CONSTANT_MS = 30_000;
const dashboardPath = fileURLToPath(new URL("../dashboard/index.html", import.meta.url));
const attackReportPath = fileURLToPath(new URL("../report.html", import.meta.url));
const wikiPath = fileURLToPath(new URL("../context.md", import.meta.url));
const FIRST_EGG_MULT = 25;
const ROOKIE_EGG_MULT = 3;
const POST_ROOKIE_EGG_MULT = 0.22;

function fallbackEggDrop(state) {
  if (!state?.party || !state.monsters) return null;
  const members = state.party.map((id) => state.monsters[id]).filter(Boolean);
  const sum = (read) => members.reduce((total, member) => total + read(member), 0);
  const equipmentStat = (member, key) => (member.equipment ?? []).reduce(
    (total, item) => total
      + (item.stats?.[key] ?? item.stat?.[key] ?? 0)
      + (item.opts ?? []).filter((entry) => entry.stat === key).reduce((sum, entry) => sum + (entry.value ?? 0), 0),
    0,
  );
  const bonus = sum((member) => SKILLS[member.skillId]?.passive?.dropBonus ?? 0)
    + sum((member) => AWAKENING.dropBonus[member.awakening ?? 0] ?? 0)
    + sum((member) => equipmentStat(member, "dropBonus"))
    + sum((member) => (member.perks ?? []).reduce((total, entry) => total + (PERKS[entry.id]?.stat?.dropBonus ?? 0), 0))
    + sum((member) => JOBS[member.job]?.farm?.drop ?? 0)
    + Math.min(DEX_BUFF_CAPS.drop, dexTotals(state.dex).drop);
  const owned = (state.monsterCount ?? Object.keys(state.monsters).length) + (state.eggs ?? 0);
  const baseMult = owned < 3 ? (owned <= 1 ? FIRST_EGG_MULT : ROOKIE_EGG_MULT) : POST_ROOKIE_EGG_MULT;
  return { chance: EGG_DROP_CHANCE * baseMult * (1 + Math.max(0, bonus)), bonus };
}

function fallbackGlobalBonuses(state) {
  if (!state?.party || !state.monsters) return null;
  const members = state.party.map((id) => state.monsters[id]).filter(Boolean);
  const sum = (read) => members.reduce((total, member) => total + read(member), 0);
  const skillPassive = (member, key) => SKILLS[member.skillId]?.passive?.[key] ?? 0;
  const equipmentStat = (member, key) => (member.equipment ?? []).reduce(
    (total, item) => total
      + (item.stats?.[key] ?? item.stat?.[key] ?? 0)
      + (item.opts ?? []).filter((entry) => entry.stat === key).reduce((sum, entry) => sum + (entry.value ?? 0), 0),
    0,
  );
  const perkStat = (member, key) => (member.perks ?? []).reduce(
    (total, entry) => total + (PERKS[entry.id]?.stat?.[key] ?? 0),
    0,
  );
  const jobFarm = (member, key) => JOBS[member.job]?.farm?.[key] ?? 0;
  const dex = dexTotals(state.dex);
  const goldRaw = sum((member) => skillPassive(member, "goldBonus"))
    + sum((member) => AWAKENING.goldBonus[member.awakening ?? 0] ?? 0)
    + sum((member) => equipmentStat(member, "goldBonus"))
    + sum((member) => perkStat(member, "goldBonus"))
    + sum((member) => jobFarm(member, "gold"));
  const expRaw = sum((member) => equipmentStat(member, "expBonus"))
    + sum((member) => jobFarm(member, "exp"));
  return {
    gold: Math.min(AWAKENING.goldBonusCap, goldRaw) + dex.gold,
    exp: Math.min(1, expRaw) + dex.exp,
  };
}

function fallbackCapStats(state) {
  if (!state?.party || !state.monsters) return null;
  const members = state.party.map((id) => state.monsters[id]).filter(Boolean);
  const sum = (read) => members.reduce((total, member) => total + read(member), 0);
  const equipmentStat = (member, key) => (member.equipment ?? []).reduce(
    (total, item) => total
      + (item.stats?.[key] ?? item.stat?.[key] ?? 0)
      + (item.opts ?? []).filter((entry) => entry.stat === key).reduce((sum, entry) => sum + (entry.value ?? 0), 0),
    0,
  );
  const perkStat = (member, key) => (member.perks ?? []).reduce(
    (total, entry) => total + (PERKS[entry.id]?.stat?.[key] ?? 0),
    0,
  );
  const jobStat = (member, key) => JOBS[member.job]?.stat?.[key] ?? 0;
  const jobFarm = (member, key) => JOBS[member.job]?.farm?.[key] ?? 0;
  const ivAverage = (key) => members.length
    ? members.reduce((total, member) => total + (member.iv?.[key] ?? 1), 0) / members.length
    : 1;
  const dex = dexTotals(state.dex);
  const goldRaw = sum((member) => SKILLS[member.skillId]?.passive?.goldBonus ?? 0)
    + sum((member) => AWAKENING.goldBonus[member.awakening ?? 0] ?? 0)
    + sum((member) => equipmentStat(member, "goldBonus"))
    + sum((member) => perkStat(member, "goldBonus"))
    + sum((member) => jobFarm(member, "gold"));
  const expRaw = sum((member) => equipmentStat(member, "expBonus")) + sum((member) => jobFarm(member, "exp"));
  const capped = (raw, cap, effective = Math.min(cap, raw)) => ({ raw, effective, cap, excess: Math.max(0, raw - cap) });
  return {
    gold: capped(goldRaw, AWAKENING.goldBonusCap, Math.min(AWAKENING.goldBonusCap, goldRaw) + dex.gold),
    exp: capped(expRaw, 1, Math.min(1, expRaw) + dex.exp),
    attackSpeed: capped(
      sum((member) => equipmentStat(member, "atkSpeed") + perkStat(member, "atkSpeed") + jobStat(member, "atkSpeed")),
      0.6,
    ),
    critRate: capped(
      (0.05 + sum((member) => equipmentStat(member, "critRate") + perkStat(member, "critRate") + jobStat(member, "critRate"))) * ivAverage("crit"),
      0.5,
    ),
    critDamage: capped(1.5 + sum((member) => equipmentStat(member, "critDmg") + perkStat(member, "critDmg")), 3),
    cdr: capped(sum((member) => equipmentStat(member, "cdr") + perkStat(member, "cdr") + jobStat(member, "cdr")), 0.5),
    defenseCut: capped(
      sum((member) => equipmentStat(member, "defPct")) * ivAverage("def")
        + sum((member) => perkStat(member, "defCut") + jobStat(member, "defCut")),
      0.5,
    ),
    bossDamage: capped(sum((member) => equipmentStat(member, "bossDmg")), 1),
    lifesteal: capped(sum((member) => equipmentStat(member, "lifesteal")), 0.25),
  };
}

function expToNext(level) {
  if (level < 30) return Math.round(40 * Math.pow(1.19, level - 1));
  const at30 = 40 * Math.pow(1.19, 29);
  if (level < 60) return Math.round(at30 * Math.pow(1.202, level - 30));
  const at60 = at30 * Math.pow(1.202, 30);
  if (level < 80) return Math.round(at60 * Math.pow(1.09, level - 60));
  const at80 = at60 * Math.pow(1.09, 20);
  return Math.round(at80 * Math.pow(1.042, level - 80));
}

function totalExpAt(level) {
  let total = 0;
  for (let current = 1; current < level; current++) total += expToNext(current);
  return total;
}

function projectExpression() {
  return `(() => {
    const expToNext = (level) => {
      if (level < 30) return Math.round(40 * Math.pow(1.19, level - 1));
      const at30 = 40 * Math.pow(1.19, 29);
      if (level < 60) return Math.round(at30 * Math.pow(1.202, level - 30));
      const at60 = at30 * Math.pow(1.202, 30);
      if (level < 80) return Math.round(at60 * Math.pow(1.09, level - 60));
      const at80 = at60 * Math.pow(1.09, 20);
      return Math.round(at80 * Math.pow(1.042, level - 80));
    };
    const debug = window.__battleDebug?.();
    const state = debug?.state;
    if (!debug || !state) return null;
    return {
      timestamp: Date.now(),
      gold: state.gold ?? 0,
      eggDrop: debug.eggDrop ? {
        chance: debug.eggDrop.chance ?? 0,
        bonus: debug.eggDrop.bonus ?? 0,
      } : null,
      rateState: {
        party: state.party ?? [],
        monsters: Object.fromEntries((state.party ?? []).map((id) => [id, state.monsters?.[id]]).filter(([, monster]) => monster)),
        monsterCount: Object.keys(state.monsters ?? {}).length,
        dex: state.dex ?? {},
        eggs: state.eggs?.length ?? 0,
      },
      totalKills: state.totalKills ?? 0,
      stage: state.stage ?? 0,
      difficulty: state.difficulty ?? 0,
      killsInStage: state.killsInStage ?? 0,
      bossWave: Boolean(debug.bossWave),
      playerHp: debug.playerHp ?? null,
      party: (state.party ?? []).map((id) => {
        const monster = state.monsters?.[id];
        return monster ? {
          id,
          level: monster.level ?? 1,
          exp: monster.exp ?? 0,
          xpToNext: monster.level >= ${LEVEL_CAP} ? null : expToNext(monster.level ?? 1),
        } : null;
      }).filter(Boolean),
    };
  })()`;
}

function progressOf(member) {
  if (member.level >= LEVEL_CAP) return totalExpAt(LEVEL_CAP);
  return totalExpAt(member.level) + member.exp;
}

function rate(value, elapsedMs) {
  return elapsedMs > 0 ? value * 60_000 / elapsedMs : 0;
}

function smooth(previous, current, elapsedMs) {
  if (previous === null) return current;
  const alpha = 1 - Math.exp(-elapsedMs / EMA_TIME_CONSTANT_MS);
  return previous + alpha * (current - previous);
}

export function createLiveMetrics() {
  const session = {
    startedAt: Date.now(),
    last: null,
    grossGold: 0,
    netGold: 0,
    experience: 0,
    experienceByMember: new Map(),
    kills: 0,
    elapsedMs: 0,
    ema: {
      grossGoldPerMinute: null,
      netGoldPerMinute: null,
      experiencePerMinute: null,
      killsPerMinute: null,
      experiencePerMember: new Map(),
    },
    latest: null,
    error: null,
  };

  return {
    update(snapshot) {
      const now = snapshot.timestamp ?? Date.now();
      snapshot.eggDrop = snapshot.eggDrop ?? fallbackEggDrop(snapshot.rateState);
      snapshot.globalBonuses = snapshot.globalBonuses ?? fallbackGlobalBonuses(snapshot.rateState);
      snapshot.capStats = snapshot.capStats ?? fallbackCapStats(snapshot.rateState);
      if (session.last) {
        const elapsed = Math.max(0, now - session.last.timestamp);
        const goldDelta = snapshot.gold - session.last.gold;
        const expDeltaByMember = new Map();
        const expDelta = snapshot.party.reduce((sum, member) => {
          const previous = session.last.party.find((item) => item.id === member.id);
          if (!previous) return sum;
          const delta = Math.max(0, progressOf(member) - progressOf(previous));
          expDeltaByMember.set(member.id, delta);
          return sum + delta;
        }, 0);
        session.elapsedMs += elapsed;
        session.grossGold += Math.max(0, goldDelta);
        session.netGold += goldDelta;
        session.experience += expDelta;
        for (const [id, delta] of expDeltaByMember) {
          session.experienceByMember.set(id, (session.experienceByMember.get(id) ?? 0) + delta);
        }
        const killsDelta = Math.max(0, snapshot.totalKills - session.last.totalKills);
        session.kills += killsDelta;
        if (elapsed > 0) {
          session.ema.grossGoldPerMinute = smooth(session.ema.grossGoldPerMinute, rate(Math.max(0, goldDelta), elapsed), elapsed);
          session.ema.netGoldPerMinute = smooth(session.ema.netGoldPerMinute, rate(goldDelta, elapsed), elapsed);
          session.ema.experiencePerMinute = smooth(session.ema.experiencePerMinute, rate(expDelta, elapsed), elapsed);
          session.ema.killsPerMinute = smooth(session.ema.killsPerMinute, rate(killsDelta, elapsed), elapsed);
          const memberIds = new Set([
            ...session.last.party.map((member) => member.id),
            ...snapshot.party.map((member) => member.id),
          ]);
          for (const id of memberIds) {
            session.ema.experiencePerMember.set(
              id,
              smooth(session.ema.experiencePerMember.get(id) ?? null, rate(expDeltaByMember.get(id) ?? 0, elapsed), elapsed),
            );
          }
        }
      }
      session.last = snapshot;
      session.latest = snapshot;
      session.error = null;
    },
    fail(error) {
      session.error = error.message;
    },
    read() {
      const latest = session.latest;
      return {
        connected: Boolean(latest) && !session.error,
        error: session.error,
        startedAt: session.startedAt,
        elapsedMs: session.elapsedMs,
        grossGold: session.grossGold,
        netGold: session.netGold,
        experience: session.experience,
        kills: session.kills,
        smoothing: "EMA",
        smoothingTimeConstantMs: EMA_TIME_CONSTANT_MS,
        rates: {
          grossGoldPerMinute: session.ema.grossGoldPerMinute ?? 0,
          netGoldPerMinute: session.ema.netGoldPerMinute ?? 0,
          experiencePerMinute: session.ema.experiencePerMinute ?? 0,
          killsPerMinute: session.ema.killsPerMinute ?? 0,
          eggsPerHour: (session.ema.killsPerMinute ?? 0) * 60 * (latest?.eggDrop?.chance ?? 0),
          experiencePerMember: Object.fromEntries(session.ema.experiencePerMember),
        },
        latest,
      };
    },
    reset() {
      session.startedAt = Date.now();
      session.last = null;
      session.grossGold = 0;
      session.netGold = 0;
      session.experience = 0;
      session.experienceByMember.clear();
      session.kills = 0;
      session.elapsedMs = 0;
      session.ema.grossGoldPerMinute = null;
      session.ema.netGoldPerMinute = null;
      session.ema.experiencePerMinute = null;
      session.ema.killsPerMinute = null;
      session.ema.experiencePerMember.clear();
      session.error = null;
    },
  };
}

export async function readLiveSnapshot(endpoint) {
  return evaluateRuntime(projectExpression(), endpoint);
}

export async function startLiveDashboard({ host = "127.0.0.1", port = 4173, endpoint } = {}) {
  const metrics = createLiveMetrics();
  const poll = async () => {
    try {
      const snapshot = await readLiveSnapshot(endpoint);
      if (!snapshot) throw new Error("TASMON debug object is unavailable");
      metrics.update(snapshot);
    } catch (error) {
      metrics.fail(error);
    }
  };

  await poll();
  const timer = setInterval(poll, 1000);
  const server = http.createServer(async (request, response) => {
    const pathname = new URL(request.url, `http://${request.headers.host ?? "localhost"}`).pathname;
    if (pathname === "/api/live") {
      response.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
      response.end(JSON.stringify(metrics.read()));
      return;
    }
    if (pathname === "/api/reset" && request.method === "POST") {
      metrics.reset();
      response.writeHead(204);
      response.end();
      return;
    }
    if (pathname === "/" || pathname === "/index.html") {
      response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      response.end(await fs.readFile(dashboardPath));
      return;
    }
    if (pathname === "/report.html") {
      response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      response.end(await fs.readFile(attackReportPath));
      return;
    }
    if (pathname === "/context.md") {
      response.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
      response.end(await fs.readFile(wikiPath));
      return;
    }
    response.writeHead(404);
    response.end("Not found");
  });

  server.on("close", () => clearInterval(timer));
  await new Promise((resolve) => server.listen(port, host, resolve));
  return server;
}