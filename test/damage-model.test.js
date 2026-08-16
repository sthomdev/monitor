import assert from "node:assert/strict";
import test from "node:test";
import {
  monsterAttack,
  monsterHealth,
  normalAttackDamage,
  partyAttackAgainst,
  skillDamage,
} from "../src/damage-model.js";

test("monster attack applies multiplicative stats before flat equipment attack", () => {
  const attack = monsterAttack({
    baseAttack: 100,
    level: 11,
    attackIv: 1.2,
    rarityMultiplier: 1.1,
    equipmentAttackPercent: 0.25,
    equipmentFlatAttack: 30,
  });

  assert.equal(attack, 360);
});

test("monster health applies HP growth and rounds after flat equipment HP", () => {
  const health = monsterHealth({
    baseHealth: 100,
    level: 11,
    healthIv: 1.2,
    rarityMultiplier: 1.1,
    passiveHealthMultiplier: 1.1,
    awakeningMultiplier: 1.2,
    jobMultiplier: 1.25,
    equipmentHealthPercent: 0.25,
    perkHealthMultiplier: 1.12,
    breedingMultiplier: 1.04,
    equipmentFlatHealth: 30,
  });

  assert.equal(health, 728);
});

test("party attack applies element attack equipment only on advantage", () => {
  const monsters = [
    { baseAttack: 100, element: "fire", elementAttackBonus: 0.2 },
    { baseAttack: 100, element: "water", elementAttackBonus: 0.2 },
  ];
  const matchup = (attacker, target) => attacker === "fire" && target === "earth" ? 1.7 : 1;

  assert.equal(partyAttackAgainst(monsters, matchup, "earth"), 304);
});

test("normal damage includes critical and boss multipliers", () => {
  assert.equal(
    normalAttackDamage({
      partyAttack: 100,
      attackBuff: 1.1,
      roleMultiplier: 1.2,
      critical: true,
      criticalDamage: 2,
      boss: true,
      bossDamage: 0.5,
    }),
    396,
  );
});

test("skill damage applies skill power and advantageous element bonus", () => {
  assert.equal(
    skillDamage({
      attack: 100,
      skillPower: 2,
      skillPowerBonus: 0.25,
      elementMultiplier: 1.7,
      elementAttackBonus: 0.2,
      roleMultiplier: 1.1,
    }),
    561,
  );
});
