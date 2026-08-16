# TASMON Investigation Context

Date: 2026-08-13

## Game Layout

- Install root: `D:\steam\steamapps\common\TASMON Taskbar Monsters`
- Executable: `TaskbarMonsters.exe`
- Runtime: Electron application using Pixi for rendering.
- Main archive: `resources\app.asar` (approximately 1.3 GB).
- Unpacked native dependency: `resources\app.asar.unpacked\node_modules\steamworks.js`
- The `info_project` directory was initially empty.

The ASAR contains readable first-party JavaScript and JSON. The most relevant files are:

- `resources\app.asar\src\game\battle.js`
- `resources\app.asar\src\game\state.js`
- `resources\app.asar\src\game\data.js`
- `resources\app.asar\src\game\equipment.js`
- `resources\app.asar\ui.js`
- `resources\app.asar\src\battle-scene.js`

## Save Storage

- Electron user data is stored under `%APPDATA%\Taskbar Monsters`.
- The game saves state in Chromium Local Storage LevelDB.
- Main save key: `taskbar-idle-rpg-save`.
- Backup key: `taskbar-idle-rpg-save-backup`.
- The value is a JSON string consumed by `state.deserialize()`.
- Current save version is `2`; version `1` is migrated to the party-array format.
- The analyzer reads exported JSON files only and does not access or modify the live LevelDB database.

## Confirmed Normal Attack Formula

The live attack loop in `ui.js` calculates a normal hit as:

```text
round(
  partyAtkVs(targetElement)
  * attackBuff
  * roleMultiplier
  * trialMultiplier
  * criticalMultiplier
  * bossMultiplier
)
```

`partyAtkVs` sums the effective attack of every living party member. For each member:

```text
monsterAtk =
  baseAttack
  * levelMultiplier
  * attackIV
  * rarityMultiplier
  * passiveAttackMultiplier
  * awakeningMultiplier
  * jobMultiplier
  * pinnacleMultiplier
  * (1 + equipmentAttackPercent)
  * perkAttackMultiplier
  * breedingMultiplier
  * collectionAttackMultiplier
  + equipmentFlatAttack
```

The per-member value is then multiplied by the elemental matchup. Equipment `elemAtk` adds another multiplier only when that member has elemental advantage.

## Confirmed Critical Behavior

- Base critical chance: `0.05`.
- Critical chance is affected by equipment, perks, job stats, and average critical IV.
- The stored party critical chance is capped at `0.50`.
- Combat adds temporary critical buffs and applies a final combat cap of `0.80`.
- Base critical damage multiplier: `1.5`.
- Equipment and perks can increase critical damage, capped at `3.0`.
- Expected critical DPS multiplier:

```text
1 + criticalChance * (criticalDamageMultiplier - 1)
```

## Confirmed Skill Formula

For a standard single-target nuke skill:

```text
round(
  monsterAtk
  * skillPower
  * skillPowerBonuses
  * attackBuff
  * elementMultiplier
  * advantageousElementEquipmentBonus
  * roleMultiplier
  * bossMultiplier
  * trialMultiplier
  * criticalMultiplier
)
```

Skill-power bonuses come from equipment, perks, and job stats. Skill definitions live in `data.js` and are modified by evolution tiers and awakening.

Special skill behavior also exists for:

- Area-of-effect attacks
- Multi-hit attacks
- Damage-over-time attacks
- Drain attacks
- Execute attacks
- Skill-to-area conversion equipment
- Skill-specific healing or defensive effects

## Related Incoming-Damage Formula

Enemy damage is calculated separately as:

```text
round(
  enemyAttack
  * bossAttackMultiplier
  * partyElementDefenseMultiplier
  * defenseReduction
  * hazardMultiplier
  * rookieProtectionMultiplier
)
```

Defense reduction combines temporary defense buffs, equipment defense, perks, and job defense stats, with a minimum damage floor. Elemental resistance and weakness affect the incoming multiplier.

