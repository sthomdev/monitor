# TASMON Analyzer

A local, read-only analyzer for the installed TASMON game.

## Requirements

- Node.js 22 or newer
- A TASMON installation at the sibling directory documented in `context.md`

## Commands

From this directory:

```powershell
npm run check
npm test
npm start -- list 'src/game/(battle|data|equipment|state)\.js$'
npm start -- extract /src/game/battle.js extracted/battle.js
npm start -- inspect-save path\to\save.json
npm start -- party-attack path\to\save.json
npm start -- export-save save.json
npm start -- render-report save.json report.html
npm start -- live
npm start -- craft 1 9222 gear --confirm
npm start -- constellation
```


To generate report for active party:
```powershell
node src/cli.js render-report save.json report_3.html
node src/cli.js render-report save.json report_3.html
```


The default archive is:

```text
..\resources\app.asar
```

The analyzer reads the ASAR index and selected files directly. It does not unpack or modify the game archive.

## Exporting The Live Save

Close TASMON, then launch it with a local DevTools port:

```powershell
& "..\TaskbarMonsters.exe" --remote-debugging-port=9222
```

With the game running, export the save into this project:

```powershell
node src/cli.js export-save save.json
```

The exporter reads `localStorage["taskbar-idle-rpg-save"]` through the local DevTools connection. It does not write to localStorage or the game profile. Use `backup` as the third argument to export the backup key instead:

```powershell
node src/cli.js export-save backup.json 9222 backup
```

## Craft Controller

The craft controller is separate from the read-only analyzer. It connects to the running game through the local DevTools port and clicks the game's existing Compound, Auto-fill, and Craft controls. The game remains responsible for item validation, success rolls, inventory changes, cube XP, and saving.

It requires explicit confirmation:

```powershell
node src/cli.js craft 5 9222 gear --confirm
node src/cli.js craft 5 9222 charm --confirm
node src/cli.js craft 1 9222 gear --confirm --loop
```

Before each run it reads the live debug state, requires a safe group of nine unlocked, unequipped items, and reports an explicit `exitReason` when it stops. Without `--confirm`, it refuses to run because crafting changes the live game state.

Add `--loop` to repeat verified crafts every 10 seconds. The loop stops when no safe nine-item group remains or any controller check fails. Press `Ctrl+C` to stop it manually.

## Live Battle Dashboard

With TASMON running on its local DevTools port, start the read-only dashboard:

```powershell
node src/cli.js live
```

Open `http://127.0.0.1:4173`. The dashboard samples a narrow projection from `window.__battleDebug()` once per second through CDP. It reports gross battle gold per minute, net gold per minute, party experience per minute, kills per minute, current stage, and current party progress. Gross gold counts positive gold changes; net gold also includes spending. The dashboard binds to localhost and does not modify the game archive, renderer code, Local Storage, or save data.

## Constellation Viewer

Start the read-only perk board viewer with:

```powershell
node src/cli.js constellation
```

Open `http://127.0.0.1:4180`. Select a party member to overlay activated nodes and inspect aggregate Attack, HP, and secondary perk bonuses from the exported `save.json`.

## Current Scope

- ASAR file indexing and selective extraction
- Read-only validation and summary of exported save JSON
- Real party attack and maximum HP resolution using the installed game definitions
- Standalone HTML attack, maximum HP, and skill calculation report
- Pure normal-attack and skill-damage calculations
- Tests for the confirmed damage formula
- Documentation of Raise and breeding skill inheritance rules

The report's maximum HP section shows the party total and each member's breakdown. It uses the installed game's HP formula: `round((base HP x level growth x HP IV x rarity x passive x awakening x job x pinnacle x equipment HP% x perk x breeding x collection) + equipment flat HP)`. The skill section shows each equipped skill's neutral single-target baseline. It includes attack, skill power, equipment/perk/job skill-power bonuses, and cooldown. Element matchup, role matchup, boss/trial modifiers, buffs, and critical state are shown as formula factors but are not assumed in the neutral baseline.

Skill inheritance rules are documented in the `context.md` section `Skill Inheritance: Raise vs. Breeding`. In short, Raise (feeding a departing Tasmon to a Growing Tasmon) can transfer one eligible skill only when the target has an open learned-skill slot. The full list of exclusions and the separate breeding rules are described there.
