import { resolvePartyAttack } from "./real-stats.js";
import { elementMult, stageElement } from "../extracted/data.js";

const HP_ANCHORS = [
  [1, 30], [5, 190], [10, 550], [30, 2300], [60, 8500], [100, 22000],
  [130, 29500], [160, 103000], [200, 139000], [250, 263000], [300, 337000],
  [350, 650000], [400, 761000],
];
const KILLS_PER_STAGE = 30;
const ENEMIES_PER_WAVE = 3;
const FIRST_WAVE_KILLS = KILLS_PER_STAGE - 1;

function anchorCurve(stage) {
  const value = Math.max(1, stage);
  let [startStage, startValue] = HP_ANCHORS[0];
  if (value <= startStage) return startValue;
  for (let index = 1; index < HP_ANCHORS.length; index += 1) {
    const [endStage, endValue] = HP_ANCHORS[index];
    if (value <= endStage) {
      const growth = (endValue / startValue) ** (1 / (endStage - startStage));
      return startValue * growth ** (value - startStage);
    }
    [startStage, startValue] = [endStage, endValue];
  }
  const [previousStage, previousValue] = HP_ANCHORS[HP_ANCHORS.length - 2];
  const [lastStage, lastValue] = HP_ANCHORS.at(-1);
  const growth = (lastValue / previousValue) ** (1 / (lastStage - previousStage));
  return lastValue * growth ** (value - lastStage);
}

export function enemyMaxHp(effectiveStage) {
  return Math.round(anchorCurve(effectiveStage));
}

export function effectiveStage(difficulty, stage) {
  return difficulty * 100 + stage;
}

export function targetDamagePerSecond({ effectiveStage: stage, targetKpm }) {
  return enemyMaxHp(stage) * targetKpm / 60;
}

function partySpeedStats(state, runtime) {
  const { data, equipment } = runtime;
  const members = (state.party ?? []).map((id) => state.monsters[id]).filter(Boolean);
  const speedBonus = Math.min(0.6, members.reduce((total, monster) => (
    total
      + equipment.equipStat(monster, "atkSpeed")
      + (monster.perks ?? []).reduce((sum, perk) => sum + (data.PERKS[perk.id]?.stat?.atkSpeed ?? 0), 0)
      + (data.JOBS[monster.job]?.stat?.atkSpeed ?? 0)
  ), 0));
  const speedIv = members.length
    ? members.reduce((total, monster) => total + (monster.iv?.spd ?? 1), 0) / members.length
    : 1;
  const cdr = Math.min(0.5, members.reduce((total, monster) => (
    total
      + equipment.equipStat(monster, "cdr")
      + (monster.perks ?? []).reduce((sum, perk) => sum + (data.PERKS[perk.id]?.stat?.cdr ?? 0), 0)
      + (data.JOBS[monster.job]?.stat?.cdr ?? 0)
  ), 0));
  const averageCritIv = members.length
    ? members.reduce((total, monster) => total + (monster.iv?.crit ?? 1), 0) / members.length
    : 1;
  const critRate = Math.min(0.5, (
    0.05
      + members.reduce((total, monster) => (
        total
          + equipment.equipStat(monster, "critRate")
          + (monster.perks ?? []).reduce((sum, perk) => sum + (data.PERKS[perk.id]?.stat?.critRate ?? 0), 0)
          + (data.JOBS[monster.job]?.stat?.critRate ?? 0)
      ), 0)
  ) * averageCritIv);
  const critDamage = Math.min(3, 1.5 + members.reduce((total, monster) => (
    total
      + equipment.equipStat(monster, "critDmg")
      + (monster.perks ?? []).reduce((sum, perk) => sum + (data.PERKS[perk.id]?.stat?.critDmg ?? 0), 0)
      + (data.JOBS[monster.job]?.stat?.critDmg ?? 0)
  ), 0));
  return { speedBonus, speedIv, cdr, critRate, critDamage, attacksPerSecond: (1 + speedBonus) * speedIv };
}

function formatSkill(skill) {
  return {
    id: skill.id,
    type: skill.type,
    kind: skill.kind ?? "single",
    power: skill.power,
    cooldown: skill.cooldown,
    aoeConversion: skill.aoeConversion,
    duration: skill.duration,
    skillPowerBonus: skill.skillPowerBonus,
    neutralDamage: skill.neutralSingleTargetDamage,
  };
}