## Stats That Affect Damage Output

Direct hit magnitude:

- Species base attack
- Level
- Attack IV
- Rarity
- Passive attack effects
- Awakening
- Evolution job
- Pinnacle effect
- Equipment percentage attack
- Equipment flat attack
- Perks and breeding modifiers
- Collection bonus
- Element matchup
- Advantageous-element equipment attack
- Role matchup
- Attack buffs
- Trial modifiers
- Critical chance and critical damage
- Boss damage equipment when fighting a boss
- Skill power and skill-specific effects

Damage frequency or total DPS, rather than individual hit size:

- Attack speed
- Skill cooldown reduction
- Number of attacks or skill hits
- Damage-over-time duration

## Investigation Plan

1. Continue static extraction from the ASAR and catalog `data.js` stat definitions, equipment stats, perks, jobs, and skills.
2. Create a local analyzer that reads the relevant game data and a save file, then predicts attack and skill damage.
3. Validate predictions in a fixed stage against a controlled target.
4. Change one variable at a time and record displayed damage, critical state, attack interval, enemy element, and skill type.
5. Use runtime memory inspection only for randomized or state-dependent values that cannot be reproduced reliably through normal gameplay.

The analyzer now has a `party-attack` command that regenerates `.runtime` from the installed ASAR, dynamically loads the real `data.js`, `equipment.js`, and `breeding.js` modules, and resolves each saved party member's attack. It currently leaves collection attack bonuses at `1` and uses the base species passive; those two values are UI/evolution aggregates that will be resolved in a later pass.

The resolver and HTML report also calculate maximum HP per party member and for the party total. The installed game formula is:

```text
round(
  (baseHp
    × (1 + (level - 1) × 0.12)
    × iv.hp
    × rarity
    × passive.hpMult
    × awakening.hp
    × job.hp
    × pinnacle.hp
    × (1 + equipment.hpPct)
    × perk.hp
    × breeding
    × collection.hp)
  + equipment.hpFlat × collection.hp)
```

As with attack, collection HP is currently `1` because the UI-side aggregate is not yet resolved.

## Skill Inheritance: Raise vs. Breeding

The game has two different skill-transfer systems. The user's “Raise” flow is implemented as `feedMonster()`: a departing Tasmon (`food`) gives experience to the Growing Tasmon (`target`) and then is removed. Breeding is a separate two-parent flow that creates an egg.

### Raise / feeding

The target can inherit **at most one** skill from the departing Tasmon during one Raise operation. The transfer is considered only when all of these conditions hold:

1. The target is not already at the learned-skill limit. `SKILL_LEARN_MAX` is `4`, so `target.learnedSkills.length < 4` is the open-slot check.
2. Inheritance has not been suppressed with the internal `noInherit` option. The normal UI path does not suppress it; the option exists for batch feeding behavior.
3. The departing Tasmon has at least one eligible skill that the target does not already know.

The donor's candidate list is filtered as follows:

- The skill must exist in the current `SKILLS` table.
- `jobOnly` skills cannot be donated through Raise. These are tied to a rare or hidden evolution job.
- `signature` skills cannot be donated through Raise. These are tied to a species/evolution signature.
- A skill already present in `target.learnedSkills` is not a candidate.

The target's own species skill is included in `learnedSkills` by default, so it occupies one of the four learned-skill slots. A target with four learned skills cannot inherit another until one is forgotten. Forgetting a skill also removes it from the equipped loadout if it was set, and the game always preserves at least one learned skill.

If eligible candidates exist, the player may identify one with `skillId`; if that ID is not in the candidate list, the game chooses one candidate using its random source. If there are no eligible candidates, no skill is inherited. The donor is still consumed for the Raise's experience transfer, subject to the ordinary Raise validity checks.

Raise validity also requires that the target and donor exist, are different, neither is on an expedition, the target is below the level cap, and the donor is not the last remaining Tasmon. These conditions prevent the operation itself; they are separate from the skill-slot test.

