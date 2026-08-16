function finiteOr(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

export function monsterAttack(stats) {
  const level = finiteOr(stats.level, 1);
  const intrinsic =
    finiteOr(stats.baseAttack, 0) *
    (1 + (level - 1) * 0.1) *
    finiteOr(stats.attackIv, 1) *
    finiteOr(stats.rarityMultiplier, 1) *
    finiteOr(stats.passiveAttackMultiplier, 1) *
    finiteOr(stats.awakeningMultiplier, 1) *
    finiteOr(stats.jobMultiplier, 1) *
    finiteOr(stats.pinnacleMultiplier, 1) *
    (1 + finiteOr(stats.equipmentAttackPercent, 0)) *
    finiteOr(stats.perkAttackMultiplier, 1) *
    finiteOr(stats.breedingMultiplier, 1) *
    finiteOr(stats.collectionAttackMultiplier, 1);

  return intrinsic + finiteOr(stats.equipmentFlatAttack, 0) * finiteOr(stats.collectionAttackMultiplier, 1);
}

export function monsterHealth(stats) {
  const level = finiteOr(stats.level, 1);
  const intrinsic =
    finiteOr(stats.baseHealth, 0) *
    (1 + (level - 1) * 0.12) *
    finiteOr(stats.healthIv, 1) *
    finiteOr(stats.rarityMultiplier, 1) *
    finiteOr(stats.passiveHealthMultiplier, 1) *
    finiteOr(stats.awakeningMultiplier, 1) *
    finiteOr(stats.jobMultiplier, 1) *
    finiteOr(stats.pinnacleMultiplier, 1) *
    (1 + finiteOr(stats.equipmentHealthPercent, 0)) *
    finiteOr(stats.perkHealthMultiplier, 1) *
    finiteOr(stats.breedingMultiplier, 1) *
    finiteOr(stats.collectionHealthMultiplier, 1);

  return Math.round(intrinsic + finiteOr(stats.equipmentFlatHealth, 0) * finiteOr(stats.collectionHealthMultiplier, 1));
}

export function partyAttackAgainst(monsters, elementMultiplier = () => 1, targetElement = null) {
  return monsters.reduce((total, monster) => {
    const elementalMultiplier = elementMultiplier(monster.element, targetElement);
    const advantageousEquipment = elementalMultiplier > 1
      ? 1 + finiteOr(monster.elementAttackBonus, 0)
      : 1;
    return total + monsterAttack(monster) * elementalMultiplier * advantageousEquipment;
  }, 0);
}

export function normalAttackDamage({
  partyAttack,
  attackBuff = 1,
  roleMultiplier = 1,
  trialMultiplier = 1,
  critical = false,
  criticalDamage = 1.5,
  boss = false,
  bossDamage = 0,
}) {
  return Math.round(
    partyAttack *
    attackBuff *
    roleMultiplier *
    trialMultiplier *
    (critical ? criticalDamage : 1) *
    (boss ? 1 + bossDamage : 1),
  );
}

export function skillDamage({
  attack,
  skillPower,
  skillPowerBonus = 0,
  attackBuff = 1,
  elementMultiplier = 1,
  elementAttackBonus = 0,
  roleMultiplier = 1,
  bossMultiplier = 1,
  trialMultiplier = 1,
  critical = false,
  criticalDamage = 1.5,
}) {
  const advantageousEquipment = elementMultiplier > 1 ? 1 + elementAttackBonus : 1;
  return Math.round(
    attack *
    skillPower *
    (1 + skillPowerBonus) *
    attackBuff *
    elementMultiplier *
    advantageousEquipment *
    roleMultiplier *
    bossMultiplier *
    trialMultiplier *
    (critical ? criticalDamage : 1),
  );
}