function simulateWave({ hp, partyAttack, attackInterval, skills, cdr, critMultiplier, bossHpMultiplier, normalElementMultiplier, spawnDelay = 0.45, targetKills = 300 }) {
  const events = [{ time: attackInterval, damage: partyAttack * normalElementMultiplier, kind: "single", source: "normal" }];
  for (const skill of skills) {
    const interval = skill.cooldown * (1 - cdr);
    const convertedAoe = skill.kind === "single" && skill.aoeConversion > 0;
    events.push({
      time: skill.initialDelay,
      interval,
      damage: skill.damagePerCast * skill.elementMultiplier,
      kind: convertedAoe || skill.kind === "aoe" ? "aoe" : "single",
      aoeScale: convertedAoe ? skill.aoeConversion : 1,
      buffMultiplier: skill.type === "buff" ? 1 + skill.power : 1,
      buffDuration: skill.duration,
      type: skill.type,
      source: skill.id,
        starvationClass: "normal",
    });
  }
  const enemies = [];
  let kills = 0;
  let time = 0;
  let attackBuff = 1;
  let attackBuffExpires = 0;
  let spawnAt = 0;
  const addWave = () => {
    const stageKills = kills % KILLS_PER_STAGE;
    const count = stageKills < FIRST_WAVE_KILLS
      ? Math.min(ENEMIES_PER_WAVE, FIRST_WAVE_KILLS - stageKills)
      : 1;
    for (let index = 0; index < count; index += 1) {
      enemies.push(count === 1 && stageKills === FIRST_WAVE_KILLS ? hp * bossHpMultiplier : hp);
    }
  };
  addWave();
  while (kills < targetKills && time < 3600) {
    events.sort((left, right) => left.time - right.time);
    const event = events[0];
    if (enemies.length === 0 && spawnAt > event.time && event.starvationClass !== "late") {
      event.time = spawnAt;
    }
    time = event.time;
    if (enemies.length === 0 && time >= spawnAt) {
      addWave();
      spawnAt = 0;
    }
    if (time >= attackBuffExpires) attackBuff = 1;
    if (event.type === "buff") {
      attackBuff = event.buffMultiplier;
      attackBuffExpires = time + event.buffDuration;
    } else if (event.kind === "aoe") {
      for (let index = 0; index < enemies.length; index += 1) {
        if (enemies[index] > 0) enemies[index] -= event.damage * event.aoeScale * attackBuff * critMultiplier;
      }
    } else {
      const target = enemies.findIndex((value) => value > 0);
      if (target >= 0) {
        let damage = event.damage * attackBuff * critMultiplier;
        if (event.type === "execute" && enemies[target] / event.maxHp < 0.35) damage *= 2.2;
        enemies[target] -= damage;
      }
    }
    for (let index = enemies.length - 1; index >= 0; index -= 1) {
      if (enemies[index] <= 0) {
        enemies.splice(index, 1);
        kills += 1;
      }
    }
    if (enemies.length === 0 && kills < targetKills && spawnAt === 0) spawnAt = time + spawnDelay;
    if (time >= attackBuffExpires) attackBuff = 1;
    event.time += event.interval ?? attackInterval;
  }
  return { seconds: time, kills, kpm: kills * 60 / Math.max(time, 0.001) };
}