The preview uses the same candidate filter as the actual operation, so the candidates shown before confirming Raise are the skills that can actually transfer. Raising affects learned skills, not the equipped loadout directly. A learned skill must still be selected for one of the maximum two equipped skill slots before it is used in combat.

### Breeding

Breeding does not use the Raise open-slot check because it creates a new child rather than adding to an existing target. Each parent can contribute one selected skill, for up to two distinct inherited skills in the egg. A parent's candidates are its `learnedSkills` minus the child's species base skill. Duplicate inherited skills collapse to one copy. If no selection is made, the default is the parent's highest-star candidate, with skill ID order breaking ties. An invalid requested skill falls back to that default.

The breeding path's candidate filter is not the same as Raise's: `inheritChoices()` removes only the child's base skill and does not apply Raise's `jobOnly`/`signature` exclusions. Therefore, “can be inherited through Raise” and “can be selected from a breeding parent” should not be treated as interchangeable rules.

The generated HTML report also resolves each equipped skill from the installed `data.js`. Direct nuke skills show a neutral single-target baseline:

```text
round(attack × skill power × (1 + equipment skillPower + perk skillPower + job skillPower))
```

The baseline excludes target element, role, boss, trial, temporary buffs, and critical state. Non-nuke skills are listed as effect-specific rather than being treated as direct damage.

## Caveats

- The formulas above are confirmed from the installed JavaScript implementation, but runtime validation is still needed to catch save-version differences, hidden state, rounding behavior outside the inspected paths, or effects applied by temporary buffs.
- The archive contains Japanese comments and some terminal output displayed with incorrect character decoding. Identifiers and executable expressions remain readable.

## Latest Findings (2026-08-14)

### Analyzer and live-monitor status

- The project is a read-only analyzer. It reads exported save JSON and game state through CDP; it must not modify saves, LevelDB, or game state.
- Extracted authoritative modules are in `extracted/`; regenerated runtime modules are in `.runtime/`.
- The live dashboard uses the game's `window.__battleDebug` hook when available and a local read-only fallback when the hook is stale.
- Live rate smoothing uses an exponential moving average with a 30-second time constant. Exposed rates include gross/net gold per minute, experience per minute, kills per minute, experience per member, and eggs per hour.
- Validation status: `npm run check` passes and `npm test` passes with 12 tests.

### Constellation optimizer

- `src/constellation.js` exposes constellation data and an on-demand legal beam-search optimizer.
- The optimizer supports primary and secondary priorities among `atk`, `hp`, and `skillPower`.
- Special sector gates are controlled by `SPHERE_SECTOR_SPECIALS`; the viewer renders the selected legal route as a green overlay.
- API endpoints are `GET /api/constellation` and `POST /api/constellation/optimize`.

### Egg telemetry

- Egg chance is calculated as `base chance * (1 + max(0, partyDropBonus))`, with the existing rookie/post-rookie multiplier applied to the base portion.
- The dashboard estimates eggs per hour as:

  ```text
  EMA kills per minute * 60 * current egg chance
  ```

- A verified live sample returned an egg chance of approximately `0.0002910154`, a global bonus of approximately `0.1023312`, `74.0356` kills per minute, and approximately `1.2927` eggs per hour. These are runtime observations, not permanent constants.

### Buff skills and Gloriacat

- The current party member identified as Gloriacat is `peachcat`, level 65, job `overlord`, awakening 0, with `ribbonbatrally` and `soulflamestrike` equipped.
- `ribbonbatrally` provides a +14% party attack active buff for 5 seconds on a 7-second cooldown, plus a +7% personal attack passive.
- Ordinary skill-power bonuses do not increase the magnitude of the buff branch; the buff uses the skill's own `power` value.
- Party cooldown reduction is capped at 50% and multiplies skill cooldown by `(1 - partyCdr)`.
- Permanent uptime for Ribbon Bat Rally begins at 28.57% CDR because `7 * (1 - 0.2857) = 5` seconds.
- Awakening scales both the active buff power and cooldown. For example, Awakening I changes +14% to +18.76% and reduces the 7-second cooldown to 6.23 seconds. Awakening III changes the buff to +31.5% and the cooldown to 4.9 seconds. At 50% party CDR, uptime is already permanent, so awakening primarily improves buff magnitude.

