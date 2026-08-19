import { monsterAttack, monsterHealth } from "./damage-model.js";

function rarityMultiplier(rarityMeta, rarity) {
  const stars = rarityMeta[rarity]?.stars ?? 1;
  if (stars <= 5) return 1 + (stars - 1) * 0.045;
  return 1.42 + (stars - 6) * 0.16;
}

function awakeningMultiplier(awakening, table) {
  return table?.mult?.[awakening ?? 0]?.atk ?? 1;
}

function pinnacleMultiplier(monster, table) {
  return monster.pinnacle === "solid" ? table["solid"]?.atk ?? 1 : 1;
}

function pinnacleHealthMultiplier(monster, table) {
  return monster.pinnacle === "solid" ? table["solid"]?.hp ?? 1 : 1;
}

function baseSkill(monster, data) {
  const species = data.SPECIES[monster.speciesId];
  return effectiveSkill(monster, data.SKILLS[species?.skillId], data);
}

function effectiveSkill(monster, base, data) {
  if (!base) return null;
  let skill = base;
  if (base.signature && Array.isArray(base.tiers)) {
    const tier = data.JOBS[monster.job]?.tier >= 3 ? 2 : 1;
    const selected = base.tiers[Math.min(tier, base.tiers.length - 1)];
    if (selected) {
      skill = {
        ...skill,
        name: selected.name,
        cooldown: selected.cooldown,
        active: { ...skill.active, power: selected.power },
      };
    }
  }
  const awakening = data.AWAKENING?.skill?.[monster.awakening ?? 0];
  if (!awakening) return skill;
  return {
    ...skill,
    cooldown: Math.round(skill.cooldown * awakening.cooldown * 10) / 10,
    active: { ...skill.active, power: skill.active.power * awakening.power },
  };
}

function equippedSkillIds(monster, data) {
  const ids = Array.isArray(monster.equippedSkills) && monster.equippedSkills.length > 0
    ? monster.equippedSkills
    : [data.SPECIES[monster.speciesId]?.skillId];
  return ids.filter((id) => data.SKILLS[id]);
}

function skillPowerMultiplier(monster, skill, data) {
  return skill?.active?.power ?? 0;
}

function resolveMonsterSkills(monster, attack, runtime) {
  const { data, equipment } = runtime;
  const skillPowerBonus =
    equipment.equipStat(monster, "skillPower") +
    (monster.perks ?? []).reduce((total, perk) => total + (data.PERKS[perk.id]?.stat?.skillPower ?? 0), 0) +
    data.jobStat(monster, "skillPower");
  return equippedSkillIds(monster, data).map((id) => {
    const skill = effectiveSkill(monster, data.SKILLS[id], data);
    const type = skill.active?.type ?? "unknown";
    const power = skillPowerMultiplier(monster, skill, data);
    const directDamage = type === "nuke" ? Math.round(attack * power * (1 + skillPowerBonus)) : null;
    return {
      id,
      name: skill.name ?? id,
      element: data.SPECIES[monster.speciesId]?.element ?? null,
      type,
      kind: skill.active?.kind ?? "single",
      aoeConversion: equipment.equipStat(monster, "skillAoe"),
      hits: skill.active?.hits ?? 1,
      duration: skill.active?.duration ?? 0,
      power,
      cooldown: skill.cooldown ?? null,
      skillPowerBonus,
      neutralSingleTargetDamage: directDamage,
      damageNotes: type === "nuke"
        ? "Neutral target, no attack buff, role/trial/boss modifiers, and non-critical hit."
        : "This skill is not a direct nuke; its effect needs a skill-specific calculation.",
    };
  });
}

