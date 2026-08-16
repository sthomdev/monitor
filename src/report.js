import fs from "node:fs/promises";
import path from "node:path";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatNumber(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}

function multiplier(label, value) {
  return `<div class="factor"><span>${escapeHtml(label)}</span><strong>x${formatNumber(value)}</strong></div>`;
}

function memberCard(member, index) {
  const c = member.components;
  return `<article class="member">
    <header class="member-header">
      <div class="member-index">0${index + 1}</div>
      <div><h2>${escapeHtml(member.speciesName)}</h2><p>${escapeHtml(member.speciesId)} · Level ${escapeHtml(member.level)}</p></div>
      <div class="attack"><small>ATTACK</small><strong>${formatNumber(member.attack)}</strong></div>
    </header>
    <div class="formula"><span>${formatNumber(c.baseAttack)}</span><i>base</i> × <span>${formatNumber(1 + (member.level - 1) * 0.1)}</span><i>level</i> × <span>${formatNumber(c.attackIv)}</span><i>IV</i> × <span>${formatNumber(c.rarityMultiplier)}</span><i>rarity</i> × <span>${formatNumber(c.passiveMultiplier)}</span><i>passive</i> × <span>${formatNumber(c.awakeningMultiplier)}</span><i>awakening</i> × <span>${formatNumber(c.jobMultiplier)}</span><i>job</i></div>
    <div class="factors">
      ${multiplier("Equipment %", 1 + c.equipmentAttackPercent)}
      ${multiplier("Perks", c.perkMultiplier)}
      ${multiplier("Breeding", c.breedingMultiplier)}
      ${multiplier("Collection", c.collectionAttackMultiplier)}
    </div>
    <div class="flat"><span>Equipment flat attack</span><strong>+${formatNumber(c.equipmentFlatAttack)}</strong></div>
    <details><summary>Assumptions</summary><ul>${member.assumptions.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></details>
  </article>`;
}

function healthCard(member, index) {
  const c = member.components;
  return `<article class="member health-card">
    <header class="member-header">
      <div class="member-index">0${index + 1}</div>
      <div><h2>${escapeHtml(member.speciesName)}</h2><p>${escapeHtml(member.speciesId)} · Level ${escapeHtml(member.level)}</p></div>
      <div class="health"><small>MAX HP</small><strong>${formatNumber(member.health)}</strong></div>
    </header>
    <div class="formula"><span>${formatNumber(c.baseHealth)}</span><i>base</i> × <span>${formatNumber(1 + (member.level - 1) * 0.12)}</span><i>level</i> × <span>${formatNumber(c.healthIv)}</span><i>IV</i> × <span>${formatNumber(c.healthRarityMultiplier)}</span><i>rarity</i> × <span>${formatNumber(c.passiveHealthMultiplier)}</span><i>passive</i> × <span>${formatNumber(c.healthAwakeningMultiplier)}</span><i>awakening</i> × <span>${formatNumber(c.healthJobMultiplier)}</span><i>job</i></div>
    <div class="factors">
      ${multiplier("Equipment %", 1 + c.equipmentHealthPercent)}
      ${multiplier("Perks", c.healthPerkMultiplier)}
      ${multiplier("Breeding", c.healthBreedingMultiplier)}
      ${multiplier("Collection", c.collectionHealthMultiplier)}
    </div>
    <div class="flat"><span>Equipment flat HP</span><strong>+${formatNumber(c.equipmentFlatHealth)}</strong></div>
    <details><summary>Assumptions</summary><ul>${member.assumptions.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></details>
  </article>`;
}

function skillCard(member, skill) {
  const damage = skill.neutralSingleTargetDamage == null
    ? "Effect-specific"
    : formatNumber(skill.neutralSingleTargetDamage);
  return `<article class="skill">
    <div class="skill-top"><div><span class="skill-type">${escapeHtml(skill.type)}</span><h3>${escapeHtml(skill.name)}</h3><p>${escapeHtml(member.speciesName)} · ${escapeHtml(skill.id)}</p></div><div class="skill-damage"><small>NEUTRAL HIT</small><strong>${damage}</strong></div></div>
    <div class="skill-grid"><div><span>Power</span><b>x${formatNumber(skill.power)}</b></div><div><span>Skill power bonus</span><b>+${formatNumber(skill.skillPowerBonus * 100)}%</b></div><div><span>Cooldown</span><b>${skill.cooldown == null ? "-" : `${formatNumber(skill.cooldown)}s`}</b></div></div>
    <p class="skill-note">${escapeHtml(skill.damageNotes)}</p>
  </article>`;
}

