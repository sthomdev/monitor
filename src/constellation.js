import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { readSave } from "./save.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pagePath = fileURLToPath(new URL("../dashboard/constellation.html", import.meta.url));
const runtimeDataPath = path.resolve(projectRoot, ".runtime", "src", "game", "data.js");
const defaultSavePath = path.resolve(projectRoot, "save.json");

const statLabels = {
  atk: "Attack",
  hp: "HP",
  skill: "Skill power",
  speed: "Attack speed",
  drop: "Drop rate",
  gold: "Gold",
  def: "Defense",
  cdr: "Cooldown reduction",
};

function aggregate(nodes, perks, ids) {
  const result = { atk: 1, hp: 1, skillPower: 0 };
  for (const id of ids) {
    for (const perkId of nodes[id]?.grants ?? []) {
      const perk = perks[perkId];
      if (!perk) continue;
      result.atk *= perk.mult.atk ?? 1;
      result.hp *= perk.mult.hp ?? 1;
      result.skillPower += perk.stat.skillPower ?? 0;
    }
  }
  return result;
}

function locked(node, nodes, sectorSpecials, taken) {
  if (node.type !== "special") return false;
  if (node.jobLock) return false;
  if (node.keystone) {
    const requiredIds = sectorSpecials[node.grants[0]] ?? [];
    const required = Object.values(nodes).filter((candidate) => candidate.type === "special" && !candidate.keystone && !candidate.jobLock && requiredIds.includes(candidate.grants[0]));
    return required.some((candidate) => !taken.has(candidate.id));
  }
  return node.edges.filter((id) => id !== "start").some((id) => !taken.has(id));
}

function optimize(nodes, perks, sectorSpecials, member, primary = "atk", secondary = "hp") {
  const current = new Set(member.taken);
  const budget = Math.max(0, member.points - member.spent);
  const beamWidth = 500;
  let beam = [{ ids: [...current], taken: current }];
  let best = beam[0];
  for (let depth = 0; depth < budget; depth++) {
    const next = [];
    for (const state of beam) {
      for (const node of Object.values(nodes)) {
        if (state.taken.has(node.id) || (node.jobLock && node.jobLock !== member.job) || locked(node, nodes, sectorSpecials, state.taken)) continue;
        if (!node.edges.some((id) => id === "start" || state.taken.has(id))) continue;
        const taken = new Set(state.taken).add(node.id);
        next.push({ ids: [...state.ids, node.id], taken });
      }
    }
    if (next.length === 0) break;
    const score = (state) => {
      const totals = aggregate(nodes, perks, state.ids);
      const weights = { [primary]: 3, [secondary]: 1.5 };
      return (weights.atk ?? 0.25) * Math.log(totals.atk)
        + (weights.hp ?? 0.25) * Math.log(totals.hp)
        + (weights.skillPower ?? 0.25) * totals.skillPower;
    };
    next.sort((left, right) => {
      return score(right) - score(left);
    });
    beam = next.slice(0, beamWidth);
    best = beam[0];
  }
  return { budget, ids: best.ids.filter((id) => !current.has(id)), totals: aggregate(nodes, perks, best.ids) };
}

async function loadConstellationData(savePath) {
  const data = await import(pathToFileURL(runtimeDataPath).href);
  let save = null;
  try {
    save = await readSave(savePath);
  } catch {
    save = null;
  }
  const members = (save?.party ?? []).map((id) => {
    const monster = save.monsters?.[id];
    return monster ? {
      id,
      name: monster.name ?? id,
      level: monster.level ?? 1,
      job: monster.job ?? null,
      points: Math.floor((monster.level ?? 1) * 3 / 2),
      spent: monster.perkSpent ?? (monster.sphere?.taken?.length ?? 0),
      taken: monster.sphere?.taken ?? [],
    } : null;
  }).filter(Boolean);
  const nodes = Object.fromEntries(Object.values(data.SPHERE_NODES).map((node) => [node.id, node]));
  const perks = Object.fromEntries(Object.entries(data.PERKS).map(([id, perk]) => [id, {
    id, label: perk.label ?? id, desc: perk.desc ?? "", special: Boolean(perk.special), keystone: Boolean(perk.keystone), mult: perk.mult ?? {}, stat: perk.stat ?? {},
  }]));
  const sectorSpecials = data.SPHERE_SECTOR_SPECIALS ?? {};
  return {
    board: {
      width: data.SPHERE_BOARD_SIZE.w,
      height: data.SPHERE_BOARD_SIZE.h,
      start: data.SPHERE_START,
      sectors: data.SPHERE_SECTORS,
      revision: data.SPHERE_BOARD_REV,
    },
    nodes: Object.values(data.SPHERE_NODES).map((node) => ({
      id: node.id,
      x: node.x,
      y: node.y,
      type: node.type,
      stat: node.stat,
      statLabel: statLabels[node.stat] ?? node.stat ?? "Special",
      grants: node.grants ?? [],
      edges: node.edges ?? [],
      sector: node.sector ?? null,
      jobLock: node.jobLock ?? null,
      keystone: Boolean(node.keystone),
    })),
    perks,
    members,
    optimization: { nodes, perks, sectorSpecials },
  };
}

export async function startConstellationViewer({ host = "127.0.0.1", port = 4180, savePath = defaultSavePath } = {}) {
  const data = await loadConstellationData(savePath);
  const publicData = { ...data };
  delete publicData.optimization;
  const page = await fs.readFile(pagePath, "utf8");
  const server = http.createServer((request, response) => {
    const pathname = new URL(request.url, `http://${request.headers.host ?? "localhost"}`).pathname;
    if (pathname === "/api/constellation") {
      response.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
      response.end(JSON.stringify(publicData));
      return;
    }
    if (pathname === "/api/constellation/optimize" && request.method === "POST") {
      let body = "";
      request.on("data", (chunk) => { body += chunk; });
      request.on("end", () => {
        try {
          const input = JSON.parse(body || "{}");
          const member = data.members.find((candidate) => candidate.id === input.memberId);
          if (!member) throw new Error("Unknown member");
          const primary = ["atk", "hp", "skillPower"].includes(input.primary) ? input.primary : "atk";
          const secondary = ["atk", "hp", "skillPower"].includes(input.secondary) && input.secondary !== primary ? input.secondary : "hp";
          response.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
          response.end(JSON.stringify({ primary, secondary, result: optimize(data.optimization.nodes, data.optimization.perks, data.optimization.sectorSpecials, member, primary, secondary) }));
        } catch (error) {
          response.writeHead(400, { "content-type": "application/json; charset=utf-8" });
          response.end(JSON.stringify({ error: error.message }));
        }
      });
      return;
    }
    if (pathname === "/" || pathname === "/index.html") {
      response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      response.end(page);
      return;
    }
    response.writeHead(404);
    response.end("Not found");
  });
  await new Promise((resolve) => server.listen(port, host, resolve));
  return server;
}

export { loadConstellationData };