export function resolveMonsterAttack(monster, runtime) {
  const { data, equipment, breeding } = runtime;
  const species = data.SPECIES[monster.speciesId];
  if (!species) throw new Error(`Unknown species: ${monster.speciesId}`);

  const skill = baseSkill(monster, data);
  const perkMultiplier = (monster.perks ?? []).reduce(
    (total, perk) => total * (data.PERKS[perk.id]?.mult?.atk ?? 1),
    1,
  );
  const passiveMultiplier = skill?.passive?.atkMult ?? 1;
  const attackIv = monster.iv?.atk ?? 1;
  const equipmentAttackPercent = equipment.equipStat(monster, "atkPct");
  const equipmentFlatAttack = equipment.equipStat(monster, "atkFlat");
  const passiveHealthMultiplier = skill?.passive?.hpMult ?? 1;
  const healthIv = monster.iv?.hp ?? 1;
  const equipmentHealthPercent = equipment.equipStat(monster, "hpPct");
  const equipmentFlatHealth = equipment.equipStat(monster, "hpFlat");
  const healthPerkMultiplier = (monster.perks ?? []).reduce(
    (total, perk) => total * (data.PERKS[perk.id]?.mult?.hp ?? 1),
    1,
  );

  const attack = monsterAttack({
    baseAttack: species.baseAtk,
    level: monster.level,
    attackIv,
    rarityMultiplier: rarityMultiplier(data.RARITY_META, species.rarity),
    passiveAttackMultiplier: passiveMultiplier,
    awakeningMultiplier: awakeningMultiplier(monster.awakening, data.AWAKENING),
    jobMultiplier: data.jobMult(monster, "atk"),
    pinnacleMultiplier: pinnacleMultiplier(monster, data.PINNACLE_SOLID_MULT ?? {}),
    equipmentAttackPercent,
    equipmentFlatAttack,
    perkAttackMultiplier: perkMultiplier,
    breedingMultiplier: breeding.plusMult(monster),
    collectionAttackMultiplier: 1,
  });
  const health = monsterHealth({
    baseHealth: species.baseHp,
    level: monster.level,
    healthIv,
    rarityMultiplier: rarityMultiplier(data.RARITY_META, species.rarity),
    passiveHealthMultiplier,
    awakeningMultiplier: data.AWAKENING?.mult?.[monster.awakening ?? 0]?.hp ?? 1,
    jobMultiplier: data.jobMult(monster, "hp"),
    pinnacleMultiplier: pinnacleHealthMultiplier(monster, data.PINNACLE_SOLID_MULT ?? {}),
    equipmentHealthPercent,
    equipmentFlatHealth,
    perkHealthMultiplier: healthPerkMultiplier,
    breedingMultiplier: breeding.plusMult(monster),
    collectionHealthMultiplier: 1,
  });

  return {
    id: monster.id ?? null,
    speciesId: monster.speciesId,
    speciesName: species.name ?? monster.speciesId,
    level: monster.level,
    attack,
    health,
    skills: resolveMonsterSkills(monster, attack, runtime),
    components: {
      baseAttack: species.baseAtk,
      attackIv,
      rarityMultiplier: rarityMultiplier(data.RARITY_META, species.rarity),
      passiveMultiplier,
      awakeningMultiplier: awakeningMultiplier(monster.awakening, data.AWAKENING),
      jobMultiplier: data.jobMult(monster, "atk"),
      equipmentAttackPercent,
      equipmentFlatAttack,
      perkMultiplier,
      breedingMultiplier: breeding.plusMult(monster),
      collectionAttackMultiplier: 1,
      baseHealth: species.baseHp,
      healthIv,
      passiveHealthMultiplier,
      healthRarityMultiplier: rarityMultiplier(data.RARITY_META, species.rarity),
      healthAwakeningMultiplier: data.AWAKENING?.mult?.[monster.awakening ?? 0]?.hp ?? 1,
      healthJobMultiplier: data.jobMult(monster, "hp"),
      healthPinnacleMultiplier: pinnacleHealthMultiplier(monster, data.PINNACLE_SOLID_MULT ?? {}),
      equipmentHealthPercent,
      equipmentFlatHealth,
      healthPerkMultiplier,
      healthBreedingMultiplier: breeding.plusMult(monster),
      collectionHealthMultiplier: 1,
    },
    assumptions: [
      "Collection attack bonus is set to 1 because it is held in a UI-side module aggregate.",
      "The base species passive is applied; evolved signature passive boosts require evolution-stage resolution.",
    ],
  };
}

export function resolvePartyAttack(state, runtime) {
  return (state.party ?? []).map((id) => {
    const monster = state.monsters?.[id];
    if (!monster) throw new Error(`Party member is missing: ${id}`);
    return resolveMonsterAttack(monster, runtime);
  });
}