const baseStyles = `:root{color-scheme:dark;--ink:#eef1eb;--muted:#9da79d;--line:#2d3730;--panel:#151b17;--panel2:#1b241e;--accent:#b7e36b;--accent2:#75c8b2;--bg:#0d110e}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 12% 0%,#243625 0,#101610 38%,var(--bg) 72%);color:var(--ink);font:15px/1.5 "Segoe UI",system-ui,sans-serif;min-height:100vh}main{max-width:1040px;margin:0 auto;padding:56px 24px 72px}.eyebrow{color:var(--accent);font:700 11px/1.2 Consolas,monospace;letter-spacing:2px;text-transform:uppercase}h1{font:600 clamp(2.2rem,6vw,4.8rem);line-height:.98;letter-spacing:-2px;margin:14px 0 18px;max-width:700px}p{color:var(--muted);margin:0}.hero{display:flex;justify-content:space-between;gap:24px;align-items:end;border-bottom:1px solid var(--line);padding-bottom:34px}.total{text-align:right}.total small,.attack small{display:block;color:var(--muted);font:700 10px Consolas,monospace;letter-spacing:1.5px}.total strong{display:block;color:var(--accent);font-size:42px;line-height:1.05}.section-label{color:var(--accent2);font:700 11px Consolas,monospace;letter-spacing:1.5px;text-transform:uppercase;margin:34px 0 12px}.global-formula{background:#111812;border:1px solid var(--line);padding:18px 20px;color:#d5e4d2;font:14px/1.8 Consolas,monospace;overflow:auto}.global-formula b{color:var(--accent)}.members{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px}.member{background:linear-gradient(145deg,var(--panel2),var(--panel));border:1px solid var(--line);padding:20px}.member-header{display:grid;grid-template-columns:32px 1fr auto;gap:12px;align-items:start}.member-index{color:var(--accent);font:700 13px Consolas,monospace;padding-top:5px}.member h2{font-size:21px;margin:0 0 2px}.member p{font:12px Consolas,monospace}.attack{text-align:right}.attack strong{display:block;color:var(--accent);font-size:28px;line-height:1.1;margin-top:4px}.formula{margin:22px 0 16px;padding:12px;background:#0f1511;color:#dce8d9;font:12px/2 Consolas,monospace}.formula span{color:var(--accent)}.formula i{color:var(--muted);font-style:normal;font-size:10px}.factors{display:grid;grid-template-columns:1fr 1fr;border-top:1px solid var(--line)}.factor{display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--line);color:var(--muted);font-size:13px}.factor:nth-child(odd){padding-right:10px;border-right:1px solid var(--line)}.factor:nth-child(even){padding-left:10px}.factor strong{color:var(--ink);font:13px Consolas,monospace}.flat{display:flex;justify-content:space-between;padding:14px 0;color:var(--muted);font-size:13px}.flat strong{color:var(--accent2);font:700 14px Consolas,monospace}details{border-top:1px solid var(--line);padding-top:10px;color:var(--muted);font-size:12px}summary{cursor:pointer;color:var(--accent2)}li{margin:6px 0}footer{margin-top:34px;color:#718075;font:11px Consolas,monospace}@media(max-width:600px){main{padding:34px 15px 48px}.hero{display:block}.total{text-align:left;margin-top:26px}.total strong{font-size:36px}.member-header{grid-template-columns:28px 1fr}.attack{grid-column:2;text-align:left}.attack strong{font-size:25px}}`;
const skillStyles = `.health strong{color:var(--accent2)}.skills{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px}.skill{background:linear-gradient(145deg,var(--panel2),var(--panel));border:1px solid var(--line);padding:20px}.skill-top{display:flex;justify-content:space-between;gap:12px}.skill-type{color:var(--accent2);font:700 10px Consolas,monospace;text-transform:uppercase}.skill h3{margin:5px 0 2px;font-size:19px}.skill p{font:11px Consolas,monospace}.skill-damage{text-align:right}.skill-damage small{display:block;color:var(--muted);font:700 10px Consolas,monospace}.skill-damage strong{display:block;color:var(--accent);font-size:25px;line-height:1.1;margin-top:4px}.skill-grid{display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid var(--line);border-bottom:1px solid var(--line);margin-top:18px}.skill-grid div{padding:10px 8px 10px 0;border-right:1px solid var(--line)}.skill-grid div+div{padding-left:8px}.skill-grid div:last-child{border:0}.skill-grid span{display:block;color:var(--muted);font-size:11px}.skill-grid b{font:13px Consolas,monospace}.skill-note{color:var(--muted);font-size:11px!important;margin-top:13px}@media(max-width:600px){.skill-top{display:block}.skill-damage{text-align:left;margin-top:15px}.skill-grid{grid-template-columns:1fr 1fr}.skill-grid div:nth-child(2){border:0}.skill-grid div:last-child{grid-column:1/-1;border-top:1px solid var(--line);padding-left:0}}`;

export function renderReport({ party, generatedAt = new Date().toISOString() }) {
  const total = party.reduce((sum, member) => sum + member.attack, 0);
  const totalHealth = party.reduce((sum, member) => sum + member.health, 0);
  const skills = party.flatMap((member) => member.skills.map((skill) => skillCard(member, skill)));
  const health = party.map(healthCard).join("");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>TASMON Attack Report</title>
<style>
${baseStyles}${skillStyles}
</style></head><body><main>
  <section class="hero"><div><div class="eyebrow">TASMON / combat worksheet</div><h1>How party attack is built.</h1><p>Resolved from the installed game definitions and exported save data.</p></div><div class="total"><small>PARTY ATTACK</small><strong>${formatNumber(total)}</strong></div></section>
  <div class="section-label">Formula</div><div class="global-formula"><b>attack</b> = (base × level × IV × rarity × passive × awakening × job × equipment% × perks × breeding × collection) + equipment flat</div>
  <div class="section-label">Active party / ${party.length} members</div><section class="members">${party.map(memberCard).join("")}</section>
  <div class="section-label">Party maximum HP / ${formatNumber(totalHealth)}</div><div class="global-formula"><b>maximum HP</b> = (base × level × IV × rarity × passive × awakening × job × equipment% × perks × breeding × collection) + equipment flat</div><section class="members">${health}</section>
  <div class="section-label">Skill final damage / neutral baseline</div><div class="global-formula"><b>skill damage</b> = attack × skill power × (1 + skill power bonus) × element × role × boss × trial × critical</div><section class="skills">${skills.join("")}</section>
  <footer>Generated ${escapeHtml(generatedAt)} · Read-only analysis · Values reflect the current exported save</footer>
</main></body></html>`;
}

export async function writeReport(outputPath, report) {
  await fs.writeFile(outputPath, report, "utf8");
}