### Skill-description stats and combat formulas

- A skill description contains several different kinds of values; they are not all part of the monster attack multiplier.
- `Attack xN` or a displayed skill `power` is the skill's base active power. For a direct nuke, the neutral single-target formula is:

  ```text
  skill damage = monsterAtk
    * skill active power
    * (1 + equipment skillPower + perk skillPower + job skillPower)
    * temporary attack buff
    * element multiplier
    * advantageous-element equipment multiplier
    * role multiplier
    * boss/trial multipliers
    * critical multiplier
  ```

- Therefore, skill power is applied after the monster's normal `monsterAtk` has already been resolved. It is not another term inside the monster attack stat formula, but it is part of the full skill-damage equation.
- Awakening modifies the skill's active power and cooldown through `AWAKENING.skill`. It is separate from equipment/perk/job `skillPower` bonuses.
- Multi-hit skills use `power * hits` for total skill output. Damage-over-time skills distribute the calculated total over their duration. Execute skills can multiply the result when the target is below their execute threshold. Area conversion equipment can change a single-target skill into an area attack and apply its conversion scale.
- `CD N seconds` is the skill's base cooldown. Runtime cooldown is `base cooldown * (1 - party CDR)`, with awakening cooldown scaling applied to the skill definition before party CDR.
- Skill `passive` lines are always-on effects. `atkMult` and `hpMult` modify the owning monster's normal stats; `dropBonus` and `goldBonus` are party-wide economy bonuses; `expBonus` is equipment/job-based in the current implementation.
- Active buffs use their own active `power` directly. For example, Ribbon Bat Rally's `power: 0.14` means party attack `+14%`; ordinary equipment, perk, and job `skillPower` do not multiply that buff branch.
- Active healing uses `max HP * active power * skill-power multiplier`. Guard skills use skill power for shield size and counter damage, while the basic guard damage-reduction amount is capped from the active power itself.
- A skill description's passive attack percentage can affect the monster attack term, while the active skill percentage affects only that skill activation. They should not be added together as if they were the same multiplier.

### Awakening ritual

- Without a same-species copy, the only awakening route is the ritual using other monsters as shard fodder.
- Same-species fodder gives a guaranteed +1 awakening. Different-species fodder contributes shards and rolls a success chance; the maximum is 90%, never 100%.
- The ritual shard value is:

  ```text
  rarity stars
  * (1 + 0.02 * (level - 1))
  * (1 + awakening)
  * 0.6 ^ max(0, target stars - fodder stars)
  ```

- Current shard requirements are `0->1: 12`, `1->2: 18`, `2->3: 48`, `3->4: 72`, `4->5: 144`, and `5->6: 216`.
- For a common target such as Gloriacat, common fodder has no rarity-gap penalty. Higher-star, higher-level, and already-awakened fodder is mathematically more efficient, but sacrificing useful party members or rare monsters is usually economically poor.
- A level-65, one-star, non-awakened fodder monster is worth `1 * (1 + 64 * 0.02) = 2.28` shards. Six such fodder reach the 90% cap for Awakening 0->1; this is an example calculation, not an exact current-roster recommendation.
- Best practical policy: preserve core party members, accumulate disposable high-level fodder, use awakened fodder only when its opportunity cost is acceptable, and save a future same-species copy for guaranteed progress.

### Read-only investigation constraint

- Runtime inspection and reports are for understanding formulas and planning only. Do not call mutation paths such as feeding, awakening, toggling debug boosts, or save writes from the analyzer.