export function simulateKpm(state, runtime, {
  difficulty = 1,
  stage = 9,
  targetKpm = 600,
  partyAttack = 0,
  attacksPerSecond = 0,
  aoeDamage = 0,
  aoeCooldown = 0,
  liveStarvation = false,
} = {}) {
  const stageNumber = effectiveStage(difficulty, stage);
  const hp = enemyMaxHp(stageNumber);
  const party = runtime ? resolvePartyAttack(state, runtime) : [];
  const dexAttackBonus = runtime?.data?.dexTotals ? runtime.data.dexTotals(state.dex ?? {}).atk : 0;
  const resolvedPartyAttack = party.reduce((total, monster) => total + monster.attack, 0) * (1 + dexAttackBonus);
  const enemyElement = stageElement(stage);
  const normalElementMultiplier = party.length
    ? party.reduce((total, monster) => total + elementMult(monster.skills[0]?.element, enemyElement), 0) / party.length
    : 1;
  const speed = runtime ? partySpeedStats(state, runtime) : { attacksPerSecond };
  const effectiveAttacksPerSecond = attacksPerSecond || speed.attacksPerSecond;
  const effectivePartyAttack = partyAttack || resolvedPartyAttack;
  const cdr = speed.cdr ?? 0.5;
  const critMultiplier = 1 + (speed.critRate ?? 0.5) * ((speed.critDamage ?? 3) - 1);
  const skills = party.flatMap((monster) => monster.skills
    .filter((skill) => skill.type === "nuke" && skill.neutralSingleTargetDamage > 0)
    .map((skill, slot) => {
      const interval = skill.cooldown * (1 - cdr);
      const initialDelay = skill.cooldown * (0.3 + slot * 0.5);
      const dps = skill.neutralSingleTargetDamage / interval;
      return {
        owner: monster.id,
        id: skill.id,
        damagePerCast: skill.neutralSingleTargetDamage,
        cooldown: skill.cooldown,
        initialDelay,
        effectiveInterval: interval,
        estimatedDps: dps,
      };
    }));
  const skillDps = skills.reduce((total, skill) => total + skill.estimatedDps, 0);
  const allSkills = party.flatMap((monster, memberIndex) => monster.skills
    .filter((skill) => skill.cooldown > 0)
    .filter(() => !liveStarvation || memberIndex < 2)
    .map((skill, slot) => ({
      ...skill,
      memberIndex,
      slot,
      initialDelay: skill.cooldown * (0.4 + memberIndex * 0.2 + slot * 0.5),
      damagePerCast: skill.neutralSingleTargetDamage ?? 0,
      elementMultiplier: elementMult(skill.element, enemyElement),
      maxHp: hp,
      starvationClass: liveStarvation && memberIndex >= 2 ? "late" : "normal",
    })));
  const waveSimulation = simulateWave({
    hp,
    partyAttack: effectivePartyAttack,
    dexAttackBonus,
    attackInterval: 1 / effectiveAttacksPerSecond,
    skills: allSkills,
    cdr,
    critMultiplier,
    bossHpMultiplier: stage % 10 === 0 ? 6 : 3,
    normalElementMultiplier,
    targetKills: KILLS_PER_STAGE * 10,
  });
  const targetDps = targetDamagePerSecond({ effectiveStage: stageNumber, targetKpm });
  const targetNormalHit = targetDps / effectiveAttacksPerSecond;
  const normalKpm = effectivePartyAttack * effectiveAttacksPerSecond * 60 / hp;
  const normalWaveSeconds = (FIRST_WAVE_KILLS * hp + hp * 3) / Math.max(1, effectivePartyAttack * effectiveAttacksPerSecond);
  const aoeDps = aoeDamage > 0 && aoeCooldown > 0 ? aoeDamage / aoeCooldown : 0;
  const combinedDps = effectivePartyAttack * effectiveAttacksPerSecond + aoeDps * ENEMIES_PER_WAVE;
  const skillInclusiveDps = effectivePartyAttack * effectiveAttacksPerSecond + skillDps;
  const skillInclusiveKpm = skillInclusiveDps * 60 / hp;
  const combinedKpm = combinedDps * 60 / hp;
  return {
    difficulty,
    stage,
    effectiveStage: stageNumber,
    targetKpm,
    enemyHp: hp,
    waveShape: `${ENEMIES_PER_WAVE} enemies x ${Math.ceil(FIRST_WAVE_KILLS / ENEMIES_PER_WAVE)} waves, then 1 boss enemy`,
    partyAttack: effectivePartyAttack,
    speed,
    targetDamagePerSecond: targetDps,
    targetNormalHit,
    normalKpm,
    skillDps,
    critMultiplier,
    skillInclusiveDps,
    skillInclusiveKpm,
    waveSimulation,
    starvationModel: liveStarvation
      ? "Live calibration excludes late third-member skill slots that starve during normal fast waves."
      : "Generic cooldown scheduling; live starvation calibration is disabled.",
    skills: allSkills.map((skill) => ({
      owner: skill.owner,
      id: skill.id,
      type: skill.type,
      kind: skill.kind,
      aoeConversion: skill.aoeConversion,
      power: skill.power,
      duration: skill.duration,
      damagePerCast: skill.damagePerCast,
      cooldown: skill.cooldown,
      initialDelay: skill.initialDelay,
      effectiveInterval: skill.cooldown * (1 - cdr),
      estimatedDps: skill.type === "nuke" ? skill.damagePerCast / (skill.cooldown * (1 - cdr)) : 0,
    })),
    normalWaveSeconds,
    aoe: {
      damagePerCast: aoeDamage,
      cooldown: aoeCooldown,
      addedDpsAcrossThreeTargets: aoeDps * ENEMIES_PER_WAVE,
      combinedKpm,
      targetAoeDamagePerCast: targetDps * aoeCooldown / ENEMIES_PER_WAVE,
    },
    targetReachedWithNormalAttacks: normalKpm >= targetKpm,
    targetReachedWithSkillDpsEstimate: skillInclusiveKpm >= targetKpm,
    targetReachedWithWaveSimulation: waveSimulation.kpm >= targetKpm,
    targetReachedWithConfiguredAoe: combinedKpm >= targetKpm,
    note: effectivePartyAttack > 0 && effectiveAttacksPerSecond > 0
      ? "normalKpm is basic attacks only; waveSimulation includes offensive skill casts, cooldowns, AOE conversion, and no overkill spill. skillInclusiveKpm is an optimistic DPS-only upper bound."
      : "Provide --party-attack and --attacks-per-sec to compare a current build against the threshold.",
  };
}
