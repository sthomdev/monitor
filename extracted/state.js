import {
  AWAKENING,
  AWAKEN_MAX,
  dexTotals,
  DIFFICULTIES,
  EGG_DROP_CHANCE,
  elementMult,
  GRADES,
  gradeFromIv,
  IV_MAX_BRED,
  LEVEL_CAP,
  MAX_EGG_SLOTS,
  OFFLINE_CAP_MS,
  KILLS_PER_STAGE,
  STAGES_PER_DIFFICULTY,
  PERKS,
  perkMilestones,
  skillMilestones,
  RARITY_META,
  RARITY_ORDER,
  SHINY_FEED_INHERIT,
  SKILLS,
  skillChoices,
  SPECIES,
  EVOLVE_LEVELS,
  EVOLVE_GOLD_PER_STAR,
  EVOLVE_STAGE_MULT,
  EVOLVE_RARITY_SLOPE,
  EVOLVE_RANDOM_MULT,
  EVO_STONES,
  EVO_STONE_ROLES,
  EVO_STONE_RARITY,
  EVO_STONE_DROP_CHANCE,
  EVO_STONE_RANDOM_CHANCE,
  EVO_STONE_BOSS_CHANCE,
  EVO_STONE_BOSS_RANDOM_CHANCE,
  EVOLVE_FAIL_CHANCE,
  HIDDEN_JOB_CHANCE,
  JOBS,
  jobStat,
  perkHash,
  RARE_JOB_CHANCE,
  SKIP_JOB_CHANCE,
  PINNACLE_LEVEL,
  PINNACLE_GOLD_PER_STAR,
  PINNACLE_GAMBLE,
  SPHERE_NODES,
  SPHERE_SECTOR_SPECIALS,
  SPHERE_BOARD_REV,
  LIVE_TUNING,
  EXPEDITION_SPOTS_PACK,
  DAILY_BOSSES_PACK,
  stageGimmick,
  STAGE_GIMMICKS,
} from "./data.js";
import { devFlags, devUnlockActive, isDevAllowed } from "./devmode.js";
import {
  expReward,
  expToNext,
  goldReward,
  killsPerSecFromAtk,
  monsterAtk,
  monsterMaxHp,
  effectiveSkill,
  perkStat,
  skillOf,
} from "./battle.js";
import {
  makeEgg, hatchEgg, rollEggDrop, hatchMsOf,
  blessedHatchMsOf, BLESSED_HATCH_COUNT,
} from "./eggs.js";
import { migrateLegacyCoins } from "./gacha.js";
// 進化後の固有名(2026-08-13)。探索の帰還リザルト等、state側が名前を返す場面で使う
// (evolution-names は data.js/i18n.js にしか依存しない=循環importにならない)
import { evolvedNameOf } from "./evolution-names.js";
import { trialListBlockReason, reapRejectedTrials } from "./trial.js";
import {
  CRAFT_COST,
  CUBE_EXP_BY_RARITY,
  CUBE_LEVEL_MAX,
  CUBE_UNLOCK_LEVEL,
  cubeExpToNext,
  EQUIP_DROP_CHANCE,
  NORMAL_CHEST_BONUS_MULT,
  NORMAL_AREA_RARE_BOX_MULT,
  INV_CAP,
  itemBand,
  bandLabel,
  bandMinOf,
  bandCeilOf,
  CHARM_SLOT_UNLOCK,
  CHARM_SLOT_KINDS,
  charmKindOf,
  PARTS,
  ROLE_WEAPONS,
  STAT_META,
  flatStatValue,
  equipLevelMult,
  VALUE_MULT,
  ROLE_WEAPON_ORDER,
  ROLE_SUB_POOL,
  CHARM_BASE_POOL,
  equipLvTier,
  EQUIP_LV_TIERS,
  CHARM_KINDS,
  BASE_STAT_BY_PART,
  PART_UNLOCK,
  PART_SLOTS,
  inferPart,
  itemScore,
  marketListable,
  PART_ORDER,
  equipStat,
  itemSellPrice,
  rerollCost,
  rerollOpts,
  ENHANCE_ROLL_COST,
  ENHANCE_ROLL_COSTS,
  enhancePartCat,
  enhanceSlotsOf,
  rollEnhanceLine,
  rollBossChestItem,
  rollItem,
  rollItemOfRarity,
  forgeUniqueOfRarity,
  rollNormalChestItem,
} from "./equipment.js";
import { breedCost, makeBredEgg, recipeKey } from "./breeding.js";
import { bumpMissionCounter } from "./missions.js";
import { rollBossCoinDrop, rollCoinDrop, COIN_DROP_CHANCE, coinDropWeights } from "./gacha.js";
import { weightedPick } from "./rng.js";
import { rarityWeights, wildEggWeights } from "./data.js";

const SAVE_VERSION = 2;

// パーティの最大人数
export const MAX_PARTY = 3;

// 倉庫(大容量ストレージ)。基本80枠、GPで80枠(1ページ)ずつ拡張できる(ゴールドの継続シンク)。
// 2026-08-07 Haru指示「倉庫の最大拡張枠は7にして」: 上限を80×8=640に拡張(基本80+7ページ)。
// 拡張コストは買うほど激増するため、5〜7ページ目は終盤級のゴールドシンクになる想定
export const STORAGE_BASE_CAP = 80;
export const STORAGE_PAGE = 80;
export const STORAGE_MAX_CAP = 640; // 80×8(基本80 + 7ページ拡張)

export function storageCapOf(state) {
  return Math.min(STORAGE_MAX_CAP, state.storageCap ?? STORAGE_BASE_CAP);
}

// 次の拡張(+1ページ=80枠)のコスト。1〜4回目は既存どおり×10刻み(2026-07-13 FB):
// 2万→20万→200万→2000万。5〜7回目(2026-08-07「最大7に」で追加した分)は
// ×10のままだと2億→20億→200億Gになり事実上買えない(拡張したのに何も変わって
// 見えない=倉庫の最大拡張枠を7にした意味がなくなる)。5回目以降は×5刻みに緩めて
// 1億→5億→25億とし、終盤の周回速度(実測 数百万〜1千万G/時)で数日〜1週間強で
// 届く「見える化」された終盤シンクにする
export function storageSlotCost(state) {
  const bought = Math.max(0, (storageCapOf(state) - STORAGE_BASE_CAP) / STORAGE_PAGE);
  if (bought <= 3) return Math.round(20000 * Math.pow(10, bought));
  return Math.round(20000 * Math.pow(10, 3) * Math.pow(5, bought - 3));
}

export function buyStorageSlot(state) {
  if (storageCapOf(state) >= STORAGE_MAX_CAP) return { error: "倉庫はこれが最大" };
  const cost = storageSlotCost(state);
  if (state.gold < cost) return { error: `${cost.toLocaleString("en-US")} GP 足りない` };
  state.gold -= cost;
  state.storageCap = storageCapOf(state) + STORAGE_PAGE;
  return { cap: state.storageCap, cost };
}

// 宝箱の所持上限。満杯のあいだは新しい宝箱が落ちない。
export const CHEST_CAP = 20; // 旧: 全種合計(表示互換のため残置)
// 種類ごとのストック上限(2026-07-13 FB「宝箱ごとに設定して」)
export const CHEST_CAPS = Object.freeze({ wood: 10, rare: 6, boss: 4 });
export function chestCountOf(state, kind) {
  return (state.chests ?? []).filter((c) => c.kind === kind).length;
}

// ---- 宝箱保管の拡張と自動開封の短縮(2026-07-21 FB「ゴールドで解放できるように」) ----
// ヘル(細工)解禁前のゴールドシンク。値段はレベルごとに跳ね上がり、後半は細工と
// 取り合いになる規模まで伸びる。戦力には直結しない利便系(POWER_REGISTRY.chestKeysに台帳)
export const CHEST_UPG_MAX = 5;
// 2026-07-21 FB「必要金額はもっと傾斜をかけて」: 序盤の入口は安く、後半は細工級の重さに
export const CHEST_CAP_UPG_PRICES = Object.freeze([200_000, 2_000_000, 15_000_000, 100_000_000, 500_000_000]);
export const AUTO_OPEN_UPG_PRICES = Object.freeze([300_000, 3_000_000, 25_000_000, 150_000_000, 750_000_000]);
// 1レベルごとの追加ストック(全種が一緒に伸びる=買い物1本で分かりやすく)
const CHEST_CAP_UPG_BONUS = Object.freeze({ wood: 4, rare: 2, boss: 1 });
export function chestCapOf(state, kind) {
  return (CHEST_CAPS[kind] ?? 10) + (state.chestCapLv ?? 0) * (CHEST_CAP_UPG_BONUS[kind] ?? 0);
}
// 自動開封CDの倍率(Lv5で-60%: 木5分→2分/レア・ボス8分→3.2分)
export function autoOpenCdMult(state) {
  return 1 - 0.12 * (state.autoOpenLv ?? 0);
}
export function buyChestCapUpg(state) {
  const lv = state.chestCapLv ?? 0;
  if (lv >= CHEST_UPG_MAX) return { error: "宝箱保管は もう最大" };
  const cost = CHEST_CAP_UPG_PRICES[lv];
  if (state.gold < cost) return { error: "ゴールドが 足りない" };
  state.gold -= cost;
  state.chestCapLv = lv + 1;
  return { lv: state.chestCapLv, cost };
}
export function buyAutoOpenUpg(state) {
  const lv = state.autoOpenLv ?? 0;
  if (lv >= CHEST_UPG_MAX) return { error: "自動開封は もう最速" };
  const cost = AUTO_OPEN_UPG_PRICES[lv];
  if (state.gold < cost) return { error: "ゴールドが 足りない" };
  state.gold -= cost;
  state.autoOpenLv = lv + 1;
  return { lv: state.autoOpenLv, cost };
}

// ---- 難易度と実効ステージ ----
// 表示上のステージは難易度内の 1..100(1-1〜10-10)。敵の強さ・報酬・
// ドロップテーブルは「実効ステージ」= 難易度×100+面 (1..400) で決まる
export function effectiveStage(state) {
  return (state.difficulty ?? 0) * STAGES_PER_DIFFICULTY + state.stage;
}

// 今の難易度での到達済み最高ステージ
export function maxStageOf(state) {
  return state.maxStageD?.[state.difficulty ?? 0] ?? state.stage;
}

// 今の難易度で幕ボスを初撃破ずみの最高ステージ(10/20/30)
export function bossClearedOf(state) {
  return state.bossClearedD?.[state.difficulty ?? 0] ?? 0;
}

// ---- 機能の段階的開放(2026-07-19 リリース前バッチ1) ----
// 新規プレイヤーが最初から窓10個に圧倒されないよう、機能を進行に応じて開く。
// 判定は進行状態からの純関数(セーブに解放フラグを持たない=移行不要・巻き戻りなし)。
// 既存の進行済みセーブは条件を満たしているので自動的に全開放になる。
export function featureUnlocked(state, feature) {
  if (devUnlockActive(state)) return true; // 検証モード(--tbm-dev 起動時のみ 2026-07-27)
  // 2026-07-19 FB改訂: 「タスモン、合成、地図、倉庫、交易船、目安箱は最初から実装でいい。
  // 探索/調合は4体目が出た時に解放」— ゲートは2つだけに絞る
  const mons = Object.keys(state.monsters ?? {}).length;
  switch (feature) {
    case "exped":
    case "compound":
      return mons >= 4; // 仲間が4体=育成の取捨選択が生まれるタイミング
    default:
      return true;
  }
}
// タスクバーに並ぶ順の解放一覧(UIの差分検知用)
export function unlockedFeatures(state) {
  return ["map", "box", "storage", "eggs", "exped", "cube", "compound", "meyasu", "trade"].filter(
    (f) => featureUnlocked(state, f),
  );
}

// 難易度dが解放されているか(前の難易度の10-10クリアで解放)
export function difficultyUnlocked(state, d) {
  if (d <= 0) return true;
  if (d >= DIFFICULTIES.length) return false;
  if (devUnlockActive(state)) return true; // 検証モード(--tbm-dev 起動時のみ 2026-07-27)
  return (state.bossClearedD?.[d - 1] ?? 0) >= STAGES_PER_DIFFICULTY;
}

// 難易度を切り替える(その難易度の到達済み最高ステージから再開)
export function setDifficulty(state, d) {
  if (!difficultyUnlocked(state, d)) return { error: "前の難易度の 10-10 をクリアで解放" };
  state.difficulty = d;
  state.stage = Math.max(1, Math.min(STAGES_PER_DIFFICULTY, maxStageOf(state)));
  // 到達点が幕ボスの間なら手前の面から(鍵はポータルから使う)。
  // クリア済みでも例外にしない: クリア済みだと10-10に「現在地」として直接置かれ、
  // 鍵なしでボス部屋に入れてしまう上に、地図の10-10ノードが現在地=クリック無反応で
  // 「鍵で挑めない」ように見えるバグだった(2026-07-18 FB)
  if (isBossStage(state.stage) && state.stage > 1) state.stage -= 1;
  state.killsInStage = 0;
  state.settings.loopStage = null;
  return { difficulty: d, stage: state.stage };
}

// x-10(10/20/30)は「幕ボスの間」: ウェーブなし・ボス単体・鍵1本で入場
export function isBossStage(stage) {
  return stage % 10 === 0;
}

// 敗北時の後退先は「常に1段だけ」に統一済み(2026-08-05 Haru指示。旧実装は
// 連敗するほど最大3段まで深く後退する仕様だったが、ボス敗北側だけ先に1段固定へ
// 簡略化されて2経路の挙動が食い違っていた)。実装は ui.js の onPlayerDefeated 側
// (state.stage-1、幕ボスの間だけ素通り)。互換エイリアス(旧: isMileBossStage)
export const isMileBossStage = isBossStage;

// この面のクリアに必要な撃破数(幕ボスの間と難所「巨壁」は巨大な1体だけ)
export function stageKillTarget(stage, difficulty = 0) {
  if (stageGimmick(difficulty, stage)?.kind === "wall") return 1;
  return isBossStage(stage) ? 1 : KILLS_PER_STAGE;
}

let nextMonsterId = 1;
let nextChestId = 1;

// 宝箱を開ける。中身(ドロップ時に確定済みの装備)がインベントリへ入る。
// おまけで「ボスの鍵」が出ることがある(幕ボスの間の入場券)。
export function openChest(state, chestId, rng = Math.random) {
  const idx = state.chests.findIndex((c) => c.id === chestId);
  if (idx === -1) return { error: "その宝箱は ない" };
  if (state.items.length >= invCapOf(state)) return { error: "持ち物が 満杯" };
  const [chest] = state.chests.splice(idx, 1);
  state.items.push(chest.item);
  let key = false;
  if (rng() < KEY_FROM_CHEST_CHANCE) {
    key = !!addBossKey(state, state.difficulty ?? 0); // 今の難易度の鍵(上限で不発)
  }
  return { item: chest.item, key };
}

// extra: { plus, inherited } — 配合の子は+値と継承スキルを持って生まれる(DQM式)。
// 継承スキルはlearnedSkillsに最初から入る(節目カウントはskillPicksで別管理)。
export function makeMonster(speciesId, iv, shiny = false, awakening = 0, extra = {}) {
  const baseSkill = SPECIES[speciesId].skillId;
  const inherited = (extra.inherited ?? []).filter((id) => SKILLS[id] && id !== baseSkill);
  return {
    id: `mon_${Date.now()}_${nextMonsterId++}`,
    speciesId,
    // 試用期間の種族は個体にもIDを写す(2026-07-22 試用システム)。不採用で
    // SPECIESの定義ごと消えた後でも、回収(reapRejectedTrials)が判定できるように
    ...(SPECIES[speciesId].trialId ? { trialId: SPECIES[speciesId].trialId } : {}),
    level: 1,
    exp: 0,
    iv,
    shiny,
    awakening,
    awRev: 2, // 覚醒の段数の版(2=6段化ずみ)。旧セーブの二重移行を防ぐ
    plus: extra.plus ?? 0, // 配合世代の積み上げ(名前に+n・攻撃/HPボーナス)
    equipment: [],
    perks: [], // 兆しの実効果リスト {id, node?}(スフィア盤解放で実体化)
    perkSpent: 0, // 使った兆しポイント数(大スフィア=1ptでperks3件のため別カウント)
    sphere: { taken: [], rev: SPHERE_BOARD_REV }, // スフィア盤の解放済みノード(rev=盤面の中身の版)
    learnedSkills: [baseSkill, ...inherited], // 覚えたスキル(先頭は種族の基本スキル)
    equippedSkills: [baseSkill], // セット中(最大 SKILL_LOADOUT_MAX)
    skillPicks: 0, // レベル節目で選んだスキルの数(継承ぶんと区別する)
  };
}

// 最初の1匹の候補(ポケモン式の3択)。攻め/バランス/守りで性格を分ける
export const STARTER_CHOICES = ["flamewolf", "aquafox", "terrashell"];

// 最初の1匹を選び直す(新規ゲームの3択用)。戦闘が始まる前提なので
// まだ誰も倒していない・仲間が1体だけのときにしか使えない。
export function chooseStarter(state, speciesId) {
  if (state.starterChosen) return { error: "最初の1匹は もう選んだ" };
  if (!STARTER_CHOICES.includes(speciesId)) return { error: "その仲間は 選べない" };
  const oldId = state.party[0];
  const oldSpecies = state.monsters[oldId]?.speciesId;
  const starter = makeMonster(speciesId, { atk: 1.0, hp: 1.0 });
  delete state.monsters[oldId];
  if (oldSpecies && oldSpecies !== speciesId) delete state.dex?.[oldSpecies];
  state.monsters[starter.id] = starter;
  state.party = [starter.id];
  state.starterChosen = true;
  registerDex(state, speciesId);
  return { monster: starter };
}

// 最初の卵は4種(2026-07-29 Haru指示「4種類用意して、ジョブごとにどれを選ぶ?と
// できるように」)。
// **2026-07-30 Haru指示「最初の卵はジョブだけの指定で属性はランダムにして」**:
//   選ぶのは役割(アタッカー/タンク/ヒーラー/バッファー)だけ。属性と種族は
//   その役割を持つコモン種族から抽選する = 初手から「何が出るか」の楽しみが残る。
//   役割はスキル種別で決まる(nuke/guard/heal/buff)ので、抽選プールは
//   SPECIES から自動導出する — 種族を足しても手当なしで候補に入る(手書き禁止)。
// 選んだ卵は**その場で孵る**(チュートリアル。孵化装置のゲートはここには掛けない —
// 初起動の3時間待ちは体験の入口として論外)。個体値/色違い/覚醒は
// 野生卵と同じ抽選(=最初の孵化にも当たりの瞬間がある)
export const STARTER_EGGS = Object.freeze([
  { role: "nuke", roleJa: "アタッカー", roleIcon: "⚔", desc: "攻めて 押し切る" },
  { role: "guard", roleJa: "タンク", roleIcon: "🛡", desc: "耐えて 守る" },
  { role: "heal", roleJa: "ヒーラー", roleIcon: "✚", desc: "癒して 長く戦う" },
  { role: "buff", roleJa: "バッファー", roleIcon: "♪", desc: "皆を 強くする" },
]);

// その役割を持つコモン種族(=最初の卵の抽選プール)。スキル種別から自動導出する
export function starterPoolOf(role) {
  return Object.values(SPECIES).filter(
    (sp) => sp.rarity === "common" && (SKILLS[sp.skillId]?.active?.type ?? "nuke") === role,
  );
}

export function hatchStarterEgg(state, role, rng = Math.random) {
  if (state.starterChosen) return { error: "最初の1匹は もう決まっている" };
  const pick = STARTER_EGGS.find((s) => s.role === role);
  if (!pick) return { error: "その卵は 選べない" };
  const pool = starterPoolOf(role);
  if (pool.length === 0) return { error: "その卵は 選べない" };
  // 種族(=属性)はプールから等確率で抽選。個体値・色違い・覚醒は野生コモン卵と同じ
  const res = hatchEgg(makeEgg("common"), rng);
  res.speciesId = pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))].id;
  const oldId = state.party[0];
  const oldSpecies = state.monsters[oldId]?.speciesId;
  const starter = makeMonster(res.speciesId, res.iv, res.shiny, res.awakening);
  if (oldId) delete state.monsters[oldId];
  if (oldSpecies && oldSpecies !== res.speciesId) delete state.dex?.[oldSpecies];
  state.monsters[starter.id] = starter;
  state.party = [starter.id];
  state.starterChosen = true;
  registerDex(state, res.speciesId);
  return { monster: starter, rarity: "common", shiny: res.shiny, awakening: res.awakening };
}

// 旧: ランダム孵化(2026-07-08〜)。4択導入(2026-07-29)で置き換え。
// 撮影ツール等の互換のため残すが、新しい呼び出しは hatchStarterEgg を使うこと
export function hatchStarter(state, rng = Math.random) {
  if (state.starterChosen) return { error: "最初の1匹は もう決まっている" };
  const rarity = weightedPick(rarityWeights(1), rng);
  const res = hatchEgg(makeEgg(rarity), rng);
  const oldId = state.party[0];
  const oldSpecies = state.monsters[oldId]?.speciesId;
  const starter = makeMonster(res.speciesId, res.iv, res.shiny, res.awakening);
  if (oldId) delete state.monsters[oldId];
  if (oldSpecies && oldSpecies !== res.speciesId) delete state.dex?.[oldSpecies];
  state.monsters[starter.id] = starter;
  state.party = [starter.id];
  state.starterChosen = true;
  registerDex(state, res.speciesId);
  return { monster: starter, rarity, shiny: res.shiny, awakening: res.awakening };
}

// ---- モンスター図鑑 ----
// 入手した種族を記録する。初入手なら true を返す(UIが「図鑑に登録!」を出す)
export function registerDex(state, speciesId) {
  state.dex = state.dex ?? {};
  if (state.dex[speciesId]) return false;
  state.dex[speciesId] = true;
  // 2026-07-18 FB「新キャラゲット時に図鑑に赤丸がでて、バフ解放ボタンがあるほうが
  // 実感があるから好き」: バフは図鑑の解放ボタンで受け取る。state.dexは従来どおり
  // 「発見の記録」(シルエット解除など)で、未解放でも発見済み扱い
  state.dexUnclaimed = state.dexUnclaimed ?? {};
  state.dexUnclaimed[speciesId] = true;
  return true;
}

// 図鑑の「進化後の姿」記録(2026-08-13 Haru指示)。
// 形: state.dexEvo[speciesId] = { "1": {skin, job}, "2": {skin, job} }
// 進化後の見た目は evoSkin(借りる種族)と職の組み合わせで決まり、種族IDだけからは
// 復元できない。図鑑は「実際に見た姿の記録」なので、その子がなった姿をそのまま持つ。
// 同じ種族を別の職へ進化させ直しても、最初に記録した姿を残す(図鑑=最初の発見の記録)
export function recordDexEvolution(state, speciesId, stage, skin, job) {
  if (!speciesId || !stage) return false;
  state.dexEvo = state.dexEvo ?? {};
  const entry = (state.dexEvo[speciesId] = state.dexEvo[speciesId] ?? {});
  const key = String(Math.min(2, stage));
  if (entry[key]) return false;
  entry[key] = { skin: skin ?? null, job: job ?? null };
  return true;
}

// その種族で記録済みの進化段(0=未進化のみ)。図鑑の系譜表示が使う
export function dexEvolutionOf(state, speciesId) {
  return state.dexEvo?.[speciesId] ?? {};
}

// バフが有効な(解放済みの)図鑑マップ。dexTotals にはこれを渡す
export function claimedDex(state) {
  const un = state.dexUnclaimed ?? {};
  const out = {};
  for (const id of Object.keys(state.dex ?? {})) if (!un[id]) out[id] = true;
  return out;
}
export function dexUnclaimedCount(state) {
  return Object.keys(state.dexUnclaimed ?? {}).length;
}
// 図鑑バフを受け取る。speciesId省略で全部まとめて。返り値=解放した種数
export function claimDexBuff(state, speciesId = null) {
  const un = state.dexUnclaimed ?? {};
  const ids = speciesId ? (un[speciesId] ? [speciesId] : []) : Object.keys(un);
  for (const id of ids) delete un[id];
  return ids.length;
}

// ---- デイリーボス(1日2回・午前/午後で1回ずつ) ----
export function dailyBossSlot(now = Date.now()) {
  const d = new Date(now);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}-${d.getHours() < 12 ? "AM" : "PM"}`;
}

export function dailyBossAvailable(state, now = Date.now()) {
  return !(state.dailyBossUsed ?? {})[dailyBossSlot(now)];
}

// ---- デイリーボスのドロップ(2026-08-04 Haru指示で再設計) ----
// 旧: コイン確定(重み=coinDropWeights(stage+40)。実測: ステージ30で白金以上が約32%)
//     =「おいしすぎる」。ガチャ通貨が毎日2枚near確定で溜まる設計事故だった。
// 新: 種別を抽選する。レア順(Haru指定) = コイン > 卵 > 装備直ドロップ > 進化石。
//     コインの内訳は固定重み(ステージ非依存)で、**白金以上=全体の0.4%**(指示は0.5%以下)。
//     卵はwildEggWeights(既存の卵カーブ=高レアの月次天井に従う)、装備はrollItem(既存
//     ドロップと同じレア度ゲート)、進化石は4ロール均等 — どれも既存経済の蛇口の範囲内
export const DAILY_BOSS_DROP_WEIGHTS = Object.freeze({ coin: 4, egg: 12, item: 26, stone: 58 });
export const DAILY_BOSS_COIN_WEIGHTS = Object.freeze({ gold: 90, platinum: 8, astral: 1.6, divine: 0.4 });

export function rollDailyBossDrop(state, effStage, rng = Math.random) {
  let kind = weightedPick(DAILY_BOSS_DROP_WEIGHTS, rng);
  // 置き場が無いものは進化石へ切り替える(戦闘中にエラーで止めない。石は無限に持てる)
  if (kind === "egg" && (state.eggs?.length ?? 0) >= eggCapOf(state)) kind = "stone";
  if (kind === "item" && state.items.length >= (state.invCap ?? INV_CAP)) kind = "stone";
  if (kind === "coin") {
    const coinId = weightedPick(DAILY_BOSS_COIN_WEIGHTS, rng);
    state.coins = state.coins ?? {};
    state.coins[coinId] = (state.coins[coinId] ?? 0) + 1;
    return { kind: "coin", coinId };
  }
  if (kind === "egg") {
    const rarity = weightedPick(wildEggWeights(effStage), rng);
    const egg = makeEgg(rarity);
    state.eggs.push(egg);
    return { kind: "egg", egg };
  }
  if (kind === "item") {
    const item = rollItem(effStage, rng);
    state.items.push(item);
    return { kind: "item", item };
  }
  const stoneKind = ["nuke", "guard", "heal", "buff"][Math.floor(rng() * 4)];
  addEvoStone(state, stoneKind, 1);
  return { kind: "stone", stoneKind };
}

// 敗北時に挑戦権を返す(2026-07-18 FB「デイリーボス失敗するとおしまいがよくない」:
// 倒せるまで何度でも再挑戦できる。報酬は勝利時だけなので周回の旨みはない)
export function refundDailyBoss(state, now = Date.now()) {
  const slot = dailyBossSlot(now);
  if (state.dailyBossUsed?.[slot]) {
    delete state.dailyBossUsed[slot];
    return true;
  }
  return false;
}

// 挑戦権を消費する(勝敗にかかわらず入場で1回)。古い記録は掃除する
export function consumeDailyBoss(state, now = Date.now()) {
  if (!dailyBossAvailable(state, now)) return false;
  const slot = dailyBossSlot(now);
  const d = new Date(now);
  const today = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  const kept = {};
  for (const k of Object.keys(state.dailyBossUsed ?? {})) {
    if (k.startsWith(today)) kept[k] = true;
  }
  kept[slot] = true;
  state.dailyBossUsed = kept;
  return true;
}

// 初期状態。最初の1体(フレイムウルフ・標準個体)を連れてスタートする。
// UI側で STARTER_CHOICES の3択を出し、chooseStarter で置き換える。
export function newGameState(now = Date.now()) {
  const starter = makeMonster("flamewolf", { atk: 1.0, hp: 1.0 });
  return {
    version: SAVE_VERSION,
    createdAt: now, // 遊びはじめた時刻(目安箱のctxで「プレイ日数」の重み付けに使う 2026-07-15)
    gold: 0,
    stage: 1,
    difficulty: 0, // 0=ノーマル 1=ナイトメア 2=ヘル 3=トーメント
    maxStageD: DIFFICULTIES.map(() => 1), // 難易度ごとの到達済み最高ステージ(地域追加に追従)
    bossClearedD: DIFFICULTIES.map(() => 0), // 難易度ごとの幕ボス初撃破ずみステージ
    keyItems: [], // ボスの鍵(難易度別の個別アイテム 2026-07-13。幕ボスの間の入場に1本消費)
    coins: {}, // 記念コインの所持数 {coinId: 枚数}(ドロップで貯まる・ガチャで消費)
    storageCoins: {}, // 倉庫に預けた記念コイン {coinId: 枚数}(引き出すまで使えない)
    crystalItems: [], // 叡智の水晶(個別アイテム 2026-07-13。兆しを無料で振り直せる)
    // 進化石(2026-07-28): ロール別4種+ランダム進化石。進化のゲート素材
    evoStones: { nuke: 0, guard: 0, heal: 0, buff: 0, random: 0 },
    // 倉庫へ預けたぶん(2026-08-05)。持ち物と別カウンタ=倉庫の石は進化に使えない
    evoStonesStored: { nuke: 0, guard: 0, heal: 0, buff: 0, random: 0 },
    dex: { [starter.speciesId]: true }, // モンスター図鑑(入手したことのある種族)
    dexEvo: {}, // 図鑑の進化系譜(2026-08-13): {speciesId: {"1":{skin,job}, "2":{...}}}
    dexUnclaimed: {}, // 図鑑バフの未解放リスト(スターターぶんは解放済みで開始 2026-07-18)
    dailyBossUsed: {}, // デイリーボスの挑戦記録 {slotId: true}(午前/午後で1回ずつ)
    killsInStage: 0,
    totalKills: 0,
    party: [starter.id], // 先頭がリーダー
    monsters: { [starter.id]: starter },
    starterChosen: false, // 最初の1匹の3択を選んだか(選ぶまでUIが選択画面を出す)
    eggs: [],
    eggCap: MAX_EGG_SLOTS, // 卵スロット上限(GPで拡張できる)
    items: [],
    invCap: INV_CAP, // 持ち物(インベントリ)上限(GP/コインで拡張できる)
    storage: [], // 倉庫(預けた装備)
    storageCap: STORAGE_BASE_CAP, // 倉庫上限(GPで拡張できる)
    chests: [], // 宝箱(開封すると中の装備が items へ)
    chestCapLv: 0, // 宝箱倉庫の拡張レベル(GPで購入 2026-07-21)
    autoOpenLv: 0, // 自動開封の短縮レベル(GPで購入 2026-07-21)
    expeditions: [], // 探索パーティ(3体1組×N組。難易度クリアで組数が増える 2026-08-13)
    tradeShip: [], // 交易船の積み荷(Steamマーケット出品予定の装備 2026-07-13)
    tradeShipMons: [], // 交易船のタスモン積み荷(覚醒0のみ・装備は外して積む 2026-07-16)
    tradeShipPrecious: [], // 交易船の貴重品積み荷(鍵/水晶 2026-07-20)
    tradeListAt: [], // 出品トークン(12時間窓内に積み込んだ時刻。レート制限 2026-07-16)
    log: [], // 獲得履歴(新しい順・LOG_CAP件まで)
    cube: { level: 1, exp: 0 }, // キューブのレベル(合成で経験値→上位レア解放)
    recipesFound: {}, // 発見ずみ配合レシピ {recipeKey: true}(レシピ手帳)
    settings: { autoOpenChests: false, cubeUseStorage: true, loopStage: null }, // トグル類+周回
    lastSeen: now,
    mintSeq: 0, // シリアル刻印の通し番号(覚醒/高レア/固有装備に付く=1点もの化)
  };
}

// ---- シリアル刻印(mint No.) ----
// 覚醒個体・高レア(アルカナ★6以上)モンスター・固有/高レア装備に一意の通し番号を付ける。
// 「唯一無二の個体」を可視化し、マーケット価値(marketValueEstimate)にも効く希少シグナル。
// 生成箇所が多数あるため、保存のたびに未刻印の対象へまとめて付与する(stampMints)。
export const MINT_MIN_STARS = 8; // センチュリー(★8)以上は無条件で刻印(＋覚醒個体・固有装備は常に刻印)

function monsterQualifiesForMint(mon) {
  if (!mon) return false;
  if ((mon.awakening ?? 0) > 0) return true;
  const stars = RARITY_META[SPECIES[mon.speciesId]?.rarity]?.stars ?? 0;
  return stars >= MINT_MIN_STARS;
}
function itemQualifiesForMint(item) {
  if (!item) return false;
  if (item.uniqueId) return true;
  // 覚醒Ⅵの魂が宿った武具は星に関わらず1点もの=刻印対象(2026-07-16)
  if ((item.soul?.awakening ?? 0) >= AWAKEN_MAX) return true;
  const stars = RARITY_META[item.rarity]?.stars ?? 0;
  return stars >= MINT_MIN_STARS;
}

// 未刻印の対象へ通し番号を付ける(保存時に呼ぶ)。付いた数を返す。
export function stampMints(state) {
  if (typeof state.mintSeq !== "number") state.mintSeq = 0;
  let n = 0;
  const stamp = (obj, ok) => {
    if (ok && obj && obj.mintNo == null) {
      obj.mintNo = ++state.mintSeq;
      n++;
    }
  };
  for (const mon of Object.values(state.monsters ?? {})) stamp(mon, monsterQualifiesForMint(mon));
  const itemPools = [
    state.items ?? [],
    state.storage ?? [],
    (state.chests ?? []).map((c) => c.item).filter(Boolean),
    ...Object.values(state.monsters ?? {}).map((m) => m.equipment ?? []),
  ];
  for (const pool of itemPools) for (const it of pool) stamp(it, itemQualifiesForMint(it));
  return n;
}

// ---- 卵スロット拡張(ゴールドの継続シンク) ----
export const EGG_CAP_STEP = 4;
export const EGG_CAP_MAX = 48;

// 今の卵スロット上限(買った拡張ぶんを含む)
export function eggCapOf(state) {
  return Math.min(EGG_CAP_MAX, state.eggCap ?? MAX_EGG_SLOTS);
}

// 次の拡張(+EGG_CAP_STEP)のコスト。重ねるごとに桁違いに増える(×10 2026-07-13 FB)。
// 1000→1万→10万→100万→1000万→1億→10億→100億→1000億。終盤の巨大ゴールドシンク。
export function eggSlotCost(state) {
  const bought = Math.max(0, (eggCapOf(state) - MAX_EGG_SLOTS) / EGG_CAP_STEP);
  return Math.round(1000 * Math.pow(10, bought));
}

export function buyEggSlot(state) {
  if (eggCapOf(state) >= EGG_CAP_MAX) return { error: "卵枠は これが 最大" };
  const cost = eggSlotCost(state);
  if (state.gold < cost) return { error: `${cost.toLocaleString("en-US")} GP 足りない` };
  state.gold -= cost;
  state.eggCap = eggCapOf(state) + EGG_CAP_STEP;
  return { cap: state.eggCap, cost };
}

// ---- 孵化装置(2026-07-29 Haru指示「卵は孵化装置でしか孵化できない」) ----
// 卵に incubatedAt(装置に入れた時刻)を刻む方式。装置スロットの実体は
// 「incubatedAt を持つ卵の数 ≦ スロット数」という不変条件だけ(別配列を持つと
// 卵の削除・にがす・まとめ処理の全経路で二重管理になる)。
// 時間は実時間(倍速・オフライン関係なく進む=探索と同じ)。
// 検証用の即時孵化は検証パネル(--tbm-dev)が incubatedAt を過去に巻き戻す
// (探索の即時完了と同じ型。効果の入口は1本のまま)。
// 枠は進行度で増える(2026-07-29 Haru指示「1個から始めて各難易度の最終ステージを
// クリアすると1個ずつ増える。最大3枠」)。ゴールド購入制は同日中に廃止。
// 判定は bossClearedD(難易度ごとの幕ボス初撃破ステージ)= サーバー不要の既存進行度。
// ノーマル10-10クリアで2枠、ナイトメア10-10クリアで3枠(以降の難易度クリアは頭打ち)
export const INCUBATOR_BASE_SLOTS = 1;
export const INCUBATOR_MAX_SLOTS = 3;

export function incubatorSlotsOf(state) {
  let slots = INCUBATOR_BASE_SLOTS;
  for (let d = 0; d < (state?.bossClearedD?.length ?? 0); d++) {
    if ((state.bossClearedD[d] ?? 0) >= STAGES_PER_DIFFICULTY) slots++;
  }
  return Math.min(INCUBATOR_MAX_SLOTS, slots);
}

// 次の枠が増える難易度(もう増えないなら null)。UIのロック枠の説明に使う
export function nextIncubatorUnlock(state) {
  if (incubatorSlotsOf(state) >= INCUBATOR_MAX_SLOTS) return null;
  for (let d = 0; d < DIFFICULTIES.length; d++) {
    if ((state?.bossClearedD?.[d] ?? 0) < STAGES_PER_DIFFICULTY) return d;
  }
  return null;
}

// 装置に入っている卵(セット順)
export function incubatingEggs(state) {
  return (state.eggs ?? []).filter((e) => e.incubatedAt != null).sort((a, b) => a.incubatedAt - b.incubatedAt);
}

// ---- 加護の孵化短縮(2026-07-30 Haru指示「最初の2個までは短縮。コモンは5分」) ----
// 「あと何個ぶん短縮されるか」。装置に入れた回数ではなく**孵した数**で数えるので、
// 出し入れを繰り返しても加護は減らない(抜け穴にしない)
export function blessedHatchesLeft(state) {
  return Math.max(0, BLESSED_HATCH_COUNT - (state.blessedHatchUsed ?? 0));
}

// この卵をいま装置に入れたら何ミリ秒かかるか(卵一覧の予告表示にも使う)
// 「次に装置へ入れたら何番目の加護になるか」(0始まり)。加護が残っていなければ null。
// 装置で温め中の加護卵も予約として数える(incubateEgg と同じ勘定)
export function nextBlessedOrdinal(state) {
  const reserved = incubatingEggs(state).filter((e) => e.blessed).length;
  const left = blessedHatchesLeft(state) - reserved;
  if (left <= 0) return null;
  return BLESSED_HATCH_COUNT - left;
}

export function hatchMsFor(state, rarity) {
  const ord = nextBlessedOrdinal(state);
  return ord != null ? blessedHatchMsOf(rarity, ord) : hatchMsOf(rarity);
}

export function eggReadyAt(egg) {
  if (egg.incubatedAt == null) return Infinity;
  // 所要時間は**装置に入れた瞬間に卵へ焼き付ける**(egg.hatchMs)。
  // 動的に計算すると、1個目が孵った瞬間に2個目の残り時間が伸びて「バグ」に見える。
  // hatchMs を持たない旧セーブの卵は従来どおりレア度から引く
  return egg.incubatedAt + (egg.hatchMs ?? hatchMsOf(egg.rarity));
}

// 孵化できるか(=装置に入っていて時間が満ちた)。**孵化の唯一のゲート**。
// UI側はこれが false の卵の孵化ボタンを出さない・押させない
export function eggHatchReady(egg, now = Date.now()) {
  return egg.incubatedAt != null && now >= eggReadyAt(egg);
}

export function incubateEgg(state, eggId, now = Date.now()) {
  const egg = (state.eggs ?? []).find((e) => e.id === eggId);
  if (!egg) return { error: "その卵は 無い" };
  if (egg.incubatedAt != null) return { error: "もう 装置に入っている" };
  if (incubatingEggs(state).length >= incubatorSlotsOf(state)) {
    return { error: "孵化装置が 満員(空くのを待つか 枠を広げよう)" };
  }
  egg.incubatedAt = now;
  // 加護ぶんは「入れた時点で」短縮を確定させる。装置に入っている加護卵の数も数に入れて
  // 予約するので、2枠に同時投入しても3個目が短縮されることはない。
  // 何番目の加護か(1個目=30秒/2個目=1分)もここで確定して焼き付ける
  const reserved = incubatingEggs(state).filter((e) => e !== egg && e.blessed).length;
  const left = blessedHatchesLeft(state) - reserved;
  egg.blessed = left > 0;
  egg.hatchMs = egg.blessed
    ? blessedHatchMsOf(egg.rarity, BLESSED_HATCH_COUNT - left)
    : hatchMsOf(egg.rarity);
  return { egg, readyAt: eggReadyAt(egg), blessed: egg.blessed };
}

// 装置から取り出す(温めは最初からやり直しになる)
export function stopIncubate(state, eggId) {
  const egg = (state.eggs ?? []).find((e) => e.id === eggId);
  if (!egg || egg.incubatedAt == null) return { error: "その卵は 装置に入っていない" };
  delete egg.incubatedAt;
  // 焼き付けた所要時間も消す(次に入れ直したときに、その時点の加護で決め直す)
  delete egg.hatchMs;
  delete egg.blessed;
  return { egg };
}

// ---- タスモン(タスモン)枠の解放(2026-07-18 FB「タスモン枠の解放がない」) ----
// 卵/持ち物と同じ「買うほど桁違いに増える」ゴールドシンク。ゴールドの使い道が無い
// 問題(同日FB)への供給も兼ねる。既存プレイヤーの所持数がキャップを超えている場合は
// ロード時に所持数を包む位置まで自動で引き上げる(取り上げない)。
export const BOX_CAP_BASE = 50;
export const BOX_CAP_STEP = 10;
export const BOX_CAP_MAX = 300;

export function boxCapOf(state) {
  // BOX_CAP_MAXは「購入の上限」(buyBoxSlotで制御)。移行で所持数がそれを超えている
  // セーブもあり得るので、表示/判定上のキャップはそのまま返す
  return state.boxCap ?? BOX_CAP_BASE;
}
export function boxCount(state) {
  return Object.keys(state.monsters ?? {}).length;
}
// 5千→5万→50万→500万→5000万→5億→…(卵/持ち物と同じ×10カーブ)
export function boxSlotCost(state) {
  const bought = Math.max(0, (boxCapOf(state) - BOX_CAP_BASE) / BOX_CAP_STEP);
  return Math.round(5000 * Math.pow(10, bought));
}
export function buyBoxSlot(state) {
  if (boxCapOf(state) >= BOX_CAP_MAX) return { error: "タスモン枠は これが 最大" };
  const cost = boxSlotCost(state);
  if (state.gold < cost) return { error: `${cost.toLocaleString("en-US")} GP 足りない` };
  state.gold -= cost;
  state.boxCap = boxCapOf(state) + BOX_CAP_STEP;
  return { cap: state.boxCap, cost };
}

// ---- 持ち物(インベントリ)拡張(ゴールド or 記念コイン) ----
// 基本INV_CAP枠。GPで拡張(買うほど激増)。コインでも拡張できる。Lv60ごろ全拡張の目安。
export const INV_CAP_STEP = 10;
export const INV_CAP_MAX = 120; // 基本40 + 8段拡張
// 拡張に使う記念コイン(1回1枚)。2026-07-22に銀コインを廃止したので金コインへ。
// 銀はもともと排出対象外=この経路は事実上死んでいたため、金化は緩める方向の変更
export const INV_EXPAND_COIN = "gold";

export function invCapOf(state) {
  return Math.min(INV_CAP_MAX, state.invCap ?? INV_CAP);
}
// 重ねるごとに桁違いに増える(×10 2026-07-13 FB): 2千→2万→20万→200万→2000万→2億→20億→200億
export function invSlotCost(state) {
  const bought = Math.max(0, (invCapOf(state) - INV_CAP) / INV_CAP_STEP);
  return Math.round(2000 * Math.pow(10, bought));
}
// ゴールドで持ち物を拡張
export function buyInvSlot(state) {
  if (invCapOf(state) >= INV_CAP_MAX) return { error: "持ち物枠は これが 最大" };
  const cost = invSlotCost(state);
  if (state.gold < cost) return { error: `${cost.toLocaleString("en-US")} GP 足りない` };
  state.gold -= cost;
  state.invCap = invCapOf(state) + INV_CAP_STEP;
  return { cap: state.invCap, cost };
}
// 記念コイン(金コイン1枚)で持ち物を拡張
export function buyInvSlotWithCoin(state) {
  if (invCapOf(state) >= INV_CAP_MAX) return { error: "持ち物枠は これが 最大" };
  if ((state.coins?.[INV_EXPAND_COIN] ?? 0) < 1) return { error: "金コインが 足りない" };
  state.coins[INV_EXPAND_COIN] -= 1;
  state.invCap = invCapOf(state) + INV_CAP_STEP;
  return { cap: state.invCap };
}

// ---- 獲得履歴ログ ----
export const LOG_CAP = 100;

// entry: { kind, rarity, text } を新しい順に積む。
export function addLog(state, entry, now = Date.now()) {
  state.log.unshift({ t: now, ...entry });
  if (state.log.length > LOG_CAP) state.log.length = LOG_CAP;
}

// ---- 倉庫 ----

// インベントリ→倉庫へ預ける。
export function moveToStorage(state, itemId) {
  if (storageUsed(state) >= storageCapOf(state)) return { error: "倉庫が満杯" };
  const idx = state.items.findIndex((it) => it.id === itemId);
  if (idx === -1) return { error: "その装備は 持っていない" };
  const [item] = state.items.splice(idx, 1);
  state.storage.push(item);
  return { item };
}

// 倉庫→インベントリへ引き出す。
export function moveToInventory(state, itemId) {
  if (state.items.length >= invCapOf(state)) return { error: "持ち物が 満杯" };
  const idx = state.storage.findIndex((it) => it.id === itemId);
  if (idx === -1) return { error: "その装備は 倉庫にない" };
  const [item] = state.storage.splice(idx, 1);
  state.items.push(item);
  return { item };
}

// 記念コインを倉庫へ預ける/引き出す。倉庫のコインは装備を引けない(整理用)。
// コインは枠を消費しない扱い(装備の倉庫キャップとは別勘定)。
export function moveCoinToStorage(state, coinId) {
  if ((state.coins?.[coinId] ?? 0) <= 0) return { error: "そのコインを 持っていない" };
  state.coins[coinId] -= 1;
  if (!state.storageCoins) state.storageCoins = {};
  state.storageCoins[coinId] = (state.storageCoins[coinId] ?? 0) + 1;
  return { ok: true };
}

export function moveCoinToInventory(state, coinId) {
  if ((state.storageCoins?.[coinId] ?? 0) <= 0) return { error: "そのコインは 倉庫にない" };
  state.storageCoins[coinId] -= 1;
  if (!state.coins) state.coins = {};
  state.coins[coinId] = (state.coins[coinId] ?? 0) + 1;
  return { ok: true };
}

// インベントリの装備を全部倉庫へ(倉庫の空きまで)。
export function depositAll(state) {
  let moved = 0;
  while (state.items.length > 0 && storageUsed(state) < storageCapOf(state)) {
    state.storage.push(state.items.shift());
    moved++;
  }
  return { moved };
}

// 低レア(コモン+レア)のまとめ売り。インベントリのみ対象。
export function sellJunk(state) {
  const junk = state.items.filter((it) => it.rarity === "common" || it.rarity === "rare");
  let gold = 0;
  for (const it of junk) gold += itemSellPrice(it);
  state.items = state.items.filter((it) => it.rarity !== "common" && it.rarity !== "rare");
  state.gold += gold;
  return { count: junk.length, gold };
}

// ボス箱ストックが満杯か(2026-07-22 FB「ボス箱ストックMAXでボス周回すると
// 鍵だけ消費してしまう」)。鍵は有限の貴重品なので、入場時に満杯なら消費させない
export function bossChestFull(state) {
  return chestCountOf(state, "boss") >= chestCapOf(state, "boss");
}

// マップからのステージ選択。今の難易度の到達済みまで自由に移動できる。
// 幕ボスの間(x-10)へは鍵を1本消費して入場する。
// 返り値: { stage, usedKey } | { error }
export function setStage(state, stage) {
  if (!Number.isInteger(stage) || stage < 1 || stage > STAGES_PER_DIFFICULTY) {
    return { error: "まだ 行けない" };
  }
  // 幕ボスの間(x-10)は手前の面に到達していれば鍵で入れる
  const reachable =
    stage <= maxStageOf(state) || (isBossStage(stage) && stage - 1 <= maxStageOf(state));
  if (!reachable) return { error: "まだ 行けない" };
  let usedKey = false;
  // 周回モード(🔁)は手動でステージを変えたら自動解除(2026-07-13 FB:
  // 「6-8をクリアすると5-9に戻る」= 昔セットした周回先へ引き戻される事故の根絶。
  // 周回したい面では🔁を押し直す)
  if (state.settings?.loopStage != null && state.settings.loopStage !== stage) {
    state.settings.loopStage = null;
  }
  if (isBossStage(stage)) {
    // ボス箱が満杯なら鍵を消費させない(2026-07-22 FB)。開ければすぐ入れる
    if (bossChestFull(state)) {
      return { error: "📦 ボス箱が満杯! 開けてから挑もう(鍵は消費していない)" };
    }
    if (!useBossKey(state, state.difficulty ?? 0))
      return { error: `🗝 ${keyLabelOf(state.difficulty ?? 0)}が ない(この難易度の宝箱から出る)` };
    usedKey = true;
    state.maxStageD = state.maxStageD ?? DIFFICULTIES.map(() => 1);
    state.maxStageD[state.difficulty] = Math.max(maxStageOf(state), stage);
  }
  state.stage = stage;
  state.killsInStage = 0;
  return { stage, usedKey };
}

// パーティの先頭(リーダー)。スプライト表示・レベル表示に使う。
export function leader(state) {
  return state.monsters[state.party[0]];
}

// パーティのモンスター配列(存在するものだけ)。
export function partyMonsters(state) {
  return state.party.map((id) => state.monsters[id]).filter(Boolean);
}

// パーティ合計の攻撃力・最大HP。
export function partyAtk(state) {
  return partyMonsters(state).reduce((sum, m) => sum + monsterAtk(m), 0);
}

// 防御属性 defElement の敵に対するパーティ合計攻撃力(メンバーごとに属性相性を掛ける)。
// 細工v3の「属性攻撃力」(elemAtk)は有利属性で殴れているメンバーの与ダメだけを伸ばす
// (上限は細工レンジ側で管理。POWER_REGISTRY.equipStats.elemAtk 参照)
export function partyAtkVs(state, defElement) {
  return partyMonsters(state).reduce((sum, m) => {
    const eM = elementMult(SPECIES[m.speciesId].element, defElement);
    const elemBoost = eM > 1 ? 1 + equipStat(m, "elemAtk") : 1;
    return sum + monsterAtk(m) * eM * elemBoost;
  }, 0);
}

// パーティのスキルのパッシブによる全体ボーナスを合算する。
function sumPassive(state, key) {
  return partyMonsters(state).reduce(
    (sum, m) => sum + (skillOf(m).passive?.[key] ?? 0),
    0,
  );
}

// パーティの覚醒個体による全体ボーナスを合算する。
function sumAwakening(state, table) {
  return partyMonsters(state).reduce(
    (sum, m) => sum + (table[m.awakening ?? 0] ?? 0),
    0,
  );
}

// パーティの装備による特定ステータスの合算。
function sumEquip(state, stat) {
  return partyMonsters(state).reduce((sum, m) => sum + equipStat(m, stat), 0);
}

// ユニーク限定ステのパーティ集計(2026-07-13): 与ダメ吸収(上限25%)/ボス特効(上限+100%)
// 与ダメ吸収は回復の毎秒上限の外(与ダメ比例なので積むだけでは伸びない設計)。
// この上限値は難易度番人が実効サステインのラチェットで追跡している
// (tools/balance-model.js の LIFESTEAL_CAP / SUSTAIN_UNCAPPED_SNAPSHOT)
export const LIFESTEAL_CAP = 0.25;
export function partyLifesteal(state) {
  return Math.min(LIFESTEAL_CAP, sumEquip(state, "lifesteal"));
}
export function partyBossDmg(state) {
  return Math.min(1, sumEquip(state, "bossDmg"));
}

// パーティの「兆し」による特定ステータスの合算。
function sumPerk(state, key) {
  return partyMonsters(state).reduce((sum, m) => sum + perkStat(m, key), 0);
}

// バッファー職の周回ボーナス(JOBS[].farm)。パーティにいるだけで効く(2026-07-11)
function sumJobFarm(state, key) {
  return partyMonsters(state).reduce((sum, m) => sum + (JOBS[m.job]?.farm?.[key] ?? 0), 0);
}

// 卵ドロップ率の加算ぶん(スキル+覚醒+装備+バッファー職。ソフトキャップあり)。
// 2026-08-13 Haru指示「キャップ外して乗算式にしようか」: ソフトキャップ
// (AWAKENING.dropBonusCap=18%)を撤廃し、返り値は**卵の基本率に掛ける倍率の
// 上乗せ分**になった(実効率 = 基本率 × (1 + ここの値)。eggDropChance参照)。
//
// なぜキャップを外して良くなったか: 旧・加算式では基本率が 0.026%/撃破と極小
// だったため、ボーナスがそのまま実効率になっていた(覚醒Ⅵ3体=+24%で「撃破ごとに
// ほぼ確定で卵」= 卵という仕組み自体が終盤で壊れる)。この暴走を止めるための
// 歯止めがキャップだった。乗算式ではボーナスは基本率を割合で伸ばすだけなので、
// キャップ無しの理論最大(実測≒65%)でも 0.026% → 0.043%(5.1時間→3時間に1個)に
// しかならず、雪だるま式そのものが構造的に起きない = 歯止めが不要になった。
export function partyDropBonus(state) {
  return (
    sumPassive(state, "dropBonus") +
    sumAwakening(state, AWAKENING.dropBonus) +
    sumEquip(state, "dropBonus") +
    sumPerk(state, "dropBonus") +
    sumJobFarm(state, "drop") +
    dexTotals(claimedDex(state)).drop
  );
}

// ゴールド獲得量の加算割合(スキル+覚醒+装備+バッファー職+図鑑。ソフトキャップあり)。
export function partyGoldBonus(state) {
  const raw =
    sumPassive(state, "goldBonus") +
    sumAwakening(state, AWAKENING.goldBonus) +
    sumEquip(state, "goldBonus") +
    sumPerk(state, "goldBonus") +
    sumJobFarm(state, "gold");
  return Math.min(AWAKENING.goldBonusCap, raw) + dexTotals(claimedDex(state)).gold; // 図鑑ぶんは独自キャップ済み
}

// ジョブ特性ステの合計(2026-07-13: 進化ジョブで攻撃速度/会心/被ダメ軽減/CD短縮が伸びる)
export function sumJobStat(state, key) {
  let total = 0;
  for (const id of state.party) {
    total += jobStat(state.monsters[id], key);
  }
  return total;
}

// 経験値獲得量の加算割合(装備+バッファー職+図鑑)。
export function partyExpBonus(state) {
  return (
    Math.min(1.0, sumEquip(state, "expBonus") + sumJobFarm(state, "exp")) + dexTotals(claimedDex(state)).exp
  );
}

// 攻撃速度の加算割合(装備。上限+60%)。
export function partyAttackSpeed(state) {
  return Math.min(0.6, sumEquip(state, "atkSpeed") + sumPerk(state, "atkSpeed") + sumJobStat(state, "atkSpeed"));
}

// ---- 会心(クリティカル)とクールタイム短縮(2026-07-07 追加の戦闘ステータス) ----
export const BASE_CRIT_RATE = 0.05; // 基礎の会心率(装備なしでも5%)
export const BASE_CRIT_DMG = 1.5; // 基礎の会心倍率(会心すると1.5倍)
export const CRIT_RATE_CAP = 0.5; // 会心率の上限(50%)
export const CRIT_DMG_CAP = 3.0; // 会心倍率の上限(最大3.0倍=+200%)
export const CDR_CAP = 0.5; // クールタイム短縮の上限(50%)

// パーティの個体値(IV)平均。全ステータスに個体値が乗る(平均1.0=バランス中立)。
// 旧セーブ(atk/hpのみ)は未定義キーを1.0とみなす。
export function partyIvAvg(state, key) {
  const members = state.party.map((id) => state.monsters[id]).filter(Boolean);
  if (members.length === 0) return 1;
  let s = 0;
  for (const m of members) s += m.iv?.[key] ?? 1;
  return s / members.length;
}

// パーティの会心率(0..0.5)。基礎5%+装備+兆し ×個体値(会心)、上限50%。
export function partyCritRate(state) {
  const base = BASE_CRIT_RATE + sumEquip(state, "critRate") + sumPerk(state, "critRate") + sumJobStat(state, "critRate");
  return Math.min(CRIT_RATE_CAP, base * partyIvAvg(state, "crit"));
}
// パーティの会心倍率(会心時のダメージ倍率)。基礎1.5倍+装備+兆し、上限3.0倍。
export function partyCritDmg(state) {
  return Math.min(CRIT_DMG_CAP, BASE_CRIT_DMG + sumEquip(state, "critDmg") + sumPerk(state, "critDmg"));
}
// パーティのクールタイム短縮(0..0.5)。スキルCDに (1-これ) を掛ける。
export function partyCdr(state) {
  return Math.min(CDR_CAP, sumEquip(state, "cdr") + sumPerk(state, "cdr") + sumJobStat(state, "cdr"));
}
// 会心を織り込んだ平均ダメージ倍率(バランス計算・DPS表示用)。
export function critDpsMult(state) {
  return 1 + partyCritRate(state) * (partyCritDmg(state) - 1);
}

// 装備の「防御」(defPct)合計 ×個体値(防御)+スフィア盤の守りの兆し(defCut)による被ダメ軽減。
// 上限50%(防具の存在意義)。
export function partyDefenseCut(state) {
  return Math.min(
    0.5,
    sumEquip(state, "defPct") * partyIvAvg(state, "def") + sumPerk(state, "defCut") + sumJobStat(state, "defCut"),
  );
}

// 配合に必要な最低レベル(両親とも)。育成してから配合させる設計。
export const BREED_MIN_LEVEL = 10;

// 配合が可能かを判定する(理由つき)。UIのプレビュー・実行の両方から使う。
// 返り値: { ok: true, cost } | { ok: false, reason }
export function canBreed(state, idA, idB) {
  if (!idA || !idB || idA === idB) return { ok: false, reason: "2体選んでね" };
  const a = state.monsters[idA];
  const b = state.monsters[idB];
  if (!a || !b) return { ok: false, reason: "モンスターがいない" };
  // 配合は両親ともLv10以上が必要(育ててから配合させる設計)
  if (a.level < BREED_MIN_LEVEL || b.level < BREED_MIN_LEVEL) {
    return { ok: false, reason: `両親ともLv${BREED_MIN_LEVEL}以上が必要` };
  }
  // 配合すると2体が消えるので、残りが1体未満になる配合は不可
  if (Object.keys(state.monsters).length - 2 < 1) {
    return { ok: false, reason: "モンスターが 足りない" };
  }
  if (state.eggs.length >= eggCapOf(state)) {
    return { ok: false, reason: "卵が 満杯" };
  }
  const cost = breedCost(a, b);
  if (state.gold < cost) return { ok: false, reason: `${cost.toLocaleString("en-US")} GP 足りない` };
  return { ok: true, cost };
}

// 配合を実行する。親2体とゴールドを消費し、配合卵をインベントリに加える。
// inheritPicks=[親Aの継承スキル, 親Bの継承スキル](null=自動)。
// 特別レシピが成立したら「レシピ手帳」(state.recipesFound)に記録する。
// 返り値: { egg, cost, recipeFound } | { error }
export function breed(state, idA, idB, rng = Math.random, inheritPicks = [null, null]) {
  const check = canBreed(state, idA, idB);
  if (!check.ok) return { error: check.reason };

  const a = state.monsters[idA];
  const b = state.monsters[idB];
  const egg = makeBredEgg(a, b, rng, inheritPicks);

  // レシピ発見(格落ちせず成立したときだけ手帳に載る)
  let recipeFound = false;
  if (egg.recipe) {
    const key = recipeKey(a.speciesId, b.speciesId);
    state.recipesFound = state.recipesFound ?? {};
    if (!state.recipesFound[key]) {
      state.recipesFound[key] = true;
      recipeFound = true;
    }
  }

  // 親の装備はインベントリへ返してから、親をパーティ・図鑑から取り除く
  state.items.push(...(a.equipment ?? []), ...(b.equipment ?? []));
  state.party = state.party.filter((id) => id !== idA && id !== idB);
  delete state.monsters[idA];
  delete state.monsters[idB];
  // 親を外してパーティが空になったら、残りから1体を先頭に補充する
  if (state.party.length === 0) {
    const first = Object.keys(state.monsters)[0];
    if (first) state.party.push(first);
  }

  state.gold -= check.cost;
  state.eggs.push(egg);
  return { egg, cost: check.cost, recipeFound };
}

// インベントリの装備をモンスターに装備する(部位ごとに1個・同部位は入れ替え)。
export function equipItem(state, monsterId, itemId) {
  const mon = state.monsters[monsterId];
  if (!mon) return { error: "モンスターがいない" };
  mon.equipment = mon.equipment ?? [];
  let idx = state.items.findIndex((it) => it.id === itemId);
  if (idx === -1) {
    // 倉庫にある物は自動で引き出してから着せる(2026-08-05 Haru「最強装備は倉庫にある
    // アイテムも参照して装備されるように」)。手動の装備でも同じく通せる方が自然
    const sIdx = (state.storage ?? []).findIndex((it) => it.id === itemId);
    if (sIdx === -1) return { error: "その装備は 持っていない" };
    state.items.push(state.storage.splice(sIdx, 1)[0]);
    idx = state.items.length - 1;
  }
  const item = state.items[idx];
  const part = (item.part = item.part ?? inferPart(item));
  if (mon.level < PART_UNLOCK[part]) {
    return { error: `${PARTS[part].label}枠は Lv${PART_UNLOCK[part]}で 解放される` };
  }
  // 武器・サブ武器はジョブ固有(2026-07-12 FB)。role無しの旧装備は共用
  if (item.role && (part === "weapon" || part === "sub") && jobRoleOf(mon) !== item.role) {
    return { error: `この${PARTS[part].label}は【${ROLE_WEAPONS[item.role]?.label ?? item.role}】専用` };
  }
  // タスモンのLvが装備のLv以上でないと装備できない(装備レベル制限)
  const itemLv = item.lv ?? 1;
  if (mon.level < itemLv) {
    return { error: `Lv${itemLv}以上のタスモンが必要(いまLv${mon.level})` };
  }
  // 御守り(アクセサリー)は種別(イヤリング/ネックレス/リング)ごとに固定枠+
  // レベルで段階解放(2026-07-11 FB「レベルで解放に戻して」)。
  // (2026-07-15 FB「イヤリングのところにリングを装備できる」バグ修正:
  // 旧実装は枠を「装備順の配列位置」で扱っていたため、種別と表示枠がずれた。
  // 種別ごとに専用枠を持たせ、同じ種別を装備すると必ずその種別が入れ替わるようにする)
  if (part === "charm") {
    const kind = charmKindOf(item);
    const kindIdx = CHARM_SLOT_KINDS.indexOf(kind);
    const unlockLv = CHARM_SLOT_UNLOCK[kindIdx] ?? CHARM_SLOT_UNLOCK[CHARM_SLOT_UNLOCK.length - 1];
    if (mon.level < unlockLv) {
      return { error: `${CHARM_KINDS[kind]?.label ?? "御守り"}枠は Lv${unlockLv}で 解放される` };
    }
    state.items.splice(idx, 1);
    const oi = mon.equipment.findIndex(
      (it) => (it.part ?? inferPart(it)) === "charm" && charmKindOf(it) === kind,
    );
    let swapped = null;
    if (oi !== -1) {
      [swapped] = mon.equipment.splice(oi, 1);
      state.items.push(swapped);
    }
    mon.equipment.push(item);
    return { item, swapped };
  }
  state.items.splice(idx, 1);
  // 部位ごとのスロット数(御守り以外は1枠)。空きがあればそのまま追加、満杯なら
  // 一番古いものを外して入れ替え(古いほうはインベントリへ戻る)。
  const cap = PART_SLOTS[part] ?? 1;
  const samePart = mon.equipment.filter((it) => (it.part ?? inferPart(it)) === part);
  let swapped = null;
  if (samePart.length >= cap) {
    const oldest = samePart.reduce((a, b) => ((a.obtainedAt ?? 0) <= (b.obtainedAt ?? 0) ? a : b));
    const oi = mon.equipment.indexOf(oldest);
    [swapped] = mon.equipment.splice(oi, 1);
    state.items.push(swapped);
  }
  mon.equipment.push(item);
  return { item, swapped };
}

// 最強自動装備(2026-07-11): 部位ごとに「装備中+インベントリ」をスコア降順で並べ、
// 解放済み枠数ぶんの上位を装備状態にする。ハクスラの「厳選の答え合わせ」を1ボタンで。
// 最強装備の物差し(2026-08-05 Haru「総合戦闘力が最大になるように最適化して」)。
// 従来は itemScore(汎用の点数)で並べていたため、「最強装備を押したのに総合戦闘力が
// 下がる/最強でない物が付く」ことがあった。UIの表示と同じ式で実際に評価する
// (powerScore と同一: 攻撃力 + スキルDPS + 最大HP/10)
// nukeの実効威力(ui.js の skillNukePower と同じ式。表示と評価をそろえる)
function nukePowerOf(a) {
  return a.kind === "multi" ? a.power * (a.hits ?? 3) : a.power;
}
function equipPowerOf(mon) {
  const skill = effectiveSkill(mon);
  const a = skill.active;
  const atk = monsterAtk(mon);
  const skillDps = a.type === "nuke" ? (atk * nukePowerOf(a)) / skill.cooldown : 0;
  return atk + skillDps + monsterMaxHp(mon) / 10;
}
// その装備を「仮に着けたら」の総合戦闘力。装備配列を差し替えた浅いコピーで測る
function powerWith(mon, equipment) {
  return equipPowerOf({ ...mon, equipment });
}
// 並び替え: ①総合戦闘力が高い順 ②同点なら従来の itemScore(レア度・周回効率ステを
// 評価する物差し)。戦闘力に出ないドロップ率・ゴールド系はここで拾う
function betterFor(mon, others) {
  return (a, b) => {
    const d = powerWith(mon, [...others, b]) - powerWith(mon, [...others, a]);
    return Math.abs(d) > 1e-9 ? d : itemScore(b) - itemScore(a);
  };
}
// 倉庫のぶんも候補に入れる(2026-08-05 Haru「最強装備は倉庫にあるアイテムも参照して」)。
// 選ばれたら装備時に倉庫から持ち物へ引き出す
function equipCandidates(state) {
  return [...(state.items ?? []), ...(state.storage ?? [])];
}
export function autoEquipBest(state, monsterId) {
  const mon = state.monsters[monsterId];
  if (!mon) return { error: "タスモンが いない" };
  if (onExpedition(state, monsterId)) return { error: "探索中の子は 装備できない" };
  // 維持ロック(2026-07-28 FB「最強装備を押しても変わらないような維持ロックが欲しい」):
  // この子の装備一式を自動入れ替えの対象から外す。手で付け替えるのは自由
  if (mon.equipLock) return { error: "維持ロック中(この子の装備は 最強装備で変えない)" };
  mon.equipment = mon.equipment ?? [];
  const partOf = (it) => it.part ?? inferPart(it);
  let changed = 0;
  for (const part of PART_ORDER) {
    if (mon.level < PART_UNLOCK[part]) continue;
    if (part === "charm") {
      // 御守りは種別(イヤリング/ネックレス/リング)ごとに独立して最良の1個を選ぶ
      // (2026-07-15 FB修正: 種別を無視したスコア順トップNだと、同種別が2個
      // 選ばれて片方が装備直後に弾かれる、他種別の枠が空くバグがあった)
      for (let ki = 0; ki < CHARM_SLOT_KINDS.length; ki++) {
        const kind = CHARM_SLOT_KINDS[ki];
        if (mon.level < CHARM_SLOT_UNLOCK[ki]) continue;
        const equippedKind = mon.equipment.filter((it) => partOf(it) === "charm" && charmKindOf(it) === kind);
        // ロックした装備は最強装備でも外さない(2026-07-26 FB「めんどいから基本最強
        // 使うんだけど、変えたくない装備がある」)。既存のロック(売却・合成からの保護)に
        // 意味を足す形にして、新しい概念を増やさない
        if (equippedKind.some((it) => it.locked)) continue;
        const invKind = equipCandidates(state).filter(
          (it) => partOf(it) === "charm" && charmKindOf(it) === kind && (it.lv ?? 1) <= mon.level,
        );
        // 総合戦闘力で選ぶ(itemScore順だと「最強を押したのに弱くなる」ことがあった)
        const others = mon.equipment.filter((it) => !equippedKind.includes(it));
        const best = [...equippedKind, ...invKind].sort(betterFor(mon, others))[0];
        if (!best || equippedKind.some((it) => it.id === best.id)) continue;
        for (const it of equippedKind) {
          unequipItem(state, monsterId, it.id);
          changed++;
        }
        const r = equipItem(state, monsterId, best.id);
        if (!r.error) changed++;
      }
      continue;
    }
    const equippedSame = mon.equipment.filter((it) => partOf(it) === part);
    // ロックした装備が付いている部位は触らない(上と同じ理由)
    if (equippedSame.some((it) => it.locked)) continue;
    const invSame = equipCandidates(state).filter(
      (it) =>
        partOf(it) === part &&
        (it.lv ?? 1) <= mon.level &&
        // 武器・サブ武器のジョブ固有(2026-07-12): 自分のロール用か共用だけが候補
        (!it.role || it.role === jobRoleOf(mon)),
    );
    const othersN = mon.equipment.filter((it) => !equippedSame.includes(it));
    const want = [...equippedSame, ...invSame].sort(betterFor(mon, othersN)).slice(0, 1);
    const wantIds = new Set(want.map((it) => it.id));
    // いらない装備中を外してから、上位を順に装備(equipItemの入れ替えに任せない=確実)
    for (const it of equippedSame) {
      if (!wantIds.has(it.id)) {
        unequipItem(state, monsterId, it.id);
        changed++;
      }
    }
    for (const it of want) {
      if (mon.equipment.some((e) => e.id === it.id)) continue;
      const r = equipItem(state, monsterId, it.id);
      if (!r.error) changed++;
    }
  }
  return { changed };
}

// 全モンスターの装備をまとめて外してインベントリへ戻す(2026-07-17 FB「装備一括解除」)。
// 既定ではパーティの子は外さない(戦力が突然裸になる事故防止)。includeParty=true で全員。
export function unequipAllMonsters(state, { includeParty = false } = {}) {
  let count = 0;
  let mons = 0;
  for (const mon of Object.values(state.monsters)) {
    if (!includeParty && state.party.includes(mon.id)) continue;
    if (!mon.equipment || mon.equipment.length === 0) continue;
    count += mon.equipment.length;
    mons++;
    state.items.push(...mon.equipment);
    mon.equipment = [];
  }
  return { count, mons };
}

// モンスターの装備を外してインベントリへ戻す。
export function unequipItem(state, monsterId, itemId) {
  const mon = state.monsters[monsterId];
  if (!mon || !mon.equipment) return { error: "モンスターがいない" };
  const idx = mon.equipment.findIndex((it) => it.id === itemId);
  if (idx === -1) return { error: "その装備は 付けていない" };
  const [item] = mon.equipment.splice(idx, 1);
  state.items.push(item);
  return { item };
}

// アイテム合成の成功率(目標レア度で決まる)。イモータル以降は失敗がありうる:
// 「合成すれば必ず上がる」だと高レアがすぐ量産されて1個の価値が崩れるため
// (2026-07-06ユーザー指示: 50%→25%→10%と絞る)。
// 失敗すると素材は溶けて、同じレア度の装備1個だけが残る。
export const CRAFT_SUCCESS = Object.freeze({
  rare: 1, ultra: 1, legend: 1, immortal: 0.5,
  arcana: 0.25, beyond: 0.1, century: 0.1, cosmic: 0.1, celestial: 0.05,
});

// キューブのレベル・経験値ヘルパー。
export function cubeLevelOf(state) {
  return state.cube?.level ?? 1;
}
// レア度制限は撤廃(全レア度いつでも合成OK)。互換のため残すが常にtrue。
export function cubeCanCraft() {
  return true;
}
// その帯の解放に必要な合成レベル = 「1つ前の帯の上限レベルを超えたら」(2026-07-15 FB)。
// 例: 帯1(Lv.10〜20)は帯0(Lv.1〜10)の上限10を超える=合成レベル11で解放。
// 帯0は最初から解放(1つ前が無いので1)。
//
// 旧: 帯の下限レベル(bandMinOf)に達したら解放。帯が重なっている設計
// (Lv.10〜20 と Lv.15〜30 など)では下限が近接するため、複数の帯がほぼ同時に開いて
// 「順番に解放されていく」手ざわりが出なかった。前帯の上限基準なら、帯は必ず
// 1つずつ順番に開く(11 → 21 → 31 → 41 → 51 → 66)。
export function cubeBandMinLevel(band) {
  const b = Math.max(0, band | 0);
  return b === 0 ? 1 : bandCeilOf(b - 1) + 1;
}
export function cubeCanCraftBand(state, band) {
  return cubeLevelOf(state) >= cubeBandMinLevel(band);
}
// キューブに経験値を加える。レベルアップぶんをまとめて処理する。
// 返り値: { gained, levelUps, level }
export function addCubeExp(state, amount) {
  state.cube = state.cube ?? { level: 1, exp: 0 };
  let levelUps = 0;
  state.cube.exp += amount;
  while (state.cube.level < CUBE_LEVEL_MAX && state.cube.exp >= cubeExpToNext(state.cube.level)) {
    state.cube.exp -= cubeExpToNext(state.cube.level);
    state.cube.level++;
    levelUps++;
  }
  if (state.cube.level >= CUBE_LEVEL_MAX) state.cube.exp = 0;
  return { gained: amount, levelUps, level: state.cube.level };
}

// アイテム合成: 同じレア度・同じレベル帯の装備 CRAFT_COST 個を消費して、1つ上のレア度に挑戦する。
// 消費するのは「ふるく手に入れたものから」CRAFT_COST 個(厳選済みの新しい当たりを守るため)。
// キューブレベルが足りないレア度は合成できない。合成でキューブ経験値がたまる。
// 返り値: { item, used, success, cube } | { error }
export function craftItems(state, rarity, rng = Math.random, band = null) {
  const rank = RARITY_ORDER.indexOf(rarity);
  if (rank === -1) return { error: "そのレア度は ない" };
  const next = RARITY_ORDER[rank + 1];
  if (!next) return { error: "これいじょう 上のレア度は ない" };

  let pool = state.items.filter((it) => it.rarity === rarity);
  if (band !== null)
    pool = pool.filter((it) => (it.lv ?? 1) >= bandMinOf(band) && (it.lv ?? 1) <= bandCeilOf(band));
  const effBand = band ?? (pool[0] ? itemBand(pool[0].lv) : 0);
  if (!cubeCanCraftBand(state, effBand)) {
    return { error: `${bandLabel(effBand)}の合成は 合成レベル${cubeBandMinLevel(effBand)}で解放` };
  }
  if (pool.length < CRAFT_COST) {
    return { error: `同じレア度・同じレベル帯の 装備が ${CRAFT_COST}個 必要` };
  }
  const used = [...pool]
    .sort((a, b) => a.obtainedAt - b.obtainedAt)
    .slice(0, CRAFT_COST);
  const usedIds = new Set(used.map((it) => it.id));
  state.items = state.items.filter((it) => !usedIds.has(it.id));

  const success = rng() < (CRAFT_SUCCESS[next] ?? 1);
  const item = rollItemOfRarity(success ? next : rarity, rng, used[0].lv ?? 1);
  state.items.push(item);
  const cube = addCubeExp(state, (CUBE_EXP_BY_RARITY[rarity] ?? 4) * CRAFT_COST); // 素材9個ぶん(2026-07-12)
  // こちらは持ち物からの自動選別なので装備中は混ざらない(常に空)
  return { item, used, success, cube, unequipped: [] };
}

// 装備の打ち直し(厳選)。ゴールドを払ってオプションを引き直す。レア度は変わらない。
export function rerollItem(state, itemId, rng = Math.random) {
  const item = state.items.find((it) => it.id === itemId);
  if (!item) return { error: "その装備は 持っていない" };
  const cost = rerollCost(item);
  if (state.gold < cost) return { error: `${cost.toLocaleString("en-US")} GP 足りない` };
  state.gold -= cost;
  rerollOpts(item, rng);
  return { item, cost };
}

// ---- 細工(2026-07-19 バッチ2: 装飾品システム+ゴールドシンク) ----
// 2026-08-05 Haru指示「細工の実装を早める。ノーマル難易度クリア後実装するバランスに」:
// 解禁をヘル到達(ナイトメア10-10クリア)からノーマル全クリア(10-10クリア)へ前倒し。
// 進行ゲートなのでスタート時期による有利不利は生まれない(公平性原則: 「ルールは初日固定、
// 量は後から積む」)。バランス面: enhance は金額(彫刻30M/碑文20M/装飾12M)のゴールド抽選で
// 素材ドロップは絡まない(v3で廃止済み)ため、解禁を早めても「素材が集まるまで使えない」
// 実質のブレーキが効く。tools/balance-model.js の PROFILES は enh投資の想定を実効250から
// ランプさせており(効いた頃には十分ゴールドが貯まっている)、この前倒しでも
// 難易度番人の死守目標(トーメント30日/ヘル13日/Lv100=40日)は動かない
// (balance-sim.jsで実証: 変更前後で日数の差は誤差内)
export function enhanceUnlocked(state) {
  return difficultyUnlocked(state, 1);
}

// 細工v3(2026-07-19深夜): 素材制を廃止し、全ゴールド抽選のスロット制に。
// 指定スロットをゴールドで抽選し、出た行で上書きする(完全ランダム=前の行は消える)。
// 装備中のものにも刻める(インベントリ/倉庫/各モンスターの装備を横断で探す)
export function enhanceRollSlot(state, itemId, slotIdx, rng = Math.random) {
  if (!enhanceUnlocked(state)) return { error: "細工は ノーマル全クリアで解放" };
  const item = findEnhanceTarget(state, itemId);
  if (!item) return { error: "その装備は 持っていない" };
  const slots = enhanceSlotsOf(item);
  if (slots.length === 0) return { error: "細工できるのは レジェンド等級以上の装備だけ" };
  const kind = slots[slotIdx];
  if (!kind) return { error: "そのスロットは ない" };
  // 種別料金(2026-07-21 FB): 彫刻30M/碑文20M/装飾12M。効果レンジも金額に比例。
  // 検証用の無料トグル(settings.debugFreeEnhance)はテスト専用
  const cost = state.settings?.debugFreeEnhance ? 0 : (ENHANCE_ROLL_COSTS[kind] ?? ENHANCE_ROLL_COST);
  if (state.gold < cost) return { error: `ゴールドが 足りない(${cost.toLocaleString("en-US")} G)` };
  state.gold -= cost;
  if (!Array.isArray(item.enhances)) item.enhances = [];
  const before = item.enhances[slotIdx] ?? null;
  // v5: 出るオプションは部位カテゴリで決まる(武器/サブ=攻撃系・防具=防御系・アクセ=周回系)
  item.enhances[slotIdx] = rollEnhanceLine(kind, enhancePartCat(item.part ?? inferPart(item)), rng);
  return { item, slotIdx, before, after: item.enhances[slotIdx], cost };
}

function findEnhanceTarget(state, itemId) {
  return [
    ...state.items,
    ...state.storage,
    ...Object.values(state.monsters ?? {}).flatMap((m) => m.equipment ?? []),
  ].find((it) => it.id === itemId);
}

// キューブ合成(手動): 指定したID群(インベントリ+倉庫から)をちょうど CRAFT_COST 個消費して
// 1つ上のレア度の装備1個を得る。全て同じレア度でないと合成できない。
// 返り値: { item, used } | { error }
// 装備中の1点を持ち主から外す(2026-07-22 FB「装備したまま、パーティに入れたままでも
// 枠に入れて利用ができるように」)。合成・錬金の素材に使われたときの後始末。
// 「外してから入れ直す」という往復操作を無くすのが目的なので、外し忘れで
// 幽霊装備が残らないよう**素材を消す側と同じ関数の中で**呼ぶこと。
export function unequipItemById(state, itemId) {
  for (const mon of Object.values(state.monsters ?? {})) {
    const eq = mon.equipment;
    if (!Array.isArray(eq)) continue;
    const idx = eq.findIndex((it) => it?.id === itemId);
    if (idx !== -1) {
      const [item] = eq.splice(idx, 1);
      return { mon, item };
    }
  }
  return null;
}

// 合成・錬金で素材にできる装備の全体(持ち物+倉庫+装備中)。
// 装備中を含めるのは上記FBのため。倉庫を含めるかはUI側のチェックで絞る
export function craftablePool(state) {
  return [
    ...(state.items ?? []),
    ...(state.storage ?? []),
    ...Object.values(state.monsters ?? {}).flatMap((m) => m.equipment ?? []),
  ];
}

export function craftItemsExact(state, itemIds, rng = Math.random, band = null) {
  const ids = [...new Set(itemIds)];
  if (ids.length !== CRAFT_COST) {
    return { error: `装備を ${CRAFT_COST}個 セットしてね` };
  }
  const pool = craftablePool(state);
  const used = ids.map((id) => pool.find((it) => it.id === id)).filter(Boolean);
  if (used.length !== CRAFT_COST) return { error: "セットした装備が 見つからない" };

  const rarity = used[0].rarity;
  if (!used.every((it) => it.rarity === rarity)) {
    return { error: "同じレア度で 揃えて" };
  }
  // アクセとそれ以外は混ぜられない(2026-07-15 FB「アクセはアクセだけで合成、アクセ以外は
  // アクセ以外だけで合成」)。素材が全部アクセならアクセ、全部アクセ以外ならアクセ以外が出る
  // = レーンをまたいだ変換は起きない(アクセはボス箱限定の希少枠なので、装備からアクセを
  //   量産できてしまうと入手設計が壊れる。逆にアクセを装備に溶かせるのも同じ理由で不可)。
  const charmCount = used.filter((it) => (it.part ?? inferPart(it)) === "charm").length;
  if (charmCount !== 0 && charmCount !== CRAFT_COST) {
    return { error: "アクセサリーと それ以外は 混ぜて合成できない" };
  }
  const partMode = charmCount === CRAFT_COST ? "craftCharm" : "craftGear";
  // 2026-07-13 FB訂正: レベル帯は「上限」に合わせる。帯の下限以上なら(上限を超える
  // レベル差があっても)合成でき、結果レベルは帯の上限にそろう。下限未満は入れられない。
  const minLv = Math.min(...used.map((it) => it.lv ?? 1));
  if (band != null) {
    const bandMin = bandMinOf(band);
    if (minLv < bandMin) {
      return { error: `この帯(${bandLabel(band)})に入れられるのは Lv.${bandMin}以上の装備` };
    }
  }
  // 結果レベル(2026-07-13 FB「必ず上限でなくていい」): 帯上限以下の装備Lv段階のうち
  // 上から2段のどちらかをランダムに(例: 帯20〜40なら Lv30 か Lv40)
  const cap = band != null ? bandCeilOf(band) : minLv;
  const tiers = EQUIP_LV_TIERS.filter((t) => t <= cap);
  const top2 = tiers.slice(-2);
  const resultLv = top2[Math.floor(rng() * top2.length)] ?? 1;
  // 解放判定は「選択中の帯」を最優先(2026-07-13 FB: 帯が重なる設計では
  // L10素材をitemBandで逆算するとLv.10〜20帯と誤判定し、Lv.1〜10帯で合成
  // しているのに上位帯の解放を要求するバグになる)。帯未指定時のみ素材から推定
  const effBand = band ?? itemBand(minLv);
  if (!cubeCanCraftBand(state, effBand)) {
    return { error: `${bandLabel(effBand)}の合成は 合成レベル${cubeBandMinLevel(effBand)}で解放` };
  }
  const rank = RARITY_ORDER.indexOf(rarity);
  const next = RARITY_ORDER[rank + 1];
  if (!next) return { error: "これいじょう 上のレア度は ない" };

  if (used.some((it) => it.locked)) return { error: "🔒 ロック中の装備が混ざっている" };
  const usedIds = new Set(ids);
  state.items = state.items.filter((it) => !usedIds.has(it.id));
  state.storage = state.storage.filter((it) => !usedIds.has(it.id));
  // 装備中のものが素材になっていたら、ここで持ち主から外す(幽霊装備を残さない)
  const unequipped = [];
  for (const id of usedIds) {
    const r = unequipItemById(state, id);
    if (r) unequipped.push(r);
  }
  const success = rng() < (CRAFT_SUCCESS[next] ?? 1);
  const item = rollItemOfRarity(success ? next : rarity, rng, resultLv, partMode);
  state.items.push(item);
  const cube = addCubeExp(state, (CUBE_EXP_BY_RARITY[rarity] ?? 4) * CRAFT_COST); // 素材9個ぶん(2026-07-12)
  return { item, used, success, cube, unequipped };
}

// インベントリの装備を売却してゴールドに変える。
export function sellItem(state, itemId) {
  const idx = state.items.findIndex((it) => it.id === itemId);
  if (idx === -1) return { error: "その装備は 持っていない" };
  const [item] = state.items.splice(idx, 1);
  const price = itemSellPrice(item);
  state.gold += price;
  return { item, price };
}

// 逃がしたときのゴールド(レア度別の基本値。レベルで少し上がる)。
export const RELEASE_GOLD = Object.freeze({
  common: 50, rare: 250, ultra: 1000, legend: 4000, immortal: 15000,
  arcana: 50000, beyond: 180000, century: 600000, cosmic: 2000000,
});

// モンスターを逃がす。装備はインベントリへ戻り、レア度×レベルに応じたGPを得る。
export function releaseMonster(state, monsterId) {
  if (state.monsters[monsterId]?.fav) return { error: "♥ お気に入りの子は 逃がせない(タスモンで♥を外してから)" };
  const mon = state.monsters[monsterId];
  if (!mon) return { error: "モンスターがいない" };
  if (Object.keys(state.monsters).length <= 1) {
    return { error: "最後の1体は にがせない" };
  }
  // 装備は消さずにインベントリへ返す(INV_CAP超過でも失うよりマシ)
  state.items.push(...(mon.equipment ?? []));
  state.party = state.party.filter((id) => id !== monsterId);
  delete state.monsters[monsterId];
  // パーティが空になったら残りから1体を補充する
  if (state.party.length === 0) {
    const first = Object.keys(state.monsters)[0];
    if (first) state.party.push(first);
  }
  const base = RELEASE_GOLD[SPECIES[mon.speciesId].rarity] ?? 0;
  const price = Math.round(base * (1 + (mon.level - 1) * 0.02));
  state.gold += price;
  return { price, monster: mon };
}

// ---- タスモンを食べさせて経験値吸収(2026-07-08: 配合の代わりのキャラ活用) ----
// food のタスモンを target に食べさせ、food の累計経験値の EXP_FEED_RATE(80%)を
// target に注ぐ。food は消える(装備はインベントリへ返す)。バランスは要調整。
export const EXP_FEED_RATE = 0.8;

// あるレベルに到達するまでに費やした累計EXP(Lv1..level-1 の expToNext の合計)。
export function totalExpAt(level) {
  let sum = 0;
  for (let L = 1; L < level; L++) sum += expToNext(L);
  return sum;
}

// food を食べさせて target に経験値を吸わせる。
// 2026-07-09追加: (1)food のスキルを1つ継承 (2)food の個体ランクが上なら target の
// 個体ランクが1つ上がる抽選(RANK_UP_CHANCE)。
export const RANK_UP_CHANCE = 0.5; // 餌のほうが個体ランクが高いときの、ランクアップ抽選

// 食べさせる前の予測(2026-07-11 FB「何レベルまで上がるか・ランクアップ確率が分かるように」)。
// 実処理(feedMonster)と同じ式で、到達レベル・ランクアップ確率・継承候補を返す(非破壊)
export function feedPreview(state, targetId, foodId) {
  const target = state.monsters[targetId];
  const food = state.monsters[foodId];
  if (!target || !food || targetId === foodId) return null;
  const gained = Math.max(1, Math.floor((totalExpAt(food.level) + (food.exp ?? 0)) * EXP_FEED_RATE));
  let lv = target.level;
  let exp = (target.exp ?? 0) + gained;
  while (lv < LEVEL_CAP && exp >= expToNext(lv)) {
    exp -= expToNext(lv);
    lv += 1;
  }
  const tg = gradeFromIv(target.iv ?? { atk: 1, hp: 1 });
  const fg = gradeFromIv(food.iv ?? { atk: 1, hp: 1 });
  const rankUpChance = fg.stars > tg.stars ? RANK_UP_CHANCE : 0;
  const learned = target.learnedSkills ?? [SPECIES[target.speciesId].skillId];
  const inheritCandidates =
    learned.length < SKILL_LEARN_MAX
      ? (food.learnedSkills ?? []).filter(
          (id) => SKILLS[id] && !SKILLS[id].jobOnly && !SKILLS[id].signature && !learned.includes(id),
        )
      : [];
  return {
    gained,
    newLevel: lv,
    levelsGained: lv - target.level,
    rankUpChance,
    targetRank: tg.rank,
    foodRank: fg.rank,
    inheritCandidates,
  };
}

// opts.skillId: 継承するスキルを指名(候補にあれば必ずそれ 2026-07-11 FB「選べるように」)
// opts.noInherit: 継承しない(まとめ食べで「最高レアの子だけ継承」を実現する抑制フラグ)
export function feedMonster(state, targetId, foodId, rng = Math.random, opts = {}) {
  if (targetId === foodId) return { error: "自分自身には 力を託せない" };
  const target = state.monsters[targetId];
  const food = state.monsters[foodId];
  if (!target || !food) return { error: "タスモンが いない" };
  if (onExpedition(state, targetId) || onExpedition(state, foodId)) return { error: "探索中の子は 使えない" };
  if (Object.keys(state.monsters).length <= 1) return { error: "最後の1体は 旅立たせられない" };
  if (target.level >= LEVEL_CAP) return { error: "対象は もうレベル最大" };
  const foodExp = totalExpAt(food.level) + (food.exp ?? 0);
  const gained = Math.max(1, Math.floor(foodExp * EXP_FEED_RATE));
  const before = target.level;
  target.exp = (target.exp ?? 0) + gained;
  while (target.level < LEVEL_CAP && target.exp >= expToNext(target.level)) {
    target.exp -= expToNext(target.level);
    target.level += 1;
  }
  if (target.level >= LEVEL_CAP) target.exp = 0;

  // (1) スキル継承: food が覚えているスキルから、target が未修得のものを1つ受け継ぐ
  //     (target が最大数に達している場合は継承しない)。
  target.learnedSkills = target.learnedSkills ?? [SPECIES[target.speciesId].skillId];
  let inheritedSkill = null;
  if (!opts.noInherit && target.learnedSkills.length < SKILL_LEARN_MAX) {
    const candidates = (food.learnedSkills ?? []).filter(
      (id) => SKILLS[id] && !SKILLS[id].jobOnly && !SKILLS[id].signature && !target.learnedSkills.includes(id),
    );
    if (candidates.length > 0) {
      // 指名があればそれを、なければ抽選(2026-07-11 FB「継承するスキルは選べるように」)
      const pick = candidates.includes(opts.skillId)
        ? opts.skillId
        : candidates[Math.floor(rng() * candidates.length) % candidates.length];
      target.learnedSkills.push(pick);
      inheritedSkill = SKILLS[pick];
    }
  }

  // (2) 個体ランク上昇抽選: 餌の個体ランク(星)が target より高いとき、抽選で1ランク上げる。
  //     IV平均を1つ上のランクの下限へ引き上げる(atk/hpに同量加算・上限 IV_MAX_BRED)。
  let rankUp = null;
  const tg = gradeFromIv(target.iv ?? { atk: 1, hp: 1 });
  const fg = gradeFromIv(food.iv ?? { atk: 1, hp: 1 });
  if (fg.stars > tg.stars && rng() < RANK_UP_CHANCE) {
    const grades = [...GRADES].sort((a, b) => a.min - b.min); // 低→高
    const next = grades.find((g) => g.stars > tg.stars);
    if (next) {
      const curAvg = ((target.iv?.atk ?? 1) + (target.iv?.hp ?? 1)) / 2;
      const delta = next.min + 0.02 - curAvg;
      if (delta > 0) {
        target.iv = target.iv ?? { atk: 1, hp: 1 };
        target.iv.atk = Math.min(IV_MAX_BRED, target.iv.atk + delta);
        target.iv.hp = Math.min(IV_MAX_BRED, target.iv.hp + delta);
      }
      rankUp = { from: tg.rank, to: gradeFromIv(target.iv).rank };
    }
  }

  // (3) 色違い遺伝: 色違いを餌にすると確率で色違いが遺伝する(2026-07-10)。
  //     「色違い=確定覚醒」の原則に合わせて、遺伝時に未覚醒なら覚醒1も付与し
  //     個体値下限を覚醒基準へ引き上げる(上限 IV_MAX_BRED)。
  let shinyInherited = false;
  if (food.shiny && !target.shiny && rng() < SHINY_FEED_INHERIT) {
    target.shiny = true;
    shinyInherited = true;
    if ((target.awakening ?? 0) === 0) {
      // 6段化(2026-07-16): 生まれつきの特別は bornStep(=2段)。旧1段と同じ強さを保つ
      target.awakening = AWAKENING.bornStep;
      const floor = AWAKENING.ivFloor[target.awakening];
      target.iv = target.iv ?? { atk: 1, hp: 1 };
      for (const k of Object.keys(target.iv)) {
        target.iv[k] = Math.min(IV_MAX_BRED, Math.max(target.iv[k], floor));
      }
    }
  }

  // food を消す(装備は失わずインベントリへ返す)
  state.items.push(...(food.equipment ?? []));
  state.party = state.party.filter((id) => id !== foodId);
  delete state.monsters[foodId];
  if (state.party.length === 0) {
    const first = Object.keys(state.monsters)[0];
    if (first) state.party.push(first);
  }
  return {
    gained,
    levelsGained: target.level - before,
    newLevel: target.level,
    foodName: SPECIES[food.speciesId].name,
    inheritedSkill, // 継承したスキル定義(なければ null)
    rankUp, // {from,to} 個体ランクが上がったら(なければ null)
    shinyInherited, // 色違い(=覚醒)が遺伝したら true
  };
}

// ---- 覚醒の儀(いらないタスモンを捧げて覚醒に挑戦する) ----
// 配合を廃止したため、覚醒の深化(0→1→2→3)は儀式が唯一の経路=ラダーの本体。
// ダブり/不要個体を「覚醒の欠片」に変えて対象の覚醒を狙うギャンブル。成功すれば覚醒+1
// (三重覚醒=Lv3 まで到達可能。ただし 2→3 は極端に重い“究極の博打”)。捧げた個体は
// 成否に関わらず消える=A辛口の射幸性シンク。捧げるほど・格上ほど・覚醒個体を捧げるほど成功率↑。
export const AWAKEN_RITUAL_CAP = AWAKEN_MAX; // 覚醒Ⅵまで(6段化 2026-07-16)
export const RITUAL_MAX_CHANCE = 0.9; // 100%にはしない(あくまで挑戦)
// 対象の現覚醒レベル→必要な欠片量(別種を捧げる「慈悲パス」の重さ)。
// 6段化(2026-07-16)で旧0→1が新0→2に相当するため、旧の {0:30, 1:120, 2:360} を
// 1段ぶんずつに割り直す(旧1段=新2段なので、新2段ぶんの合計が旧1段ぶんと同じ重さ)。
//   旧0→1(30)  = 新0→1(12) + 新1→2(18)
//   旧1→2(120) = 新2→3(48) + 新3→4(72)
//   旧2→3(360) = 新4→5(144) + 新5→6(216)
const RITUAL_NEED = { 0: 12, 1: 18, 2: 48, 3: 72, 4: 144, 5: 216 };

function ritualShards(mon) {
  const stars = RARITY_META[SPECIES[mon.speciesId]?.rarity]?.stars ?? 1;
  const lvBonus = 1 + Math.max(0, (mon.level ?? 1) - 1) * 0.02;
  const awBonus = 1 + (mon.awakening ?? 0); // 覚醒個体を捧げると欠片が跳ねる
  return stars * lvBonus * awBonus;
}

// 対象より格下の欠片は割り引く(2026-07-17 FB「覚醒させたいキャラのレア度が高いほど、
// 餌のレア度が低い場合には上がる確率が低く。高レアほど覚醒が難しく」)。
// 星差1つごとに×0.6。同格以上の餌はペナルティなし(コモンをコモンで上げる体験は不変)。
// 例: セレスティアル(★10)にコモン(★1)を捧げると ×0.6^9 ≈ 1% — 高レアは同格級の餌が実質必須
export const RITUAL_RARITY_GAP = 0.6;
function ritualGapFactor(target, food) {
  const tStars = RARITY_META[SPECIES[target.speciesId]?.rarity]?.stars ?? 1;
  const fStars = RARITY_META[SPECIES[food.speciesId]?.rarity]?.stars ?? 1;
  return Math.pow(RITUAL_RARITY_GAP, Math.max(0, tStars - fStars));
}

// 成功率を返す(捧げずに計算だけ)。UI のプレビュー用。
// 2026-07-16(原神の凸方式): **同種は確定、別種は欠片**。
//   ・同種の子 1体 = 確率なしで確定+1段(引く時だけがRNG、使う時は確定)
//   ・別種の子 = 欠片(星×レベル×覚醒)を積んで「確定ぶんの次の段」に確率で挑戦
//   ・上限を超えたぶんの同種も欠片として挑戦側に回る(無駄にならない)
// 旧方式は「引く時と使う時の二重RNG」で、失敗すると素材が消えるだけだった。
export function awakenRitualOdds(state, targetId, foodIds) {
  const target = state.monsters[targetId];
  if (!target) return { error: "対象がいない", chance: 0, guaranteed: 0 };
  const lv = target.awakening ?? 0;
  if (lv >= AWAKEN_RITUAL_CAP) {
    return { error: `既に最大覚醒(${AWAKENING.label[AWAKEN_MAX]})です`, chance: 0, guaranteed: 0 };
  }
  const foods = (foodIds ?? []).filter((id) => id !== targetId && state.monsters[id]);
  const sameIds = foods.filter((id) => state.monsters[id].speciesId === target.speciesId);
  const otherIds = foods.filter((id) => state.monsters[id].speciesId !== target.speciesId);
  // 同種=確定(上限まで)。あふれた同種は欠片へ
  const guaranteed = Math.min(sameIds.length, AWAKEN_RITUAL_CAP - lv);
  const overflowSame = sameIds.slice(guaranteed);
  const lvAfter = lv + guaranteed;
  const shards = [...otherIds, ...overflowSame].reduce(
    (s, id) => s + ritualShards(state.monsters[id]) * ritualGapFactor(target, state.monsters[id]),
    0,
  );
  const need = RITUAL_NEED[lvAfter] ?? RITUAL_NEED[AWAKEN_RITUAL_CAP - 1] ?? 216;
  const chance = lvAfter >= AWAKEN_RITUAL_CAP || shards <= 0
    ? 0
    : Math.min(RITUAL_MAX_CHANCE, shards / need);
  return {
    chance,
    guaranteed,
    sameCount: sameIds.length,
    shards: Math.round(shards * 10) / 10,
    need,
    foodCount: foods.length,
    nextLevel: Math.min(AWAKEN_RITUAL_CAP, lvAfter + (chance > 0 ? 1 : 0)),
    afterGuaranteed: lvAfter,
  };
}

// 儀式を実行する。捧げた個体は成否に関わらず消える(装備はインベントリへ返す)。
// 2026-07-16: 同種は確定で+1段/体、別種(と上限あふれの同種)は欠片で次の段に挑戦。
export function awakenRitual(state, targetId, foodIds, rng = Math.random) {
  const target = state.monsters[targetId];
  if (!target) return { error: "対象がいない" };
  if (onExpedition(state, targetId) || foodIds.some((id) => onExpedition(state, id)))
    return { error: "探索中の子は 使えない" };
  const lv = target.awakening ?? 0;
  if (lv >= AWAKEN_RITUAL_CAP) {
    // 旧文言は「三重覚醒は配合限定」だったが、配合は封印中(ENABLE_BREEDING=false)で
    // 存在しない機能を案内していた。実際は儀式が唯一の経路(2026-07-16 修正)
    return { error: `既に最大覚醒(${AWAKENING.label[AWAKEN_MAX]})です` };
  }
  const foods = (foodIds ?? []).filter((id) => id !== targetId && state.monsters[id]);
  if (foods.length === 0) return { error: "想いを重ねる子を 選んで" };
  // 対象＋捧げるぶんを除いて最低1体は残す
  if (Object.keys(state.monsters).length - foods.length < 1) {
    return { error: "最後の1体は 残さないといけない" };
  }
  const odds = awakenRitualOdds(state, targetId, foodIds);

  // 捧げる(装備はインベントリへ返す)
  for (const id of foods) {
    const f = state.monsters[id];
    state.items.push(...(f.equipment ?? []));
    state.party = state.party.filter((pid) => pid !== id);
    delete state.monsters[id];
  }
  if (state.party.length === 0) {
    const first = Object.keys(state.monsters)[0];
    if (first) state.party.push(first);
  }

  // ①同種の確定ぶん(失敗しない) ②欠片での挑戦(確率)
  const gained = odds.guaranteed;
  const rolled = odds.chance > 0 && rng() < odds.chance;
  const total = gained + (rolled ? 1 : 0);
  if (total > 0) {
    target.awakening = Math.min(AWAKEN_RITUAL_CAP, lv + total);
    // 覚醒個体は個体値も別格に(下限を引き上げ・各卵上限までクランプ)
    const floor = AWAKENING.ivFloor[target.awakening];
    if (floor && target.iv) {
      for (const k of Object.keys(target.iv)) {
        target.iv[k] = Math.min(IV_MAX_BRED, Math.max(target.iv[k], floor));
      }
    }
  }
  return {
    success: total > 0,
    guaranteed: gained,
    rolled,
    chance: odds.chance,
    newLevel: target.awakening ?? 0,
    sacrificed: foods.length,
  };
}

// 装備変換の排出レアリティ確率(UI表示用)。monsterToEquipment の上寄せロジックと一致させる。
// 基準=40% / +1=45% / +2=15%(上限を超えるぶんは上限レアに畳み込む)。
// 覚醒の保証(2026-07-16): 覚醒2段ごとにレア度+1が保証される(Ⅱ=+1/Ⅳ=+2/Ⅵ=+3)。
// 抽選の上振れ(45%+1/15%+2)と保証は max で合成=覚醒が上振れを「下支え」する
export function conversionGuaranteedUp(mon) {
  return Math.floor((mon?.awakening ?? 0) / 2);
}
export function conversionOdds(mon) {
  const max = RARITY_ORDER.length - 1;
  const base = RARITY_ORDER.indexOf(SPECIES[mon.speciesId].rarity);
  const g = conversionGuaranteedUp(mon);
  const dist = new Map();
  const add = (i, p) => {
    const k = Math.min(max, i);
    dist.set(k, (dist.get(k) ?? 0) + p);
  };
  add(base + Math.max(0, g), 0.4);
  add(base + Math.max(1, g), 0.45);
  add(base + Math.max(2, g), 0.15);
  return [...dist.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([i, p]) => ({ rarity: RARITY_ORDER[i], chance: p }));
}

// ---- タスモンを装備に変換(2026-07-08: 育てたキャラを装備ガチャに回す) ----
// 2026-07-09「キャラのほうがレアなので、よりレアな装備に変換できるように」→ 下振れを廃止し
// 上寄せに。基準レア=40% / +1=45% / +2=15%(上限でクランプ)。レベルを装備Lvにして1個ロール。
// 2026-07-16(覚醒6段化とセット): 覚醒段が結果を引き上げる。
//   ・覚醒2段ごとにレア度+1を保証(抽選の上振れと max 合成)
//   ・覚醒Ⅵは**確定でユニーク(1点もの)**を鍛え、魂の由来(soul)を刻む
// これが「56日かけて作った覚醒Ⅵ」の出口: モンスター自体は旅立つ(=シンク)が、
// 世界に1つの刻印つき武具として残り、それはマーケットで売れる。
export function monsterToEquipment(state, monsterId, rng = Math.random) {
  const mon = state.monsters[monsterId];
  if (!mon) return { error: "タスモンが いない" };
  if (onExpedition(state, monsterId)) return { error: "探索中の子は 旅立たせられない" };
  if (Object.keys(state.monsters).length <= 1) return { error: "最後の1体は 旅立たせられない" };
  if (state.items.length >= invCapOf(state)) return { error: "持ち物が 満杯" };
  const max = RARITY_ORDER.length - 1;
  let idx = RARITY_ORDER.indexOf(SPECIES[mon.speciesId].rarity);
  const aw = mon.awakening ?? 0;
  const roll = rng();
  const up = roll < 0.15 ? 2 : roll < 0.6 ? 1 : 0; // 15% +2 / 45% +1 / 40% 据え置き
  idx = Math.min(max, idx + Math.max(up, conversionGuaranteedUp(mon)));
  const rarity = RARITY_ORDER[idx];
  const lv = Math.max(1, mon.level);
  // 覚醒Ⅵ: ドロップ率ゲートなしの確定鍛造(そのレア度にユニークが無ければ通常品+魂)
  let item = aw >= AWAKEN_MAX ? forgeUniqueOfRarity(rarity, lv, rng) : null;
  const soulForged = !!item;
  if (!item) item = rollItemOfRarity(rarity, rng, lv);
  if (aw > 0) {
    // 魂の由来。表示・相場(プレミア)・刻印資格が参照する
    item.soul = {
      speciesId: mon.speciesId,
      name: SPECIES[mon.speciesId].name,
      awakening: aw,
      shiny: !!mon.shiny,
    };
  }
  // モンスターを消す(装備していたぶんはインベントリへ返す)+ 生成した装備を追加
  state.items.push(...(mon.equipment ?? []));
  state.party = state.party.filter((id) => id !== monsterId);
  delete state.monsters[monsterId];
  if (state.party.length === 0) {
    const first = Object.keys(state.monsters)[0];
    if (first) state.party.push(first);
  }
  state.items.push(item);
  return { item, rarity, monName: SPECIES[mon.speciesId].name, soulForged, awakening: aw };
}

// ---- キューブの錬金術: いらない装備/卵/タスモンをまとめて売り、
//      ゴールド + キューブEXP に変える(売却の一元窓口)。 ----
// 装備の錬金(インベントリ・倉庫どちらも対象)。
export function alchemizeItems(state, itemIds) {
  const idset = new Set(itemIds);
  // ロック中の装備は売れない(2026-07-13 FB「アイテムロック(削除や使用の保護)」)
  const targets = [...state.items, ...state.storage].filter((it) => idset.has(it.id) && !it.locked);
  if (targets.length === 0) return { count: 0, gold: 0, cube: { levelUps: 0, level: cubeLevelOf(state) } };
  let gold = 0;
  let exp = 0;
  for (const it of targets) {
    gold += itemSellPrice(it);
    exp += CUBE_EXP_BY_RARITY[it.rarity] ?? 4;
  }
  state.items = state.items.filter((it) => !idset.has(it.id));
  state.storage = state.storage.filter((it) => !idset.has(it.id));
  state.gold += gold;
  const cube = addCubeExp(state, exp);
  return { count: targets.length, gold, exp, cube };
}

// パーティ外のタスモンを錬金(=逃がす)。ゴールドは releaseMonster が加算するので
// ここでは合算とキューブEXPだけ足す。
export function alchemizeMonsters(state, monsterIds) {
  let gold = 0;
  let exp = 0;
  let count = 0;
  for (const id of monsterIds) {
    if (state.party.includes(id)) continue; // パーティは守る
    const mon = state.monsters[id];
    if (!mon) continue;
    const rarity = SPECIES[mon.speciesId].rarity;
    const r = releaseMonster(state, id);
    if (r.error) continue;
    gold += r.price;
    exp += CUBE_EXP_BY_RARITY[rarity] ?? 4;
    count++;
  }
  const cube = addCubeExp(state, exp);
  return { count, gold, exp, cube };
}

// 卵の錬金。売値=逃がし基準の3割。指定レア度の卵をまとめて売る。
export function alchemizeEggs(state, rarities) {
  const set = new Set(rarities);
  const targets = state.eggs.filter((e) => set.has(e.rarity));
  if (targets.length === 0) return { count: 0, gold: 0, cube: { levelUps: 0, level: cubeLevelOf(state) } };
  let gold = 0;
  let exp = 0;
  for (const e of targets) {
    gold += Math.round((RELEASE_GOLD[e.rarity] ?? 0) * 0.3);
    exp += Math.round((CUBE_EXP_BY_RARITY[e.rarity] ?? 4) * 0.5);
  }
  state.eggs = state.eggs.filter((e) => !set.has(e.rarity));
  state.gold += gold;
  const cube = addCubeExp(state, exp);
  return { count: targets.length, gold, exp, cube };
}

// ---- 育成: 兆し(ポイント制) ----

// 未使用ポイント数(レベル到達ぶん − 振ったぶん)。Lv10ごとに1ポイント。
// 使ったポイント数。スフィア盤導入(2026-07-10)で「1pt=perks 1件」が崩れた
// (大スフィア=1ptで3件)ため専用カウンタで数える。旧セーブはperks件数=消費数。
export function perkPointsSpent(monster) {
  return monster.perkSpent ?? (monster.perks?.length ?? 0);
}

export function pendingPerks(monster) {
  return Math.max(0, perkMilestones(monster.level) - perkPointsSpent(monster));
}

// 兆しポイントを好きなバフに1ふる。同じバフへの重ね振りOK。
// (スフィア盤導入後はUIから使わないが、互換とテストのため残す)
export function choosePerk(state, monsterId, perkId) {
  const mon = state.monsters[monsterId];
  if (!mon) return { error: "モンスターがいない" };
  if (pendingPerks(mon) <= 0) return { error: "ポイントがない(レベルアップで獲得)" };
  if (!PERKS[perkId]) return { error: "その 兆しは ない" };
  const spentBefore = perkPointsSpent(mon); // pushの前に確定(pushで perks.length が変わる)
  mon.perks = mon.perks ?? [];
  mon.perks.push({ milestone: mon.perks.length + 1, id: perkId });
  mon.perkSpent = spentBefore + 1;
  return { perk: PERKS[perkId], points: mon.perks.length };
}

// ---- スフィア盤(FF10方式 2026-07-10) ----
// mon.sphere = { taken: [nodeId...] }。効果はノード解放時に mon.perks へ実体化するので
// 戦闘側(perkStat/perkMult/sumPerk)の配線は従来のまま。
export function sphereTaken(mon) {
  return mon?.sphere?.taken ?? [];
}

// いま解放できるノード(=解放済みノードか中心に隣接する未解放ノード)。
// jobLock付き(ジョブ島)は該当ジョブのタスモンだけが対象(2026-07-11)。
export function sphereFrontier(mon) {
  const taken = new Set(sphereTaken(mon));
  const out = [];
  for (const n of Object.values(SPHERE_NODES)) {
    if (taken.has(n.id)) continue;
    if (n.jobLock && mon?.job !== n.jobLock) continue;
    if (n.edges.some((e) => e === "start" || taken.has(e))) out.push(n.id);
  }
  return out;
}

// 特殊スフィアの封印(2026-07-12 FB「特殊が簡単に取れすぎる」)。
// ・特殊(核): 隣接するスフィアを全部解放するまで封印(囲みを崩して開ける)
// ・キーストーン(目玉): その領域の特殊スフィアを全部解放するまで封印(領域制覇の証)
// 封印中なら {kind, missing, total} を、解放条件を満たしていれば null を返す。
// takenOverride: お任せのルート事前シミュレーション用(2026-07-13)。
// 実際の解放状態のかわりに「仮に取ったことにした集合」で封印判定できる。
export function sphereLockReason(mon, nodeId, takenOverride = null) {
  const node = SPHERE_NODES[nodeId];
  if (!node || node.type !== "special") return null;
  // ジョブ島の専用特殊は封印なし(レア職の取得自体が最大のゲートのため)
  if (node.jobLock) return null;
  const taken = takenOverride ?? new Set(sphereTaken(mon));
  if (node.keystone) {
    // 同系統の特殊(効果IDで紐づけ)を全部解放するまで封印
    const pool = SPHERE_SECTOR_SPECIALS[node.grants[0]] ?? [];
    const req = Object.values(SPHERE_NODES).filter(
      (n) => n.type === "special" && !n.keystone && !n.jobLock && pool.includes(n.grants[0]),
    );
    const missing = req.filter((n) => !taken.has(n.id)).length;
    if (missing > 0) return { kind: "keystone", missing, total: req.length };
  } else {
    const neigh = node.edges.filter((e) => e !== "start");
    const missing = neigh.filter((e) => !taken.has(e)).length;
    if (missing > 0) return { kind: "special", missing, total: neigh.length };
  }
  return null;
}

export function sphereActivate(state, monsterId, nodeId) {
  const mon = state.monsters[monsterId];
  if (!mon) return { error: "モンスターがいない" };
  if (pendingPerks(mon) <= 0) return { error: "ポイントがない(レベルアップで獲得)" };
  const node = SPHERE_NODES[nodeId];
  if (!node) return { error: "そのスフィアは ない" };
  if (node.jobLock && mon.job !== node.jobLock)
    return { error: `このスフィアは【${JOBS[node.jobLock]?.label ?? node.jobLock}】専用` };
  mon.sphere = mon.sphere ?? { taken: [] };
  if (mon.sphere.taken.includes(nodeId)) return { error: "もう解放している" };
  if (!sphereFrontier(mon).includes(nodeId)) return { error: "繋がっていない(隣のスフィアから解放しよう)" };
  const lock = sphereLockReason(mon, nodeId);
  if (lock) {
    return {
      error:
        lock.kind === "keystone"
          ? `目玉スフィアは封印中: 同系統の特殊スフィアを全部解放すると開く(あと${lock.missing}個)`
          : `特殊スフィアは封印中: 周りのスフィアを全部解放すると開く(あと${lock.missing}個)`,
    };
  }
  const spentBefore = perkPointsSpent(mon); // pushで perks.length が変わる前に確定させる
  mon.sphere.taken.push(nodeId);
  mon.perks = mon.perks ?? [];
  for (const pid of node.grants) mon.perks.push({ id: pid, node: nodeId });
  mon.perkSpent = spentBefore + 1;
  return { node, perks: node.grants.map((id) => PERKS[id]) };
}

// 兆しの振り直しコスト(GP)。振ったポイント数に応じて増える(救済措置なので過度に高くしない)。
export function perkResetCost(monster) {
  const spent = perkPointsSpent(monster);
  if (spent === 0) return 0;
  return Math.round(800 * spent * Math.pow(1 + monster.level / 20, 1.2));
}

// 兆しを全部振り直す。GPを払って振ったポイントを未使用に戻す(スフィア盤も白紙に)。
export function resetPerks(state, monsterId) {
  const mon = state.monsters[monsterId];
  if (!mon) return { error: "モンスターがいない" };
  const spent = perkPointsSpent(mon);
  if (spent === 0) return { error: "振った兆しが ない" };
  const cost = perkResetCost(mon);
  if (state.gold < cost) return { error: `${cost.toLocaleString("en-US")} GP 足りない` };
  state.gold -= cost;
  mon.perks = [];
  mon.perkSpent = 0;
  mon.sphere = { taken: [], rev: SPHERE_BOARD_REV };
  return { cost, refunded: spent };
}

// 激レアドロップ「叡智の水晶」で兆しを無料で振り直す(GP不要の救済)。
export function resetPerksWithToken(state, monsterId) {
  const mon = state.monsters[monsterId];
  if (!mon) return { error: "モンスターがいない" };
  const spent = perkPointsSpent(mon);
  if (spent === 0) return { error: "振った兆しが ない" };
  if (crystalCount(state) <= 0) return { error: "叡智の水晶を 持っていない" };
  state.crystalItems.shift(); // 古いものから1個消費
  mon.perks = [];
  mon.perkSpent = 0;
  mon.sphere = { taken: [], rev: SPHERE_BOARD_REV };
  return { refunded: spent, remaining: crystalCount(state) };
}

// ---- 育成: スキル習得(Lv10ごとの2択)とセット(最大2つ) ----
export const SKILL_LOADOUT_MAX = 2;

// 節目で選んだスキルの数。配合の継承スキルは節目を消費しないため、
// learnedSkillsの長さでなくskillPicks(専用カウンタ)で数える。
// 旧セーブ(skillPicksなし)は「基本スキル以外=全部節目で覚えた」とみなす。
export function skillPicksOf(monster) {
  return monster.skillPicks ?? Math.max(0, (monster.learnedSkills?.length ?? 1) - 1);
}

// 未習得の節目の数。習得はLv10ごとに1回(兆しポイントのレベルごととは別カウント)。
export function pendingSkillPicks(monster) {
  return Math.max(0, skillMilestones(monster.level) - skillPicksOf(monster));
}

// 覚えられるスキルの上限。これを超えて覚えるには何かを忘れる必要がある(item13)。
export const SKILL_LEARN_MAX = 4;

// スキルを1つ忘れる(習得枠を空ける)。セット中なら外す。
// 2026-07-28 FB「初期スキルを忘れることができない」: 基本スキルの保護を撤廃した。
// 保護は「スキルが0個になる事故」を防ぐためだったので、守るべき不変条件を
// 「最後の1個は忘れられない」に置き換える(基本スキルだけ特別扱いしない)
export function forgetSkill(state, monsterId, skillId) {
  const mon = state.monsters[monsterId];
  if (!mon) return { error: "モンスターがいない" };
  const baseSkill = SPECIES[mon.speciesId].skillId;
  mon.learnedSkills = mon.learnedSkills ?? [baseSkill];
  if (!mon.learnedSkills.includes(skillId)) return { error: "その スキルは 覚えていない" };
  if (mon.learnedSkills.length <= 1) return { error: "最後の1個は 忘れられない" };
  mon.learnedSkills = mon.learnedSkills.filter((id) => id !== skillId);
  mon.equippedSkills = (mon.equippedSkills ?? [baseSkill]).filter((id) => id !== skillId);
  if (mon.equippedSkills.length === 0) mon.equippedSkills = [mon.learnedSkills[0]];
  return { forgot: skillId };
}

// 次の節目の2択からスキルを1つ覚える。選び直しは不可。
// 覚えているスキルが SKILL_LEARN_MAX 個に達している場合は forgetId を指定して1つ忘れる。
export function learnSkill(state, monsterId, skillId, forgetId = null) {
  const mon = state.monsters[monsterId];
  if (!mon) return { error: "モンスターがいない" };
  if (pendingSkillPicks(mon) <= 0) return { error: "今は 覚えられない" };
  mon.learnedSkills = mon.learnedSkills ?? [SPECIES[mon.speciesId].skillId];
  const milestone = skillPicksOf(mon) + 1; // 1はじまり(基本スキルの次)
  const stars = RARITY_META[SPECIES[mon.speciesId].rarity].stars;
  const jobRole = jobRoleOf(mon); // 進化ジョブがあればそのロールのスキルを覚える
  const choices = skillChoices(mon.id, milestone, stars, mon.learnedSkills, jobRole, SPECIES[mon.speciesId].element);
  if (!choices.includes(skillId)) return { error: "その スキルは 今の2択にない" };
  // 4つ覚えていたら1つ忘れないと覚えられない(基本スキルも忘れる対象にできる 2026-07-28)
  if (mon.learnedSkills.length >= SKILL_LEARN_MAX) {
    if (!forgetId || !mon.learnedSkills.includes(forgetId)) {
      return { error: `スキルは ${SKILL_LEARN_MAX}つまで。忘れるスキルを選んで`, needForget: true };
    }
    forgetSkill(state, monsterId, forgetId);
  }
  mon.learnedSkills.push(skillId);
  mon.skillPicks = milestone;
  return { skill: SKILLS[skillId], milestone };
}

// この節目ではスキルを覚えない(見送る 2026-07-12 FB)。節目は消費され、やり直せない。
// 見送った節目は mon.skillSkips に記録(レベルツリーの表示用)。
export function skipSkillPick(state, monsterId) {
  const mon = state.monsters[monsterId];
  if (!mon) return { error: "モンスターがいない" };
  if (pendingSkillPicks(mon) <= 0) return { error: "今は 選べる節目がない" };
  const milestone = skillPicksOf(mon) + 1;
  mon.skillSkips = [...(mon.skillSkips ?? []), milestone];
  mon.skillPicks = milestone;
  return { skipped: true, milestone };
}

// 覚えたスキルをセット/外す(1〜SKILL_LOADOUT_MAX個)。
export function toggleEquippedSkill(state, monsterId, skillId) {
  const mon = state.monsters[monsterId];
  if (!mon) return { error: "モンスターがいない" };
  mon.learnedSkills = mon.learnedSkills ?? [SPECIES[mon.speciesId].skillId];
  mon.equippedSkills = mon.equippedSkills ?? [SPECIES[mon.speciesId].skillId];
  if (!mon.learnedSkills.includes(skillId)) return { error: "その スキルは 覚えていない" };
  const idx = mon.equippedSkills.indexOf(skillId);
  if (idx !== -1) {
    if (mon.equippedSkills.length <= 1) return { error: "スキルは 1つ以上セットしてね" };
    mon.equippedSkills.splice(idx, 1);
    return { equipped: mon.equippedSkills, removed: skillId };
  }
  if (mon.equippedSkills.length >= SKILL_LOADOUT_MAX) {
    return { error: `セットできるのは ${SKILL_LOADOUT_MAX}つまで(外してから)` };
  }
  mon.equippedSkills.push(skillId);
  return { equipped: mon.equippedSkills, added: skillId };
}

// スキルをスロット番号指定でセットする(スキル欄へのドラッグ&ドロップ/クリック 2026-07-12)。
// 空きスロット=追加、使用中スロット=置き換え(前のスキルは外れる)、
// セット済みスキルを別スロットへ=入れ替え。
export function setEquippedSkillAt(state, monsterId, skillId, slot) {
  const mon = state.monsters[monsterId];
  if (!mon) return { error: "モンスターがいない" };
  mon.learnedSkills = mon.learnedSkills ?? [SPECIES[mon.speciesId].skillId];
  mon.equippedSkills = mon.equippedSkills ?? [SPECIES[mon.speciesId].skillId];
  if (!mon.learnedSkills.includes(skillId)) return { error: "その スキルは 覚えていない" };
  const s = Math.max(0, Math.min(SKILL_LOADOUT_MAX - 1, slot | 0));
  const list = [...mon.equippedSkills];
  const cur = list.indexOf(skillId);
  if (cur === s) return { equipped: mon.equippedSkills, unchanged: true };
  const prevAtS = list[s] ?? null;
  if (cur !== -1) {
    // 別スロットにセット済み→入れ替え(移動先が空なら単純移動)
    list[cur] = prevAtS;
    list[s] = skillId;
    mon.equippedSkills = list.filter(Boolean);
  } else {
    if (s < list.length) list[s] = skillId;
    else list.push(skillId);
    mon.equippedSkills = list;
  }
  return { equipped: mon.equippedSkills, added: skillId, replaced: cur === -1 ? prevAtS : null };
}

// パーティメンバーにモンスターを出し入れする。
// 既にいれば外す(最後の1体は外せない)。いなければ空きがあれば加える。
export function togglePartyMember(state, monsterId) {
  const idx = state.party.indexOf(monsterId);
  if (idx !== -1) {
    if (state.party.length <= 1) return false; // 最低1体は必要
    state.party.splice(idx, 1);
    return true;
  }
  if (state.party.length >= MAX_PARTY) return false;
  if (!state.monsters[monsterId]) return false;
  if (onExpedition(state, monsterId)) return false; // 探索中はパーティに入れられない
  state.party.push(monsterId);
  return true;
}

// ---- 進化(上位ジョブ/レアジョブ 2026-07-10) ----
// Lv30で1回だけ。選択肢: 同ジョブの上位(先頭=推奨)/別ジョブの上位(ジョブチェンジ)/
// まれに個体固有のレアジョブ(決定的ハッシュ=引き直し不可)。
export function baseJobRole(mon) {
  return SKILLS[SPECIES[mon.speciesId]?.skillId]?.active?.type ?? "nuke";
}
// 今のロール(進化ジョブがあればそちらを優先)。スキル習得プールもこれに従う
export function jobRoleOf(mon) {
  return JOBS[mon?.job]?.role ?? baseJobRole(mon);
}

// 進化した個体のレアリティ(2026-07-11 FB「進化で姿と共にレアリティも上がる」):
// 種族レア度+進化段(上限=セレスティアル)。表示(枠色/ラベル/星)はこれを使う。
// ※GP換金/儀式の重み/刻印など経済系は種族レア度のまま(進化でファーム価値が壊れないように)
export function monRarityOf(mon) {
  // 2026-07-11 FB「進化でレアリティは上げなくていい」→ 常に種族レア度を返す
  // (表示15箇所+オーラtierの共通入口なので、関数は残して挙動だけ戻す)
  return SPECIES[mon?.speciesId]?.rarity ?? "common";
}

// 完了した進化の回数(0=未進化, 1=上位職, 2=最上位/隠し職)
export function evolveStage(mon) {
  const t = JOBS[mon?.job]?.tier;
  if (!t) return 0;
  return t >= 3 ? 2 : 1;
}

export function canEvolve(mon) {
  if (!mon) return false;
  const stage = evolveStage(mon);
  if (stage >= EVOLVE_LEVELS.length) return false;
  // ランダム枠で外れた個体はもう進化できない(2026-07-11 FB: 一発勝負)
  if ((mon.evoFailed ?? []).includes(stage)) return false;
  return (mon.level ?? 1) >= EVOLVE_LEVELS[stage];
}

export function evolveCost(mon, isRandom = false) {
  const stars = RARITY_META[SPECIES[mon.speciesId]?.rarity]?.stars ?? 1;
  // 2026-07-29 FB: 基本10倍+第2進化はさらに10倍+レア度の追い傾斜(星ごとに×1.35)
  const base =
    stars *
    EVOLVE_GOLD_PER_STAR *
    Math.pow(EVOLVE_RARITY_SLOPE, stars - 1) *
    Math.pow(EVOLVE_STAGE_MULT, evolveStage(mon));
  // ランダム枠は4倍(2026-07-28 FB)。外れ25%込みの「賭け金」なので重くする
  return Math.round((isRandom ? base * EVOLVE_RANDOM_MULT : base) / 1000) * 1000;
}

// ---- 進化石(2026-07-28 FB) ----
// ---- 進化石のレア度(2026-07-29 Haru指示で**固定制**) ----
// ロール石=イモータル / ランダム石=アルカナ(data.js の EVO_STONE_RARITY)。
// 同日の初版は「ドロップごとに抽選」だったが、指示で固定に変更。レア度は種類の
// 格付けなので入れ物には持たせず、保存形は元の数値カウンタのまま。
// 初版の途中形({rarity: n})を持つセーブはロード時に合計へ畳む
export function normalizeEvoStones(state) {
  state.evoStones = state.evoStones ?? {};
  for (const kind of [...EVO_STONE_ROLES, "random"]) {
    const v = state.evoStones[kind];
    if (v && typeof v === "object") {
      state.evoStones[kind] = Object.values(v).reduce((n, c) => n + (c ?? 0), 0);
    } else if (typeof v !== "number") {
      state.evoStones[kind] = 0;
    }
  }
  return state.evoStones;
}

export function evoStoneRarityOf(kind) {
  return EVO_STONE_RARITY[kind] ?? "immortal";
}

export function evoStoneCount(state, kind) {
  const v = state.evoStones?.[kind];
  if (typeof v === "number") return v;
  if (v && typeof v === "object") return Object.values(v).reduce((n, c) => n + (c ?? 0), 0);
  return 0;
}

// 1個消費。戻り値はその石のレア度(種類ごとに固定)
export function consumeEvoStone(state, kind) {
  normalizeEvoStones(state);
  if ((state.evoStones[kind] ?? 0) <= 0) return null;
  state.evoStones[kind] -= 1;
  return evoStoneRarityOf(kind);
}

export function addEvoStone(state, kind, n = 1) {
  normalizeEvoStones(state);
  state.evoStones[kind] = (state.evoStones[kind] ?? 0) + n;
  return state.evoStones[kind];
}

// ---- 進化石を倉庫へ預ける(2026-08-05 Haru指示「進化石も倉庫に右クリックで入るように」)----
// 保存形は持ち物と同じ「種類→個数」のカウンタを別の入れ物(evoStonesStored)で持つ。
// **倉庫にあるぶんは使えない**(鍵/水晶と同じ規則)ので、進化で消費する側の
// evoStones は一切触らない = 既存の消費・判定コードに手を入れなくて済む
export function normalizeEvoStonesStored(state) {
  state.evoStonesStored = state.evoStonesStored ?? {};
  for (const kind of [...EVO_STONE_ROLES, "random"]) {
    if (typeof state.evoStonesStored[kind] !== "number") state.evoStonesStored[kind] = 0;
  }
  return state.evoStonesStored;
}
export function evoStoneStoredCount(state, kind) {
  const v = state.evoStonesStored?.[kind];
  return typeof v === "number" ? v : 0;
}
export function storedEvoStoneCount(state) {
  return [...EVO_STONE_ROLES, "random"].reduce((n, k) => n + evoStoneStoredCount(state, k), 0);
}
export function moveEvoStoneToStorage(state, kind, n = 1) {
  normalizeEvoStones(state);
  normalizeEvoStonesStored(state);
  if ((state.evoStones[kind] ?? 0) < n) return { error: "その進化石を 持っていない" };
  if (storageUsed(state) + n > storageCapOf(state)) return { error: "倉庫が満杯" };
  state.evoStones[kind] -= n;
  state.evoStonesStored[kind] += n;
  return { kind, n };
}
export function moveEvoStoneToInventory(state, kind, n = 1) {
  normalizeEvoStones(state);
  normalizeEvoStonesStored(state);
  if ((state.evoStonesStored[kind] ?? 0) < n) return { error: "その進化石は 倉庫にない" };
  state.evoStonesStored[kind] -= n;
  state.evoStones[kind] = (state.evoStones[kind] ?? 0) + n;
  return { kind, n };
}

// ---- 進化石の合成(2026-08-05 Haru指示「アイテム合成の中に進化石の合成も作って。
// 任意のジョブの進化石にするのは3つ必要、ランダム石にするのは5つ必要」) ----
// 「タンクの石ばかり出て欲しいアタッカーの石が出ない」を自力で解消できる救済窓口。
// 素材は**ロール石のみ**(nuke/guard/heal/buff)。ランダム石を素材から除外するのは、
// ランダム石を溶かして別の石を量産するループを防ぐため(激レアドロップの価値を保つ)。
// ランダム石はどのジョブにも使えてレア度もアルカナ格上(EVO_STONE_RARITY参照)なので、
// 交換コストもロール指定より高い(5個 > 3個)
export const EVO_STONE_CRAFT_COST = Object.freeze({ role: 3, random: 5 });
// srcCounts: {nuke?,guard?,heal?,buff?} 消費する内訳(合計がコストと一致すること)。
// destRole は mode==="role" のときだけ使う変換先ジョブ
export function craftEvoStone(state, mode, srcCounts, destRole) {
  normalizeEvoStones(state);
  const need = mode === "random" ? EVO_STONE_CRAFT_COST.random : EVO_STONE_CRAFT_COST.role;
  if (mode === "role" && !EVO_STONE_ROLES.includes(destRole)) {
    return { error: "変換先のジョブを 選ぶ" };
  }
  let total = 0;
  for (const k of EVO_STONE_ROLES) {
    const n = srcCounts?.[k] ?? 0;
    if (n < 0 || !Number.isInteger(n)) return { error: "個数が不正" };
    if (n > (state.evoStones[k] ?? 0)) return { error: `${EVO_STONES[k].label}が 足りない` };
    total += n;
  }
  if (total !== need) return { error: `素材は 合計${need}個 選ぶ` };
  for (const k of EVO_STONE_ROLES) {
    const n = srcCounts?.[k] ?? 0;
    if (n > 0) state.evoStones[k] -= n;
  }
  const outKind = mode === "random" ? "random" : destRole;
  addEvoStone(state, outKind, 1);
  return { kind: outKind, consumed: { ...srcCounts } };
}

// 出品できる石のレア度(2026-07-29 Haru指示「レジェ以上に」)。
// 装備の出品ゲート(MARKET_MIN_RARITY)と同じ理由: レジェ未満はBotの燃料になる量が出る
export const EVO_STONE_MARKET_MIN = "legend";
export function evoStoneListable(rarity) {
  return RARITY_ORDER.indexOf(rarity) >= RARITY_ORDER.indexOf(EVO_STONE_MARKET_MIN);
}

// 進化先の候補=毎回2つ。[同系統の上位職, ランダム枠]。
// ランダム枠は個体×進化段の決定的ハッシュ(リセマラ不可):
//   第1進化: 91%=別系統のtier2 / 8%=レア職(tier3) / 1%=隠し職(tier4)
//   第2進化: 98%=別系統のtier3 / 2%=隠し職(tier4)
export function evolveOptions(mon) {
  if (!canEvolve(mon)) return [];
  const stage = evolveStage(mon); // 0 or 1
  const targetTier = stage + 2;
  const lineage = stage === 0 ? baseJobRole(mon) : JOBS[mon.job].role;
  const same = Object.values(JOBS).find((j) => j.tier === targetTier && j.role === lineage);
  const h = perkHash(`evojob:${mon.id}:${stage}`);
  const roll = (h % 10000) / 10000;
  const pick = (pool) => pool[h % pool.length];
  let random;
  if (stage === 0) {
    if (roll < HIDDEN_JOB_CHANCE) {
      random = pick(Object.values(JOBS).filter((j) => j.tier === 4));
    } else if (roll < HIDDEN_JOB_CHANCE + RARE_JOB_CHANCE) {
      // レア職=固有職(サムライ等)。tier3の先取りではない(2026-07-11)
      random = pick(Object.values(JOBS).filter((j) => j.rare));
    } else if (roll < HIDDEN_JOB_CHANCE + RARE_JOB_CHANCE + SKIP_JOB_CHANCE) {
      // 飛び級: 第2進化を待たずいきなり最上位職(tier3)へ(ランダム枠に賭ける理由)
      random = pick(Object.values(JOBS).filter((j) => j.tier === 3));
    } else {
      random = pick(Object.values(JOBS).filter((j) => j.tier === 2 && !j.rare && j.role !== lineage));
    }
  } else {
    if (roll < HIDDEN_JOB_CHANCE * 2) {
      random = pick(Object.values(JOBS).filter((j) => j.tier === 4));
    } else {
      random = pick(Object.values(JOBS).filter((j) => j.tier === 3 && j.role !== lineage));
    }
  }
  // 撮影用(--tbm-dev 限定): ランダム枠を隠し職に固定する。抽選は個体IDの
  // 決定的ハッシュ(1%)なので、これ無しでは「隠し職が出る瞬間」を狙って撮れない
  if (isDevAllowed() && devFlags.forceHiddenEvo) {
    random = pick(Object.values(JOBS).filter((j) => j.tier === 4));
  }
  return [same.id, random.id];
}

// 進化後の「姿」(2026-07-11 FB「色が変わるだけじゃなく形も変わる・上位レアのモンスターに」):
// 進化段に応じて上位レア度の種族から、進化先ジョブと同じロールの種族を決定的に選ぶ
// (perkHash=個体×段×ジョブで固定・リセマラ不可)。見た目だけ変わり、種族・ステは本人のまま。
export function evoSkinFor(mon, jobId, stage) {
  const jobRole = JOBS[jobId]?.role ?? "nuke";
  const ownIdx = RARITY_ORDER.indexOf(SPECIES[mon.speciesId]?.rarity);
  if (ownIdx < 0) return null;
  const roleOfSp = (sp) => SKILLS[sp.skillId]?.active?.type ?? "nuke";
  const all = Object.values(SPECIES);
  // 見た目のレア度は現在の姿から絶対に下げない(2026-07-21 FB「進化前よりレアリティ低い
  // 見た目になるのやめて」: 極みの隠し職転職が段2固定で選び直し、第3進化の姿(自分+3)
  // から格落ちすることがあった)。現在の姿のレア度をフロアにする
  const curSkinIdx = mon.evoSkin ? RARITY_ORDER.indexOf(SPECIES[mon.evoSkin]?.rarity) : -1;
  const floorIdx = Math.max(ownIdx + 1, curSkinIdx);
  // 目標=自分のレア度+進化段(足りなければ1段ずつ下げるが、フロアより下は見ない)
  const top = Math.max(Math.min(ownIdx + stage, RARITY_ORDER.length - 1), floorIdx);
  // 候補プールの作り方(2026-08-05 #157「全コズミックがセラフドレイク化する」の根治):
  //   種族数はレア度が上がるほど少ない階段配分(CLAUDE.md)。上位レア度では
  //   「role一致」で絞ると候補が**1種**しか残らず、そのレア度の個体が全員
  //   同じ姿に収束していた(コズミック→セラフドレイク)。
  //   候補が2種未満になったらrole条件を外し、それでも足りなければ同レア度の
  //   別種まで広げる=**個体ごと・進化段ごとに別の姿**を保証する。
  //   同レア度は「格落ち」ではない(自分と同格)ので、見た目のレア度を下げない
  //   ルール(2026-07-21 FB)とも矛盾しない
  const atRank = (r, roleOnly) => {
    const rar = RARITY_ORDER[r];
    return all.filter(
      (sp) => sp.rarity === rar && sp.id !== mon.speciesId && (!roleOnly || roleOfSp(sp) === jobRole),
    );
  };
  const poolAt = (r) => {
    // 基本は role 一致。**候補が1種以下**なら条件を緩めて散らす:
    //   ①同レア度のrole不問 → ②自分と同格(ownIdx)の別種まで合流
    // 上位レア度は種族数が最少(階段配分)なので、緩めないと全員が同じ姿に収束する
    let cands = atRank(r, true);
    if (cands.length < 2) cands = atRank(r, false);
    if (cands.length < 2 && r > ownIdx) {
      // 同格の別種は「格落ち」ではない(自分と同じレア度)ので合流させてよい
      cands = [...cands, ...atRank(ownIdx, false)];
    }
    return cands;
  };
  const pick = (cands) => {
    if (cands.length === 0) return null;
    const sorted = [...cands].sort((a, b) => (a.id < b.id ? -1 : 1)); // 定義順に依存しない決定的順序
    // 個体ごとのハッシュ + **進化段のオフセット**で選ぶ。
    // 段でインデックスを1つずらす=1段目と2段目は必ず別キャラ(候補が2種以上あれば)。
    // mon.evoSkin(今の姿)を見て除外する方式は「同じ入力なら同じ結果」を壊すので採らない
    const base = perkHash(`evoskin:${mon.id}:${jobId}`);
    return sorted[(base + Math.max(0, stage - 1)) % sorted.length].id;
  };
  for (let r = top; r >= floorIdx && r > ownIdx; r--) {
    const got = pick(poolAt(r));
    if (got) return got;
  }
  // 最上位レア度の個体(上に空きが無い)は、同レア度の別種を姿にする
  const sameRank = pick(atRank(ownIdx, false));
  if (sameRank) return sameRank;
  // それでも候補が無い(その種族しかいないレア度)→今の姿を保つ。
  // 姿が無ければ呼び出し側が色相+スケールで代替する
  return mon.evoSkin ?? null;
}

export function evolveMonster(state, monsterId, jobId, rng = Math.random) {
  const mon = state.monsters[monsterId];
  if (!mon) return { error: "タスモンが いない" };
  const stage = evolveStage(mon);
  if (stage >= EVOLVE_LEVELS.length) return { error: "もう最終進化している" };
  if ((mon.level ?? 1) < EVOLVE_LEVELS[stage])
    return { error: `第${stage + 1}進化は Lv${EVOLVE_LEVELS[stage]}から` };
  if (onExpedition(state, monsterId)) return { error: "探索中の子は 進化できない" };
  const opts = evolveOptions(mon);
  if (!opts.includes(jobId)) return { error: "そのジョブには 進化できない" };
  // ランダム枠かどうかで費用と必要な石が変わる(2026-07-28 FB)
  const isRandom = jobId === opts[1] && jobId !== opts[0];
  const stoneKind = isRandom ? "random" : (JOBS[jobId].role ?? "nuke");
  const cost = evolveCost(mon, isRandom);
  if (state.gold < cost) return { error: `ゴールドが足りない(${formatCost(cost)}G 必要)` };
  if (evoStoneCount(state, stoneKind) <= 0) {
    return {
      error: isRandom
        ? "ランダム進化石が 必要(激レアドロップ・幕ボスでまれに)"
        : `${EVO_STONES[stoneKind].label}が 必要(戦闘・幕ボスでドロップ)`,
    };
  }
  state.gold -= cost;
  consumeEvoStone(state, stoneKind); // 石は結果に関わらず消える(賭け金の一部)。低いレア度から
  // ランダム枠(2択目)は外れあり(2026-07-11 FB): 進化せず費用が消え、
  // その進化段のランダム枠は封印される(再挑戦不可)。同系統はいつでも選べる
  if (isRandom && rng() < EVOLVE_FAIL_CHANCE) {
    mon.evoFailed = [...(mon.evoFailed ?? []), stage];
    return { failed: true, cost, stoneKind };
  }
  const roleBefore = jobRoleOf(mon);
  // 転職で入れなくなる旧ジョブ島の解放を返金(2026-07-16 FB「レア職のスキルツリーがバグってる」)。
  // 以前は島に振ったポイントが転職後に見えない場所へ沈み、効果だけが幽霊のように残って
  // 「取得数と消費ポイントが合わない」壊れた見た目になっていた
  let islandRefund = 0;
  const oldIsland = (mon.sphere?.taken ?? []).filter((id) => {
    const n = SPHERE_NODES[id];
    return n?.jobLock && n.jobLock !== jobId;
  });
  if (oldIsland.length > 0) {
    const gone = new Set(oldIsland);
    mon.sphere.taken = mon.sphere.taken.filter((id) => !gone.has(id));
    mon.perks = (mon.perks ?? []).filter((p) => !gone.has(p.node));
    mon.perkSpent = Math.max(0, (mon.perkSpent ?? 0) - oldIsland.length);
    islandRefund = oldIsland.length;
  }
  mon.job = jobId;
  // ジョブチェンジ(ロール変更)で外すのは**ロール専用の装備だけ**(2026-07-28 FB修正)。
  // 以前は全部外していたが、ロール固有なのは武器・サブ武器(item.role持ち)だけで、
  // 防具・アクセまで巻き添えにしていた。「アクセが勝手に外れてる」の正体はこれ
  let unequipped = 0;
  if (jobRoleOf(mon) !== roleBefore && (mon.equipment ?? []).length > 0) {
    const newRole = jobRoleOf(mon);
    const mismatched = mon.equipment.filter((it) => it.role && it.role !== newRole);
    if (mismatched.length > 0) {
      const goneIds = new Set(mismatched.map((it) => it.id));
      mon.equipment = mon.equipment.filter((it) => !goneIds.has(it.id));
      state.items.push(...mismatched);
      unequipped = mismatched.length;
    }
  }
  // 姿の変身: 進化段に応じた上位レア種族の見た目になる(ジョブのロールに合わせて選定)
  mon.evoSkin = evoSkinFor(mon, jobId, stage + 1);
  // 図鑑に「進化後の姿」を記録する(2026-08-13 Haru指示「図鑑には進化をしたら
  // 進化前と進化後(第2進化したら第2進化も)の姿が見れるようにして」)。
  // 見た目は evoSkin と職の組み合わせで決まる=種族だけからは復元できないので、
  // **実際にその子がなった姿をそのまま**保存する(図鑑は「見た記録」なので、
  // 後からロジックを変えても当時の姿が残るこの持ち方が正しい)
  recordDexEvolution(state, mon.speciesId, stage + 1, mon.evoSkin, jobId);
  // レア職/隠し職は専用スキルを自動習得(節目を消費しない・このジョブでしか手に入らない)
  let jobSkill = null;
  const skillId = JOBS[jobId].skillId;
  if (skillId && SKILLS[skillId]) {
    mon.learnedSkills = mon.learnedSkills ?? [SPECIES[mon.speciesId].skillId];
    if (!mon.learnedSkills.includes(skillId)) {
      mon.learnedSkills.push(skillId);
      jobSkill = SKILLS[skillId];
    }
  }
  // ミッション「タスモンを進化させる」(2026-08-04 v4)。UI側でなくここで数える=
  // missions.test.mjs が本物の evolveMonster で false→true を証明できる
  bumpMissionCounter(state, "evolve");
  return { job: JOBS[jobId], cost, stage: stage + 1, jobSkill, unequipped, islandRefund, stoneKind };
}
function formatCost(n) {
  return n >= 10000 ? `${Math.round(n / 1000)}K` : String(n);
}

// ---- 極み(第3の節目 2026-07-11): 最上位職(tier3/4)がLv90で迎える最後の選択 ----
export function canPinnacle(mon) {
  return !!mon && evolveStage(mon) >= 2 && !mon.pinnacle && (mon.level ?? 1) >= PINNACLE_LEVEL;
}

export function pinnacleCost(mon) {
  const stars = RARITY_META[SPECIES[mon.speciesId]?.rarity]?.stars ?? 1;
  return stars * PINNACLE_GOLD_PER_STAR;
}

// choice: "solid"(確実にステ+15%/+15%) | "gamble"(高確率そのまま・まれに夢)
export function pinnacleEvolve(state, monsterId, choice, rng = Math.random) {
  const mon = state.monsters[monsterId];
  if (!mon) return { error: "タスモンが いない" };
  if (!canPinnacle(mon)) return { error: `極みは 最上位職のLv${PINNACLE_LEVEL}から(1回だけ)` };
  if (onExpedition(state, monsterId)) return { error: "探索中の子は 儀式できない" };
  const cost = pinnacleCost(mon);
  if (state.gold < cost) return { error: `ゴールドが足りない(${formatCost(cost)}G 必要)` };
  state.gold -= cost;
  if (choice === "solid") {
    mon.pinnacle = "solid";
    return { kind: "solid", cost };
  }
  mon.pinnacle = "gamble"; // 結果に関わらず節目は消費(1回だけの賭け)
  const r = rng();
  const g = PINNACLE_GAMBLE;
  if (r < g.hidden && (JOBS[mon.job]?.tier ?? 0) < 4) {
    // 同系統の隠し職へ転職(専用スキルも習得)
    const role = JOBS[mon.job]?.role ?? baseJobRole(mon);
    const pool = Object.values(JOBS).filter((j) => j.tier === 4);
    const j = pool.find((x) => x.role === role) ?? pool[0];
    mon.job = j.id;
    // 隠し職への転職で姿も選び直す。段は今の進化段のまま(旧: 2固定で第3進化から格落ちした)
    mon.evoSkin = evoSkinFor(mon, j.id, evolveStage(mon));
    if (j.skillId && SKILLS[j.skillId] && !mon.learnedSkills.includes(j.skillId)) {
      mon.learnedSkills.push(j.skillId);
    }
    return { kind: "hidden", job: j, cost };
  }
  if (r < g.hidden + g.awaken && (mon.awakening ?? 0) < AWAKEN_MAX) {
    // 6段化(2026-07-16): 極みの覚醒は bornStep(=2段)ぶん。旧+1段と同じ重み
    mon.awakening = Math.min(AWAKEN_MAX, (mon.awakening ?? 0) + AWAKENING.bornStep);
    const floor = AWAKENING.ivFloor[mon.awakening];
    mon.iv = mon.iv ?? { atk: 1, hp: 1 };
    for (const k of Object.keys(mon.iv)) {
      mon.iv[k] = Math.min(IV_MAX_BRED, Math.max(mon.iv[k], floor));
    }
    return { kind: "awaken", level: mon.awakening, cost };
  }
  if (r < g.hidden + g.awaken + g.shiny && !mon.shiny) {
    mon.shiny = true;
    if ((mon.awakening ?? 0) === 0) {
      mon.awakening = AWAKENING.bornStep; // 色違い=確定覚醒の原則(6段化で2段ぶん)
      const floor = AWAKENING.ivFloor[mon.awakening];
      mon.iv = mon.iv ?? { atk: 1, hp: 1 };
      for (const k of Object.keys(mon.iv)) {
        mon.iv[k] = Math.min(IV_MAX_BRED, Math.max(mon.iv[k], floor));
      }
    }
    return { kind: "shiny", cost };
  }
  return { kind: "none", cost };
}

// ---- 探索(遠征): 使っていない子を12時間の探索に出してレア宝+成長を持ち帰る ----
// (2026-07-10 FB「使ってないペットで12時間探索・レア宝・モンスター成長」)
// タイムスタンプ制なのでゲームを閉じていても進む。探索中の子はパーティ/調合/儀式に使えない。
export const EXPEDITION_MAX_MONS = 3; // 基本の探索枠(旧定数。上限はexpeditionCapOfで拡張可)
// 探索枠の拡張(2026-07-13 FB): ゴールド課金で増やせる。とんでもない額の最終ゴールドシンク。
// 500万→5000万→5億→50億→500億(5段で最大8枠)
export const EXPEDITION_SLOT_MAX = 8;

// ---- 交易船(Steamマーケット出品UI 2026-07-13) ----
// 積み込んだ装備はインベントリ/倉庫から移動して保持。実際の出品はSteamworks連携後に有効化。
// 2026-07-17 FB「出品制限があるのに枠が9個あるけどいいの?」: 積み荷枠を出品レートの
// 最大枠(MARKET_SLOT_MAX=4)に揃えた。9枠は「積めるのに出せない」誤解のもとだった。
// ※MARKET_SLOT_MAXは下で定義(TDZ)のためリテラル。一致はテストが固定する
export const TRADE_SHIP_CAP = 4;

// ---- 出品レート制限(2026-07-16確定: 進行度ラダー × 12時間窓) ----
// トークン方式: 「12時間以内の出品回数」を数える。同時出品数では絶対に数えない
// (売れ残りが枠を永久占拠して出品不能になる詰みバグの温床になるため)。
// 枠は難易度クリアで増える: 初期1 → ノーマル2 → ナイトメア3 → ヘル4(max)。
// 新規アカウント(=Botの姿)が最もきつく、正規プレイヤーは序盤レジェンドを売らずに
// 装備するので制限に気づかないまま卒業する。12時間はTBHの8時間と違い
// 朝夜2回のログインで満枠を使い切れる(真夜中に起きる人が得をしない)。
// ヘル到達(実測16.7日+難所2箇所)後は 8個/日 ≈ 4h/日プレイの産出量で、ほぼ無制限。
export const MARKET_LIST_WINDOW_MS = 12 * 60 * 60 * 1000;
export const MARKET_SLOT_BASE = 1;
export const MARKET_SLOT_MAX = 4;
export function marketSlotsOf(state) {
  let slots = MARKET_SLOT_BASE;
  for (let d = 0; d < DIFFICULTIES.length && slots < MARKET_SLOT_MAX; d++) {
    if ((state?.bossClearedD?.[d] ?? 0) >= STAGES_PER_DIFFICULTY) slots++;
  }
  return slots;
}
// 窓内のトークンを整理して現況を返す。呼ぶだけで期限切れが消える(唯一の掃除口)
export function tradeTokenState(state, now = Date.now()) {
  state.tradeListAt = (Array.isArray(state.tradeListAt) ? state.tradeListAt : [])
    .filter((t) => Number.isFinite(t))
    .map((t) => Math.min(t, now)) // 未来時刻は現在に丸める(時計戻しで枠が湧かない)
    .filter((t) => now - t < MARKET_LIST_WINDOW_MS);
  const slots = marketSlotsOf(state);
  const used = state.tradeListAt.length;
  const nextFreeMs = used > 0 ? Math.max(0, MARKET_LIST_WINDOW_MS - (now - Math.min(...state.tradeListAt))) : 0;
  return { slots, used, left: Math.max(0, slots - used), nextFreeMs };
}
function fmtListWait(ms) {
  const m = Math.max(1, Math.ceil(ms / 60000));
  return m >= 60 ? `${Math.floor(m / 60)}時間${m % 60}分` : `${m}分`;
}
// 積み荷の使用数(装備+タスモン合算 2026-07-17 FB「装備とタスモン合わせてmax4枠。
// 最初から4つでなく順番に」: 枠数は出品枠ラダー(1→2→3→4)と同じ進行で解放)
export function tradeCargoCount(state) {
  return (state.tradeShip?.length ?? 0) + (state.tradeShipMons?.length ?? 0) +
    (state.tradeShipPrecious?.length ?? 0);
}
export function loadTradeShip(state, itemId, now = Date.now()) {
  state.tradeShip = state.tradeShip ?? [];
  const cap = marketSlotsOf(state);
  if (tradeCargoCount(state) >= cap)
    return {
      error:
        `積み荷は 装備とタスモン合わせて${cap}枠まで` +
        (cap < MARKET_SLOT_MAX ? "(難易度クリアで枠が増える)" : ""),
    };
  let idx = state.items.findIndex((it) => it.id === itemId);
  let from = "items";
  if (idx === -1) {
    idx = state.storage.findIndex((it) => it.id === itemId);
    from = "storage";
  }
  if (idx === -1) return { error: "その装備は 持っていない(装備中のものは積めない)" };
  // 出品ゲート(2026-07-15): 低レア(全ドロップの92%)はBotの燃料なので積めない。
  // 交易船=出品の唯一の入口なので、ここで止めれば全経路が塞がる
  const gate = marketListable(state[from][idx]);
  if (!gate.ok) return { error: gate.reason };
  // レート制限はレア度ゲートの後(先に「そもそも出品できない」を言う方が親切)
  const tok = tradeTokenState(state, now);
  if (tok.left <= 0) {
    return {
      error: `出品枠(${tok.slots}枠/12時間)を使い切った。あと${fmtListWait(tok.nextFreeMs)}で1枠戻る`,
    };
  }
  const [item] = state[from].splice(idx, 1);
  state.tradeShip.push(item);
  state.tradeListAt.push(now);
  return { item };
}
export function unloadTradeShip(state, itemId) {
  state.tradeShip = state.tradeShip ?? [];
  const idx = state.tradeShip.findIndex((it) => it.id === itemId);
  if (idx === -1) return { error: "その積み荷は ない" };
  const [item] = state.tradeShip.splice(idx, 1);
  state.items.push(item);
  // テスト版では積み込み=出品予約なので、降ろしたら一番新しいトークンを返す
  // (積み間違いの入れ替えで枠を食わない)。Steam連携後は実出品時の消費に移す
  if (state.tradeListAt?.length) state.tradeListAt.pop();
  return { item };
}

// ---- タスモンの出品(2026-07-16) ----
// モンスターは装備の1/38の量(6.9体/日)しか出ないため、装備の「レジェンド以上」ゲートは
// 掛けずに全レア度を出品可にできる(Bot燃料にならない量)。かわりに:
//   ・**覚醒した子は出品不可**。覚醒6は市場で集約されると正規の46万倍の速さで量産される
//     (Bot 1万アカウントの卵が1本のパイプラインに化ける)ため、覚醒の出口は
//     「武具に宿す」(モンスターが消える=シンク・出力は装備ゲートが効く)に一本化する。
//     色違いは生まれつき覚醒2段なので自動的に出品不可になる
//   ・**装備は必ず外して返す**。装備を積んだまま売れると、装備の出品ゲートと
//     レート制限を同時にバイパスできてしまう
//   ・出品枠(4枠/12時間)は装備と共通のトークンを消費する
export const TRADE_SHIP_MON_CAP = 3;
export function monsterListable(state, monId) {
  const mon = state.monsters[monId];
  if (!mon) return { ok: false, reason: "その子が いない" };
  // 試用期間中の種族は出品不可(2026-07-22 試用システム)。装備と同じ理由:
  // 不採用で消え得るものを市場に流すと「既存種は削除不可」ルールに巻き込まれる
  {
    const trialBlock = trialListBlockReason(mon.trialId ?? SPECIES[mon.speciesId]?.trialId);
    if (trialBlock) return { ok: false, reason: trialBlock };
  }
  if ((mon.awakening ?? 0) > 0)
    return { ok: false, reason: "覚醒した子は 旅立たせられない(想いは「武具に宿す」で1点ものになる)" };
  if (state.party.includes(monId)) return { ok: false, reason: "パーティの子は 積めない(外してから)" };
  if (onExpedition(state, monId)) return { ok: false, reason: "探索中の子は 積めない" };
  if (Object.keys(state.monsters).length <= 1)
    return { ok: false, reason: "最後の1体は 旅立たせられない" };
  return { ok: true };
}
export function loadTradeShipMonster(state, monId, now = Date.now()) {
  state.tradeShipMons = state.tradeShipMons ?? [];
  // 装備と合算のラダー枠(2026-07-17 FB)。タスモン単独の上限は廃止
  const cap = marketSlotsOf(state);
  if (tradeCargoCount(state) >= cap)
    return {
      error:
        `積み荷は 装備とタスモン合わせて${cap}枠まで` +
        (cap < MARKET_SLOT_MAX ? "(難易度クリアで枠が増える)" : ""),
    };
  const gate = monsterListable(state, monId);
  if (!gate.ok) return { error: gate.reason };
  const tok = tradeTokenState(state, now);
  if (tok.left <= 0) {
    return {
      error: `出品枠(${tok.slots}枠/12時間)を使い切った。あと${fmtListWait(tok.nextFreeMs)}で1枠戻る`,
    };
  }
  const mon = state.monsters[monId];
  // 装備は必ず外してインベントリへ(ゲート/レート制限のバイパス防止)
  const unequipped = (mon.equipment ?? []).length;
  state.items.push(...(mon.equipment ?? []));
  mon.equipment = [];
  delete state.monsters[monId];
  state.tradeShipMons.push(mon);
  state.tradeListAt.push(now);
  return { mon, unequipped };
}
// ---- 鍵/水晶の出品(2026-07-20 FB) ----
// 1点ものアイテム化(2026-07-13)の布石を回収: レア度を持たせて交易船に積めるようにする。
// 鍵=難易度で段階(レジェンド→ビヨンド)、叡智の水晶=アルカナ。どれも出品ゲートを満たす
export function keyRarityOf(difficulty) {
  return ["legend", "immortal", "arcana", "beyond"][difficulty] ?? "legend";
}
export const CRYSTAL_RARITY = "arcana";
export function preciousRarityOf(p) {
  if (p.stone) return p.rarity ?? "legend"; // 進化石(2026-07-29 レア度化)
  return p.difficulty !== undefined ? keyRarityOf(p.difficulty) : CRYSTAL_RARITY;
}
// 想定相場(表示用)。鍵は難易度で跳ね、水晶は振り直し価値ぶん高め。
// 進化石はレア度で跳ねる(レジェンド未満は出品ゲートで弾かれるので値を持たない)
const STONE_ESTIMATE = { legend: 400_000, immortal: 1_800_000, arcana: 8_000_000 };
export function preciousMarketEstimate(p) {
  if (p.stone) return STONE_ESTIMATE[p.rarity] ?? STONE_ESTIMATE.legend;
  if (p.difficulty !== undefined) return [80_000, 300_000, 1_200_000, 5_000_000][p.difficulty] ?? 80_000;
  return 2_000_000;
}
function findPreciousInInventory(state, id) {
  for (const pool of [state.keyItems ?? [], state.crystalItems ?? []]) {
    const idx = pool.findIndex((k) => k.id === id && !k.stored);
    if (idx >= 0) return { pool, idx };
  }
  return null;
}
export function loadTradeShipPrecious(state, id, now = Date.now()) {
  state.tradeShipPrecious = state.tradeShipPrecious ?? [];
  const cap = marketSlotsOf(state);
  if (tradeCargoCount(state) >= cap)
    return {
      error:
        `積み荷は 装備とタスモン合わせて${cap}枠まで` +
        (cap < MARKET_SLOT_MAX ? "(難易度クリアで枠が増える)" : ""),
    };
  const found = findPreciousInInventory(state, id);
  if (!found) return { error: "その貴重品は 持ち物にない(倉庫の物は引き出してから)" };
  const tok = tradeTokenState(state, now);
  if (tok.left <= 0) {
    return {
      error: `出品枠(${tok.slots}枠/12時間)を使い切った。あと${fmtListWait(tok.nextFreeMs)}で1枠戻る`,
    };
  }
  const [p] = found.pool.splice(found.idx, 1);
  state.tradeShipPrecious.push(p);
  state.tradeListAt.push(now);
  return { precious: p };
}
export function unloadTradeShipPrecious(state, id) {
  state.tradeShipPrecious = state.tradeShipPrecious ?? [];
  const idx = state.tradeShipPrecious.findIndex((k) => k.id === id);
  if (idx === -1) return { error: "その積み荷は ない" };
  const [p] = state.tradeShipPrecious.splice(idx, 1);
  if (p.stone) addEvoStone(state, p.stone, 1); // 石は所持数へ戻す(レア度は種類から決まる)
  else (p.difficulty !== undefined ? (state.keyItems = state.keyItems ?? []) : (state.crystalItems = state.crystalItems ?? [])).push(p);
  if (state.tradeListAt?.length) state.tradeListAt.pop();
  return { precious: p };
}

// 進化石を積む(2026-07-29 Haru指示「マーケットに出せるようにレジェ以上に」)。
// 石はカウンタ所持なので、積むとき1個ぶんを実体(インスタンス)に起こして
// 貴重品の積み荷プールに入れる。降ろすとカウンタへ戻る。
// ゲートは鍵/水晶と同じ(枠・12時間トークン)+レア度(レジェンド以上)
let nextStoneCargoId = 1;
export function loadTradeShipStone(state, kind, now = Date.now()) {
  state.tradeShipPrecious = state.tradeShipPrecious ?? [];
  if (!EVO_STONES[kind]) return { error: "その進化石は ない" };
  const rarity = evoStoneRarityOf(kind); // 固定(イモータル/アルカナ)=常にレジェ以上
  if (!evoStoneListable(rarity)) {
    return { error: `出品できる進化石は ${RARITY_META[EVO_STONE_MARKET_MIN].label}以上` };
  }
  normalizeEvoStones(state);
  if ((state.evoStones[kind] ?? 0) <= 0) return { error: "その進化石を 持っていない" };
  const cap = marketSlotsOf(state);
  if (tradeCargoCount(state) >= cap)
    return {
      error:
        `積み荷は 装備とタスモン合わせて${cap}枠まで` +
        (cap < MARKET_SLOT_MAX ? "(難易度クリアで枠が増える)" : ""),
    };
  const tok = tradeTokenState(state, now);
  if (tok.left <= 0) {
    return {
      error: `出品枠(${tok.slots}枠/12時間)を使い切った。あと${fmtListWait(tok.nextFreeMs)}で1枠戻る`,
    };
  }
  state.evoStones[kind] -= 1;
  const p = { id: `stone_${now}_${nextStoneCargoId++}`, stone: kind, rarity };
  state.tradeShipPrecious.push(p);
  state.tradeListAt.push(now);
  return { precious: p };
}

export function unloadTradeShipMonster(state, monId) {
  state.tradeShipMons = state.tradeShipMons ?? [];
  const idx = state.tradeShipMons.findIndex((m) => m.id === monId);
  if (idx === -1) return { error: "その積み荷は ない" };
  const [mon] = state.tradeShipMons.splice(idx, 1);
  state.monsters[mon.id] = mon;
  if (state.tradeListAt?.length) state.tradeListAt.pop();
  return { mon };
}
export function expeditionCapOf(state) {
  return Math.min(EXPEDITION_SLOT_MAX, state?.expedCap ?? EXPEDITION_MAX_MONS);
}
export function expedSlotCost(state) {
  const bought = Math.max(0, expeditionCapOf(state) - EXPEDITION_MAX_MONS);
  return Math.round(5_000_000 * Math.pow(10, bought));
}
export function buyExpedSlot(state) {
  if (expeditionCapOf(state) >= EXPEDITION_SLOT_MAX) return { error: "探索枠は これが 最大" };
  const cost = expedSlotCost(state);
  if (state.gold < cost) return { error: `${cost.toLocaleString("en-US")} GP 足りない` };
  state.gold -= cost;
  state.expedCap = expeditionCapOf(state) + 1;
  return { cap: state.expedCap, cost };
}
// 探索時間の選択肢(2026-07-11 FB「3時間、6時間、12時間と選べるように」)。
// 長いほど1時間あたりの効率も少し良い(放置の重みに報いる)
export const EXPEDITION_HOURS = [3, 6, 12];
export const EXPEDITION_PLANS = Object.freeze({
  3: { expMult: 0.28, stageBonus: 0, eggChance: 0.08 },
  6: { expMult: 0.58, stageBonus: 8, eggChance: 0.14 },
  12: { expMult: 1.2, stageBonus: 20, eggChance: 0.25 },
});
// 送った子の星合計が実効ステージに上乗せされ、宝のレア度テーブルが上振れる
export const EXPEDITION_STAR_STAGE_BONUS = 2;
// 探索EXP: 「オフライン周回×12時間分」より少し得なくらいの大きな塊(12時間換算の基準値)
export const EXPEDITION_EXP_KILLS = 750;

// ---- 探索は「3体1組のパーティ」を複数同時に出せる(2026-08-13 Haru指示) ----
// 「難易度クリアで+1パーティ」の本来の意図は**もう1組(3体)を別口で出せる**こと。
// それまでの実装は1隊のメンバー上限が3→6→…と増えるだけ(=人数が増えるだけ)で、
// 「3体1組」という単位が壊れていた。expedCap(枠数)の経済はそのまま生かし、
// 3枠=1パーティとして読み替える(基本3枠=1組 / 難易度クリア+3枠=ちょうど+1組 /
// ゴールド購入・パス報酬の+1枠は次の組の枠を部分的に開ける)
export const EXPEDITION_PARTY_SIZE = 3;
export function expeditionPartyCount(state) {
  return Math.max(1, Math.ceil(expeditionCapOf(state) / EXPEDITION_PARTY_SIZE));
}
// 出発中の全パーティ(旧セーブの単数形 state.expedition は deserialize が配列へ移行)
export function expeditionsOf(state) {
  return Array.isArray(state.expeditions) ? state.expeditions : [];
}

export function onExpedition(state, monId) {
  return expeditionsOf(state).some((ex) => ex?.monIds?.includes(monId));
}

// 出発中パーティごとの進行情報(indexは受け取り(claimExpedition)にそのまま渡す)
export function expeditionInfos(state, now = Date.now()) {
  return expeditionsOf(state).map((ex, index) => {
    const hours = EXPEDITION_HOURS.includes(ex.hours) ? ex.hours : 12; // 旧セーブ=12時間
    const remain = Math.max(0, ex.startedAt + hours * 3600000 - now);
    return { index, monIds: ex.monIds, startedAt: ex.startedAt, hours, remain, done: remain <= 0 };
  });
}

// 今週の探索先(隔週アップデートで増える探索コンテンツ)。週替わりローテーション。
// bonus = { itemStage(0..15), expMult(0..0.3), eggChance(0..0.15) } を見込みに上乗せ
export function activeExpeditionSpot(now = Date.now()) {
  if (!EXPEDITION_SPOTS_PACK.length) return null;
  const week = Math.floor(now / (7 * 86400000));
  return EXPEDITION_SPOTS_PACK[week % EXPEDITION_SPOTS_PACK.length];
}
const clampB = (v, lo, hi) => (typeof v === "number" && isFinite(v) ? Math.min(hi, Math.max(lo, v)) : 0);

// 選抜メンバーと時間から報酬の見込みを計算する(出発前プレビューと受け取りで共用)。
// レア(星)と育成(レベル)が高い子ほど宝のレア度テーブルが上振れ、EXPも増える(2026-07-11 FB)
export function expeditionOutlook(state, monIds, hours, now = Date.now()) {
  const plan = EXPEDITION_PLANS[hours] ?? EXPEDITION_PLANS[12];
  const mons = monIds.map((id) => state.monsters[id]).filter(Boolean);
  const starSum = mons.reduce(
    (s, m) => s + (RARITY_META[SPECIES[m.speciesId]?.rarity]?.stars ?? 1),
    0,
  );
  const lvSum = mons.reduce((s, m) => s + (m.level ?? 1), 0);
  const eff = effectiveStage(state);
  const spot = activeExpeditionSpot(now);
  const b = spot?.bonus ?? {};
  // 上振れは実効+60まで(2026-07-21 FB「Lv65でアルカナ3つ」対策: 高星・高Lvの
  // 積み上げで2難易度先のテーブルを回れると、アルカナのステージランプが素通しになる)
  const itemStageBonus = Math.min(
    60,
    plan.stageBonus + starSum * EXPEDITION_STAR_STAGE_BONUS + Math.floor(lvSum / 20) +
      Math.round(clampB(b.itemStage, 0, 15)),
  );
  const itemStage = eff + itemStageBonus;
  const expGain = Math.round(
    expReward(eff) * EXPEDITION_EXP_KILLS * plan.expMult * (1 + starSum * 0.04) *
      (1 + clampB(b.expMult, 0, 0.3)),
  );
  const eggChance = Math.min(0.5, plan.eggChance + clampB(b.eggChance, 0, 0.15));
  // 装備の個数は時間に比例(2026-07-21 FB「時間長いやつは装備も同じだけ多く」):
  // 3時間=1個 / 6時間=2個 / 12時間=4個(時間÷3)
  const itemCount = Math.max(1, Math.round(hours / 3));
  return { plan, starSum, lvSum, itemStage, expGain, eggChance, spot, itemCount };
}

// 今日のデイリーボス変種(隔週アップデートで増える)。日替わりローテーション。
// 無ければ null(=従来の×10/×2.5ボス)
export function dailyBossVariant(now = Date.now()) {
  if (!DAILY_BOSSES_PACK.length) return null;
  const day = Math.floor(now / 86400000);
  const v = DAILY_BOSSES_PACK[day % DAILY_BOSSES_PACK.length];
  return {
    id: v.id,
    name: String(v.name ?? "デイリーボス").slice(0, 12),
    element: v.element ?? null,
    hpMult: clampB(v.hpMult, 6, 14) || 10,
    atkMult: clampB(v.atkMult, 1.8, 3.2) || 2.5,
  };
}

export function startExpedition(state, monIds, hours = 12, now = Date.now()) {
  if (!EXPEDITION_HOURS.includes(hours)) return { error: "探索時間は 3/6/12時間から選んで" };
  const ids = [...new Set(monIds)].filter((id) => state.monsters[id]);
  if (ids.length === 0) return { error: "探索に出す子を選んで" };
  // 1パーティ=3体1組(2026-08-13 Haru指示で固定。枠の総数ではなく組の単位で縛る)
  if (ids.length > EXPEDITION_PARTY_SIZE) return { error: `1パーティは ${EXPEDITION_PARTY_SIZE}体まで` };
  const flying = expeditionsOf(state);
  if (flying.length >= expeditionPartyCount(state))
    return { error: `探索パーティは ${expeditionPartyCount(state)}組まで(帰還を待って)` };
  // 総枠(expedCap)も守る: 端数枠(+1枠購入)ぶんは最後の組が小さくなる
  const inFlight = flying.reduce((s, ex) => s + (ex.monIds?.length ?? 0), 0);
  if (inFlight + ids.length > expeditionCapOf(state))
    return { error: `探索枠が足りない(あと${Math.max(0, expeditionCapOf(state) - inFlight)}枠)` };
  if (ids.some((id) => state.party.includes(id))) return { error: "パーティ中の子は 探索に出せない" };
  if (ids.some((id) => onExpedition(state, id))) return { error: "もう探索に出ている子がいる" };
  state.expeditions = [...flying, { monIds: ids, startedAt: now, hours }];
  return { monIds: ids, hours };
}

// 個体に経験値を与える(パーティ外でも使う。レベルアップ処理込み)
function grantMonExp(mon, exp) {
  if (mon.level >= LEVEL_CAP) return 0;
  const before = mon.level;
  mon.exp = (mon.exp ?? 0) + exp;
  while (mon.level < LEVEL_CAP && mon.exp >= expToNext(mon.level)) {
    mon.exp -= expToNext(mon.level);
    mon.level += 1;
  }
  if (mon.level >= LEVEL_CAP) mon.exp = 0;
  return mon.level - before;
}

export function claimExpedition(state, index = 0, now = Date.now(), rng = Math.random) {
  const info = expeditionInfos(state, now)[index] ?? null;
  if (!info) return { error: "探索隊は 出ていない" };
  if (!info.done) return { error: "まだ探索中" };
  const mons = info.monIds.map((id) => state.monsters[id]).filter(Boolean);
  const outlook = expeditionOutlook(state, info.monIds, info.hours);
  const eff = effectiveStage(state);
  // ① レア宝: ボス箱テーブル(ウルトラ以上)を星合計+レベル+時間分上振れたステージで
  // 時間比例の個数(3h=1/6h=2/12h=4 2026-07-21 FB)
  const items = [];
  for (let i = 0; i < (outlook.itemCount ?? 1); i++) {
    const it = rollBossChestItem(outlook.itemStage, rng);
    if (state.items.length < invCapOf(state)) state.items.push(it);
    else state.storage.push(it); // 持ち物が満杯なら倉庫へ(消えない)
    items.push(it);
  }
  const item = items[0];
  // ② 成長: 送った子に大きなEXP(レベル上げの並行手段。時間と星でスケール)
  const expGain = outlook.expGain;
  const levels = mons.map((m) => ({ id: m.id, name: evolvedNameOf(m.speciesId, evolveStage(m)), levels: grantMonExp(m, expGain) }));
  // ③ お土産卵(スロットに空きがあれば確率で。長い探索ほど見つけやすい)
  let egg = null;
  if (rng() < outlook.eggChance && state.eggs.length < eggCapOf(state)) {
    egg = rollEggDrop(eff, rng, 1);
    if (egg) state.eggs.push(egg);
  }
  state.expeditions = expeditionsOf(state).filter((_, i) => i !== index);
  return { item, items, expGain, levels, egg, monIds: info.monIds, hours: info.hours };
}

// 追いつきブースト(2026-08-11 Haru指示「レベルの低い新しいキャラを入れづらい。
// パーティの最高レベル90%になるまでは経験値ブースト」): 新しく迎えた/温存していた
// 低レベルの子を編成に入れたとき、パーティの足を引っ張る期間を短くする。
// 対象はパーティ最高レベルの90%未満の子だけ(=先頭の子には掛からない=周回速度の
// 律速である「最高レベルの伸び」には影響しない=難易度番人・POWER_REGISTRYの対象外の
// 中立な仕組み。追い付いた瞬間(90%到達)に自動で外れる)
export const PARTY_CATCHUP_THRESHOLD = 0.9;
export const PARTY_CATCHUP_EXP_MULT = 2;
export function isCatchingUp(state, mon) {
  const members = partyMonsters(state);
  if (members.length < 2) return false;
  const maxLv = members.reduce((a, m) => Math.max(a, m.level), 1);
  return mon.level < maxLv * PARTY_CATCHUP_THRESHOLD;
}

// パーティ全員に経験値を与えてレベルアップ処理する(上限 LEVEL_CAP=100)。
function grantPartyExp(state, exp) {
  const members = partyMonsters(state);
  const maxLv = members.reduce((a, m) => Math.max(a, m.level), 1);
  for (const mon of members) {
    if (mon.level >= LEVEL_CAP) {
      mon.exp = 0;
      continue;
    }
    const boosted = mon.level < maxLv * PARTY_CATCHUP_THRESHOLD;
    mon.exp += boosted ? Math.round(exp * PARTY_CATCHUP_EXP_MULT) : exp;
    while (mon.level < LEVEL_CAP && mon.exp >= expToNext(mon.level)) {
      mon.exp -= expToNext(mon.level);
      mon.level += 1;
    }
    if (mon.level >= LEVEL_CAP) mon.exp = 0;
  }
}

// ステージ最後の1体(KILLS_PER_STAGE体目)はボス。倒すと報酬が跳ねる。
export function isBossKill(state) {
  return state.killsInStage === KILLS_PER_STAGE - 1;
}

// ボスの鍵: 幕ボスの間(x-10)への入場に1本消費する(無限ボス箱周回の防止)。
// 鍵は宝箱の開封からおまけで出る(KEY_FROM_CHEST_CHANCE)。
// 「鍵を使って扉を開ける瞬間」が山場になる設計。
// 2026-07-13 FB: 鍵は数値スタックでなく「1個ずつの個別アイテム」
// (state.keyItems: {id, difficulty, obtainedAt})。難易度ごとに別の鍵で、
// その難易度の幕ボスの間にしか使えない。将来Steamマーケットに1点ものとして
// 出品できるようにするための布石(叡智の水晶=state.crystalItemsも同様)。
export const BOSS_KEY_CAP = 9; // 難易度ごとの所持上限
export const KEY_FROM_CHEST_CHANCE = 0.08; // 2026-08-01 Haru指示「もう少し下げて」(0.125→0.08)
let nextKeyId = 1;
export function keyLabelOf(difficulty) {
  return `${DIFFICULTIES[difficulty]?.name ?? "未知"}の鍵`;
}
// 鍵/水晶も倉庫に預けられる(2026-07-15 FB「カギとか水晶も倉庫に入れられるように」)。
// 装備用の state.storage は「装備の配列」として扱う場所が多い(合成・錬金・売却など)ので、
// 鍵/水晶を混ぜると壊れる。代わりに各アイテムへ stored フラグを持たせて場所を表す。
//  ・stored なし = 持ち物(使える)
//  ・stored: true = 倉庫(預けているので使えない。所持上限BOSS_KEY_CAPの外に逃がせる)
const inInventory = (it) => !it.stored;
export function bossKeyCount(state, difficulty = null) {
  return (state.keyItems ?? []).filter(
    (k) => inInventory(k) && (difficulty === null || k.difficulty === difficulty),
  ).length;
}
// 倉庫に預けている鍵の数(難易度指定なしなら全部)
export function storedKeyCount(state, difficulty = null) {
  return (state.keyItems ?? []).filter(
    (k) => k.stored && (difficulty === null || k.difficulty === difficulty),
  ).length;
}
export function addBossKey(state, difficulty) {
  state.keyItems = state.keyItems ?? [];
  // 上限は「持ち物にある鍵」で見る(倉庫に逃がせば拾い続けられる)
  if (bossKeyCount(state, difficulty) >= BOSS_KEY_CAP) return null;
  const key = { id: `key_${Date.now()}_${nextKeyId++}`, difficulty, obtainedAt: Date.now() };
  state.keyItems.push(key);
  return key;
}
export function useBossKey(state, difficulty) {
  // 倉庫の鍵は使えない(引き出してから使う)
  const idx = (state.keyItems ?? []).findIndex((k) => inInventory(k) && k.difficulty === difficulty);
  if (idx === -1) return false;
  state.keyItems.splice(idx, 1);
  return true;
}
let nextCrystalId = 1;
export function crystalCount(state) {
  return (state.crystalItems ?? []).filter(inInventory).length;
}
export function storedCrystalCount(state) {
  return (state.crystalItems ?? []).filter((c) => c.stored).length;
}
export function addCrystal(state) {
  state.crystalItems = state.crystalItems ?? [];
  const c = { id: `crystal_${Date.now()}_${nextCrystalId++}`, obtainedAt: Date.now() };
  state.crystalItems.push(c);
  return c;
}

// 倉庫が使っている枠の数(装備 + 預けた鍵/水晶)。装備と同じ棚を分け合う。
export function storageUsed(state) {
  return (state.storage ?? []).length + storedKeyCount(state) + storedCrystalCount(state)
    + storedEvoStoneCount(state);
}
// 鍵/水晶を倉庫へ預ける / 持ち物へ引き出す。preciousId は key_xxx / crystal_xxx。
function findPrecious(state, preciousId) {
  return (
    (state.keyItems ?? []).find((k) => k.id === preciousId) ??
    (state.crystalItems ?? []).find((c) => c.id === preciousId) ??
    null
  );
}
export function movePreciousToStorage(state, preciousId) {
  const it = findPrecious(state, preciousId);
  if (!it) return { error: "その貴重品は 持っていない" };
  if (it.stored) return { error: "既に 倉庫にある" };
  if (storageUsed(state) >= storageCapOf(state)) return { error: "倉庫が満杯" };
  it.stored = true;
  return { item: it };
}
export function movePreciousToInventory(state, preciousId) {
  const it = findPrecious(state, preciousId);
  if (!it) return { error: "その貴重品は 倉庫にない" };
  if (!it.stored) return { error: "既に 持ち物にある" };
  // 鍵は難易度ごとの所持上限があるので、引き出せないことがある
  if (it.difficulty !== undefined && bossKeyCount(state, it.difficulty) >= BOSS_KEY_CAP) {
    return { error: `${keyLabelOf(it.difficulty)}は もう${BOSS_KEY_CAP}本 持っている` };
  }
  delete it.stored;
  return { item: it };
}

// 駆け出しの加護: 仲間が3体そろうまでは「すんなり進む」導入期。
// 被ダメ半減+ゆっくり自動回復(UI側)+卵ドロップ3倍(applyKill)で、
// パーティが形になる前に難易度の壁に当たらないようにする。
// 3体そろった瞬間から本番(全滅=ステージ最初から、の試行錯誤ゲーム)
// 叡智の水晶(兆し振り直しアイテム)の激レアドロップ率。
// 2026-07-13 FB「叡智の水晶のドロップ率をがっつり下げて」: 0.08/0.012→0.015/0.002
// 2026-07-21 FB「水晶が出まくる。激レアだよね?」: 中ボスは面クリアごとに湧くため
// 1/500でも積もる(周回で1日数個)。アルカナ級の看板に合わせて中ボスを1/2000へ。
// 幕ボスは鍵制の山場報酬なので1/67のまま(挑戦回数そのものが絞られている)
export const RESPEC_TOKEN_BOSS_CHANCE = 0.015; // 幕ボス(x-10)
export const RESPEC_TOKEN_MIDBOSS_CHANCE = 0.0005; // 各面10体目の中ボス

// ---- 回復の毎秒上限(2026-07-15 FB「回復スキルが強すぎる。回復キャラを3体入れておいて
// 敵の攻撃で死ななければどんな難易度も攻略できるレベルになってる」) ----
// 回復量は「パーティ最大HPの割合」なので、HPが伸びる後半でも同じ割合で効き続ける=
// 永久にスケールする。実測で回復3体=10.2%/秒に対し、最も削られる実効200でも被ダメは
// 7.7%/秒しかなく、全難易度で文字通り無敵だった(balance-simは回復を一切モデル化して
// いなかったため「耐え/撃破比は健全」と誤って通していた)。
//
// 逓減(2体目以降の効きを落とす)も検討したが、最良の回復スキル(7%/秒)を3体積むと
// 突破されるうえ、スキル威力の装備を盛るとさらに壊れるため、上限で確実に止める。
// 上限3.5%/秒は「回復1体(平均3.4%/秒)はそのまま働き、何体積んでもここで頭打ち」の線。
// 被ダメは実効100で4.3%/秒・実効200で7.7%/秒なので、回復だけでは高難度を耐えられない。
// (実効60=3.1%/秒 は上限を下回るが、そこは駆け出しの加護の帯なので意図どおり)
export const HEAL_CAP_PER_SEC = 0.035;
// ためられる秒数。単発の大回復(最大HPの数十%)はそのまま通したいので、この窓ぶんは
// 貯金できる。持続力(平均)は上限どおりに収まるので「積めば無敵」は起きない。
export const HEAL_BURST_WINDOW_SEC = 20;

export const ROOKIE_PARTY_SIZE = 3;
// 2026-07-09「キャラによっては1-1がクリアできない」→ 敵ATK強化ぶんを駆け出しの加護で吸収。
// 被ダメを大きく下げ+回復を上げ、攻撃の低いヒーラー/タンクのスターターでも序盤を突破できる。
export const ROOKIE_DEF_MULT = 0.28; // 被ダメ×0.28(0.5→0.28)
export const ROOKIE_REGEN_PER_SEC = 0.05; // 最大HPの5%/秒(0.02→0.05)
// 加護中の卵ドロップは ROOKIE_EGG_MULT(基本率の3倍=0.36%/撃破)。
// 2026-07-09「第2幕終了(ステージ20あたり)で3体そろうイメージ」に較正。
// KILLS_PER_STAGE=30なので、1個目≒280撃破(1幕終わり頃)/2個目≒560撃破
// (2幕終わり頃=ステージ20)で3体そろう想定。
// (0.96%→0.36%に減速。以前は数十撃破で3体揃ってしまい早すぎた)
// 2026-08-13 乗算式化で「基礎率への加算(ROOKIE_EGG_BONUS)」から「基礎率への倍率」
// へ表現を変えたが、実効率0.36%/撃破は据え置き(定義は eggDropChance のそば)
// 3体そろった後は卵をガクッと希少化(1体1体の登場に興奮感を持たせる設計)。
// dropBonus(兆し/装備=プレイヤーの投資)は満額のせるので、卵が欲しい人は伸ばせる。
// 2026-07-13〜2026-08-12は加護明けを時間ゲート化していたが、確率窓の表記を
// 「撃破ごとX%」で統一するため撃破ごと抽選へ戻した(2026-08-12 Haru指示)。
// 較正: tools/balance-model.jsの現行カーブ(全帯killsPerMinの中央値≒12.5/分)を
// 基準に「5時間に1個くらい」を狙う。実効率 ≈ EGG_DROP_CHANCE×0.22 = 0.000264/撃破
// → 0.000264×12.5×60×24 ≈ 4.8個/日(24h÷4.8 ≈ 5h/個)。撃破が速い序盤ほど早く、
// 遅い終盤ほど間隔が空く(装備・兆しのドロップ率ボーナスを伸ばせばさらに縮む)。
// 2026-07-09時点の旧値(0.03=1日2個想定)は当時のカーブ基準で、その後のバランス
// 再調整でカーブ自体が変わり実測と乖離していたため、現行カーブから引き直した
export const POST_ROOKIE_EGG_MULT = 0.22;

export function isRookie(state) {
  // 卵も頭数に数える(2026-07-24 FB「加護は卵3体そろったら消えるようにして」)。
  // 孵化を後回しにすると加護(被ダメ0.28倍+自動回復)が延々続き、
  // 「3体そろうまでのオンボーディング」という趣旨を超えて楽になっていた
  return Object.keys(state.monsters).length + (state.eggs?.length ?? 0) < ROOKIE_PARTY_SIZE;
}

// 加護中の宝箱ドロップ率ブースト(2026-08-10 FB「加護中の宝箱ドロップ率も大幅アップ
// (3倍くらい)」)。卵ドロップと同じ「駆け出しは手厚く」の思想を宝箱にも揃える
// 2026-08-11 Haru指示「加護中の宝箱ドロップ率を1.5倍にして」: 3倍は強すぎたため1.5倍へ再調整
export const ROOKIE_CHEST_MULT = 1.5;

// 加護中に手持ちキャラの武器/サブ武器ロールを寄せるための「今のジョブのロール一覧」
// (2026-08-10 FB「加護中は自分の持ちキャラのジョブに関する装備が出やすいように」)。
// 手持ち全員(パーティ外も含む)のジョブから重複なく集める
export function rookieJobRoles(state) {
  const roles = new Set();
  for (const m of Object.values(state.monsters)) roles.add(jobRoleOf(m));
  return [...roles];
}
// 1個目の卵だけ大幅ブースト(2026-07-10 FB「スタート30分が寂しい」対応)。
// スターター1体だけの間は実効約3%/撃破 ≒ 1ステージ強(数分)で最初の仲間の卵が出る。
// 2個目以降は従来の加護ペース(2幕終わり頃に3体)に戻る。
export const FIRST_EGG_MULT = 25; // 基本率の25倍 = 3%/撃破
export const ROOKIE_EGG_MULT = 3; // 基本率の3倍 = 0.36%/撃破(2幕終わりで3体そろう較正)

// そのステートでの「ボーナス込みの卵ドロップ率」(撃破1回あたり)。
// 2026-08-13 Haru指示で**乗算式**に変更: 実効率 = 基本率 × (1 + partyDropBonus)。
// 基本率は進行段階で決まる(1個目=25倍 / 加護中=3倍 / 加護明け=POST_ROOKIE_EGG_MULT)。
//
// 旧・加算式との違い: 以前は partyDropBonus をそのまま実効率へ足していたため、
// 基本率0.026%に対して装備・覚醒のボーナス(最大20%)がほぼ全部になり、
// 覚醒Ⅵ3体で「撃破ごとにほぼ確定で卵」まで壊れていた(そのための18%キャップ)。
// 乗算式ではボーナスは基本率を割合で伸ばすだけなので、キャップ無しの理論最大
// (実測≒65%)でも 0.026%→0.043% にしかならない。
//
// **確率窓(renderOdds)も抽選(applyKill)もこの関数だけを見る**こと。
// 表示と実装が別経路に分かれると必ず食い違う(2026-08-12の「12.12%は合ってる?」)
export function eggDropChance(state) {
  const owned = Object.keys(state.monsters).length + (state.eggs?.length ?? 0);
  const baseMult = isRookie(state)
    ? owned <= 1
      ? FIRST_EGG_MULT
      : ROOKIE_EGG_MULT
    : POST_ROOKIE_EGG_MULT;
  return EGG_DROP_CHANCE * baseMult * (1 + Math.max(0, partyDropBonus(state)));
}

// 上の内訳(確率窓が「基本×(1+ボーナス)」を分解して見せるため)。
// eggDropChance と同じ式から引くので、片方だけ変わって食い違うことがない
export function eggDropBreakdown(state) {
  const bonus = Math.max(0, partyDropBonus(state));
  const chance = eggDropChance(state);
  return { base: chance / (1 + bonus), bonus, chance };
}

// ---- 検証用ブースト(テストビルド限定 2026-07-11) ----
// 卵/EXP/ゴールドの獲得を大幅に増やして検証を速くするデバッグ機能。
// 実経済・確率開示とは無関係。製品ビルドではUI(ポータル下部)ごと隠すこと。
export const DEBUG_BOOST_MULT = 20;
export function debugBoost(state, key) {
  return state.debugBoosts?.[key] ? DEBUG_BOOST_MULT : 1;
}
export function toggleDebugBoost(state, key) {
  state.debugBoosts = state.debugBoosts ?? {};
  state.debugBoosts[key] = !state.debugBoosts[key];
  return !!state.debugBoosts[key];
}

// 検証用: 終盤の戦力を1発で用意する(2026-07-25 FB「最終調整するから有料コンテンツ含め
// 全部検証用に使えるように」)。開発パネル(撮影モードでは非表示)からしか呼ばれない。
//
// なぜ必要か: 難所の手応え(深淵=被ダメ3.8倍)は**実際に食らわないと調整できない**が、
// そこへ到達する戦力は普通に遊ぶと20日かかる。属性防御(elemDef)を上限ぶん積んだ
// 細工行を全部位に入れてあるので、装備を外すだけで「盛った場合/盛らない場合」を
// その場で比較できる = 難所の設計意図そのものを検証できる。
export const DEBUG_PARTY_ELEMDEF = 0.3; // HAZARD_ELEMDEF_CAP と同値(上限ぶん)
export function grantDebugEndgameParty(state) {
  // 最上位レア度から、属性が重ならないように3体選ぶ。属性をばらけさせるのは
  // 難所「試練/深淵」の与ダメ減衰(有利属性だけ通る)を検証できるようにするため。
  // 種族名を直書きすると種族表を触ったときに壊れるので、必ずSPECIESから引く
  const rank = ["cosmic", "century", "beyond", "arcana"];
  const pool = Object.values(SPECIES)
    .filter((sp) => rank.includes(sp.rarity))
    .sort((a, b) => rank.indexOf(a.rarity) - rank.indexOf(b.rarity));
  const picked = [];
  const usedElements = new Set();
  for (const sp of pool) {
    if (picked.length >= MAX_PARTY) break;
    if (!sp.element || usedElements.has(sp.element)) continue;
    usedElements.add(sp.element);
    picked.push(sp.id);
  }
  const ids = [];
  for (const sp of picked) {
    const m = makeMonster(sp, { atk: IV_MAX_BRED, hp: IV_MAX_BRED });
    m.level = LEVEL_CAP;
    m.equipment = PART_ORDER.map((part) => ({
      id: `dbg_${m.id}_${part}`,
      part,
      rarity: "cosmic",
      name: `検証用の${PARTS[part].base}`,
      level: LEVEL_CAP,
      obtainedAt: Date.now(),
      opts: [
        { stat: "atkPct", value: 1.0, base: true },
        { stat: "hpPct", value: 1.0 },
      ],
      // 属性防御は細工限定なので enhances 側に置く(equipStatの読み方に合わせる)。
      // **鎧1箇所だけ**に上限ぶんを乗せる: 全部位に乗せると合計180%になって
      // 表示が意味不明になるうえ、「鎧を外す/付ける」で難所の手応えを
      // その場で比べられなくなる(検証用として使いものにならない)
      enhances: part === "armor" ? [{ stat: "elemDef", value: DEBUG_PARTY_ELEMDEF }] : [],
    }));
    state.monsters[m.id] = m;
    registerDex(state, sp);
    ids.push(m.id);
  }
  if (ids.length > 0) state.party = ids.slice(0, MAX_PARTY);
  return ids.length;
}

// ヘル(difficulty id 2)以降のゴールド取得量を2/3に(2026-08-07 Haru指示
// 「ヘル以降のゴールド取得量が多いので2/3に減らして」)。トーメント・追加地域も含む
export const HELL_GOLD_DIFFICULTY = 2;
export const HELL_GOLD_MULT = 2 / 3;

// 撃破1回分の状態更新。
export function applyKill(state, rng = Math.random) {
  const bossStage = isBossStage(state.stage); // 幕ボスの間(x-10)はボス単体
  const gimmick = stageGimmick(state.difficulty ?? 0, state.stage); // 難所(難易度でスケール)
  const wall = gimmick?.kind === "wall"; // 難所「巨壁」も単体
  const boss = bossStage || wall || isBossKill(state); // 通常面の最後の1体は中ボス
  const eff = effectiveStage(state); // 報酬・ドロップは実効ステージ(難易度込み)
  const stageOfKill = state.stage;
  const difficultyOfKill = state.difficulty ?? 0; // 自動難易度突入で書き換わる前を捕捉(2026-07-13)
  // ノーマル帯の宝箱ブーストは「まだノーマルを1周もクリアしていない」間だけ有効
  // (2026-08-11 Haru指示「一度ノーマルをクリアするとドロップ率は通常に戻るように。
  // 一生ノーマルを周回するとおいしい設計にならないように」)。difficultyOfKill===0だけで
  // 判定すると、次の難易度を解放した後にわざとノーマルへ戻って周回してもブーストが
  // 乗り続けてしまう(=ずっとノーマルに居座るのが最適解になる経済上の穴)。
  // bossClearedD[0](10-10幕ボスの初撃破=ノーマル完全クリアの実測)で判定するので、
  // 一度クリアすれば以後は難易度を戻ってもブーストは戻らない
  const normalNotClearedYet = (state.bossClearedD?.[0] ?? 0) < STAGES_PER_DIFFICULTY;
  // LIVE_TUNING.boss*Mult = 週次の自動バランス調整(ボス報酬だけの補正。クランプ済み)
  // 巨壁は1体=1面分の報酬(goldMult/expMult)
  state.gold += Math.round(
    goldReward(eff) * (1 + partyGoldBonus(state)) * (wall ? gimmick.goldMult : bossStage ? 6 : boss ? 3 : 1) *
      (boss ? LIVE_TUNING.bossGoldMult : 1) * debugBoost(state, "gold") *
      (difficultyOfKill >= HELL_GOLD_DIFFICULTY ? HELL_GOLD_MULT : 1),
  );
  state.totalKills += 1;
  state.killsInStage += 1;

  grantPartyExp(
    state,
    Math.round(
      expReward(eff) * (1 + partyExpBonus(state)) * (wall ? gimmick.expMult : bossStage ? 4 : boss ? 2 : 1) *
        (boss ? LIVE_TUNING.bossExpMult : 1) * debugBoost(state, "exp"),
    ),
  );

  // ステージ進行。次が幕ボスの間なら鍵を1本消費して入場(なければ手前で待機)
  let keyBlocked = false;
  let chestFullWait = false; // ボス箱満杯で入場を見送った(鍵は未消費)
  let usedKey = false;
  let unlockedDifficulty = null;
  let hazardFirst = null; // 難所の初回踏破(UIのお祝い用)
  if (state.killsInStage >= stageKillTarget(state.stage, state.difficulty ?? 0)) {
    state.killsInStage = 0;
    // 難所の初回踏破報酬(2026-07-20 バッチ3・**報酬ルール初日固定**):
    // どの難易度でも 叡智の水晶×1。トーメントの難所はさらにボスの鍵×1
    if (gimmick) {
      state.hazardFirst = state.hazardFirst ?? {};
      const hKey = `${difficultyOfKill}-${stageOfKill}`;
      if (!state.hazardFirst[hKey]) {
        state.hazardFirst[hKey] = true;
        addCrystal(state);
        const extraKey = difficultyOfKill === 3 && !!addBossKey(state, difficultyOfKill);
        hazardFirst = { name: gimmick.name, crystal: 1, key: extraKey };
      }
    }
    const next = state.stage + 1;
    const loop = state.settings?.loopStage;
    if (bossStage) {
      // 幕ボス撃破: 10-10なら次の難易度を解放して自動で突入(2026-07-13 FB
      // 「難易度をクリアしたら自動で次の難易度行くようにして」)
      if (state.stage >= STAGES_PER_DIFFICULTY) {
        // 2026-08-12 実機報告「10-10を周回するとクリアするたびに10-9まで
        // 押し戻され、10-9からやり直しになる」。この分岐は10-10撃破のたびに
        // 必ず通るため、下の「loop === state.stage」(他の幕ボスと同じ周回)
        // 分岐が一度も評価されず、周回設定(keyFarm/loopStage)がここで
        // 毎回無視されて手前へ押し戻されていた。同じ周回条件をここにも適用する
        const wantsBossLoop = state.settings?.keyFarm || state.settings?.loopStage === state.stage;
        if (
          state.difficulty < DIFFICULTIES.length - 1 &&
          (state.bossClearedD?.[state.difficulty] ?? 0) < STAGES_PER_DIFFICULTY
        ) {
          unlockedDifficulty = state.difficulty + 1;
          state.difficulty = unlockedDifficulty;
          state.stage = 1;
          state.settings.loopStage = null;
        } else if (wantsBossLoop) {
          if (bossChestFull(state)) {
            chestFullWait = true;
            state.stage = state.stage - 1;
          } else if (useBossKey(state, state.difficulty ?? 0)) {
            usedKey = true; // stageはそのまま(同じボスの間)
          } else {
            state.settings.loopStage = null;
            keyBlocked = true;
            state.stage = state.stage - 1;
          }
        } else {
          state.stage = STAGES_PER_DIFFICULTY - 1; // 最終難易度/再クリアは手前の面で周回
        }
      } else if (loop === state.stage) {
        // クリア済みボスの周回(2026-07-19 FB「クリア済みのボス周回機能ボタンがない」):
        // 1周ごとに鍵を1本消費して再入場。鍵が切れたら周回解除して手前の面へ。
        // ボス箱が満杯なら鍵を使わず手前の面で待機(周回は維持=自動開封で枠が
        // 空いたら次の周で自動的に再入場する。2026-07-22 FB「鍵だけ消費してしまう」)
        if (bossChestFull(state)) {
          chestFullWait = true;
          state.stage = state.stage - 1; // loopStageは残す=枠が空いたら戻る
        } else if (useBossKey(state, state.difficulty ?? 0)) {
          usedKey = true; // stageはそのまま(同じボスの間)
        } else {
          state.settings.loopStage = null;
          keyBlocked = true;
          state.stage = state.stage - 1;
        }
      } else if (loop && loop < state.stage) {
        // 幕ボスに勝ったら「敗北後の自動周回」(手前の面に付いた🔁)は解除して先へ進む。
        // 2026-07-21 FB「ボス倒したのに次の幕に自動で進まない」: 敗北時に自動セットされた
        // loopStage(x-9)が、勝利後も次の幕でなくx-9へ引き戻していた
        state.settings.loopStage = null;
        state.stage = next;
      } else {
        state.stage = loop && next > loop ? loop : next;
      }
    } else if (loop && loop < state.stage) {
      // 通常面でも同じ: 周回面より先の面をクリアした=鍛え直しは終わった合図なので解除
      state.settings.loopStage = null;
      state.stage = next;
    } else if (loop && next > loop) {
      state.stage = loop; // 周回モード
    } else if (isBossStage(next)) {
      // クリア済みの幕ボスへは自動入場しない(2026-07-18 FB「鍵の周回ありなし選択」:
      // x-9を周回していると鍵が黙って消費されて再入場を繰り返していた)。
      // settings.keyFarm=true にすると従来どおり鍵で自動周回する
      const cleared = next <= bossClearedOf(state);
      // ボス周回の意思がある入場(keyFarm または loopStage=ボスの間)は、ボス箱が
      // 満杯のあいだ鍵を使わず待機する(2026-07-22 FB。枠が空いたら自動で再開)。
      // 初回挑戦(進行)は満杯でも通す=キル時の安全網が箱を必ず付与するので損しない
      const wantsBossLoop = state.settings?.keyFarm || state.settings?.loopStage === next;
      // 2026-08-10 FB「2-1で負けて1-9に戻り、勝っても2-1に進まない」: 敗北後退が
      // クリア済みボス面(x-10)への着地を避けて手前へ寄せる(意図通り)一方、
      // 「cleared && !wantsBossLoop」が常に「何もしない」だったため、一度でも
      // その先(2-1以降)まで進んだことがあるのに手前へ寄せられたケースでも
      // 永遠に周回するだけで二度と先へ進めなかった。
      // 一方で「まだ一度もこの幕ボスの先へ進んだことがない(意図的に手前で足踏み・
      // 鍵集め中)」場合は、鍵なしで勝手に先へ進むと2026-07-18 FBの再発になる
      // (「x-9を周回していると黙って次へ進んでしまう」)。区別は
      // 「この難易度で最高到達点(maxStageOf)がこのボスより先まで進んでいるか」で行う
      const alreadyPastThisBoss = maxStageOf(state) > next;
      if (cleared && !wantsBossLoop && alreadyPastThisBoss) {
        // 素通りは鍵を使わない(すでに初回突破ずみの面を再訪するだけなので)
        state.stage = next + 1;
      } else if (cleared && !wantsBossLoop) {
        // 何もしない=今の面を周回(再挑戦は地図から鍵で)
      } else if (cleared && wantsBossLoop && bossChestFull(state)) {
        chestFullWait = true; // 鍵は温存。今の面を回りながら枠が空くのを待つ
      } else if (useBossKey(state, state.difficulty ?? 0)) {
        usedKey = true;
        state.stage = next;
      } else if (!cleared) {
        keyBlocked = true; // 鍵がない: 今の面を回りながら宝箱から鍵を探す
      }
    } else {
      state.stage = next;
    }
    state.maxStageD = state.maxStageD ?? DIFFICULTIES.map(() => 1);
    state.maxStageD[state.difficulty] = Math.max(maxStageOf(state), state.stage);
  }

  let egg = null;
  if (state.eggs.length < eggCapOf(state) && debugBoost(state, "egg") > 1) {
    // 検証用ブースト: 約25%/撃破で卵
    egg = rollEggDrop(eff, rng, 0.25);
    if (egg) state.eggs.push(egg);
  } else if (state.eggs.length < eggCapOf(state)) {
    // 撃破ごとの%抽選(2026-08-12 Haru指示: 確率窓の表記を「撃破ごとX%」に統一する
    // ため、加護明けの時間ゲート(2026-07-13導入)を廃止し撃破ごと抽選に戻した)。
    // eggDropChanceが進行段階(1個目/加護中/加護明け)とボーナス倍率を内部で
    // 全部畳んだ「最終確率」を返すので、確率窓(renderOdds)と完全に同じ値になる
    egg = rollEggDrop(eff, rng, eggDropChance(state));
    if (egg) state.eggs.push(egg);
  }

  // 装備は「宝箱」として落ちる(開封で中身が判明)。宝箱枠が満杯なら出ない。
  // 中身はドロップ時に確定させておく(開封タイミングで抽選が変わる不正を防ぐ)。
  // 種類は3つだけ: 木箱(コモン)/レア箱 = 通常ドロップ、ボス箱 = 幕ボス確定。
  let chest = null;
  let firstClear = false;
  // 初クリアの記録は宝箱ストックと無関係に必ず行う(2026-07-18: ボス箱が満杯(4/4)だと
  // bossClearedDの更新ごとスキップされ、10-10の初クリアでも難易度解放を取り逃がすバグだった)
  let expedSlotGranted = false;
  if (bossStage) {
    state.bossClearedD = state.bossClearedD ?? DIFFICULTIES.map(() => 0);
    firstClear = stageOfKill > (state.bossClearedD[difficultyOfKill] ?? 0);
    if (firstClear) state.bossClearedD[difficultyOfKill] = stageOfKill;
    // 探索パーティ+1組(2026-08-06 Haru指示「各難易度の最終ステージクリア時に
    // 1パーティずつ追加して」)。その難易度を完全クリアした瞬間(最終ステージの
    // 初回撃破)に3枠(=1パーティぶん)増える。購入枠/パスの枠と同じ expedCap を
    // 共有して伸ばす。2026-08-12 修正: 指示は「1パーティ」だったのに+1人(メンバー
    // 単位)で実装されていた不一致を直した(EXPEDITION_MAX_MONS=1パーティの人数)
    if (firstClear && stageOfKill === STAGES_PER_DIFFICULTY && expeditionCapOf(state) < EXPEDITION_SLOT_MAX) {
      state.expedCap = Math.min(EXPEDITION_SLOT_MAX, expeditionCapOf(state) + EXPEDITION_MAX_MONS);
      expedSlotGranted = true;
    }
  }
  {
    const rookieRoles = isRookie(state) ? rookieJobRoles(state) : null;
    if (bossStage) {
      // 幕ボスの間: ボス箱確定(入場に鍵を払っている)。初クリアは2個。
      // **付与時はストック上限を見ない**(2026-07-22 FB「満杯だと鍵だけ消費」:
      // 上限の番は入場側のガードが担う。入場してしまった後に箱を没収すると
      // 「鍵を払ったのに何も出ない」が起きる。あふれた分は自動開封で流れる)
      chest = {
        id: `chest_${Date.now()}_${nextChestId++}`,
        kind: "boss",
        item: rollBossChestItem(eff, rng, rookieRoles),
        obtainedAt: Date.now(),
      };
      state.chests.push(chest);
      if (firstClear) {
        state.chests.push({
          id: `chest_${Date.now()}_${nextChestId++}`,
          kind: "boss",
          item: rollBossChestItem(eff, rng, rookieRoles),
          obtainedAt: Date.now(),
        });
      }
    } else if (
      !boss &&
      !bossStage &&
      rng() <
        EQUIP_DROP_CHANCE *
          (1 + sumEquip(state, "chestBonus")) *
          (difficultyOfKill === 0 && normalNotClearedYet ? NORMAL_CHEST_BONUS_MULT : 1) *
          (isRookie(state) ? ROOKIE_CHEST_MULT : 1)
    ) {
      const item = rollNormalChestItem(
        eff,
        rng,
        difficultyOfKill === 0 && normalNotClearedYet ? NORMAL_AREA_RARE_BOX_MULT : 1,
        rookieRoles,
      );
      const kind = item.rarity === "common" ? "wood" : "rare";
      if (chestCountOf(state, kind) < chestCapOf(state, kind)) {
        chest = {
          id: `chest_${Date.now()}_${nextChestId++}`,
          kind,
          item,
          obtainedAt: Date.now(),
        };
        state.chests.push(chest);
      } else {
        chest = null;
      }
    }
  }

  // 記念コイン: 通常撃破で低確率、幕ボスは高確率で上位寄りのコイン
  state.coins = state.coins ?? {};
  const coinDrop = bossStage ? rollBossCoinDrop(eff, rng) : rollCoinDrop(eff, rng);
  if (coinDrop) state.coins[coinDrop.id] = (state.coins[coinDrop.id] ?? 0) + 1;

  // 叡智の水晶(兆し振り直しアイテム): 激レアドロップ。幕ボスでまれ・中ボスでごくまれ
  let respecDrop = false;
  const respecChance = bossStage ? RESPEC_TOKEN_BOSS_CHANCE : boss ? RESPEC_TOKEN_MIDBOSS_CHANCE : 0;
  if (respecChance > 0 && rng() < respecChance) {
    addCrystal(state); // 個別アイテムとして追加(2026-07-13)
    respecDrop = true;
  }

  // 進化石(2026-07-28): 通常撃破でロール石(等確率4種)、激レアでランダム進化石。
  // 幕ボスはご褒美として高確率(鍵制の一発勝負に見返りを持たせる)
  let evoStoneDrop = null;
  {
    const randChance = bossStage ? EVO_STONE_BOSS_RANDOM_CHANCE : EVO_STONE_RANDOM_CHANCE;
    const roleChance = bossStage ? EVO_STONE_BOSS_CHANCE : EVO_STONE_DROP_CHANCE;
    let kind = null;
    if (rng() < randChance) kind = "random";
    else if (rng() < roleChance) kind = EVO_STONE_ROLES[Math.floor(rng() * EVO_STONE_ROLES.length)];
    if (kind) {
      // レア度は種類ごとに固定(2026-07-29 Haru指示: ロール=イモータル/ランダム=アルカナ)
      addEvoStone(state, kind, 1);
      evoStoneDrop = { kind, rarity: evoStoneRarityOf(kind) };
    }
  }

  return { egg, chest, boss, bossStage, firstClear, coinDrop, respecDrop, evoStoneDrop, keyBlocked, chestFullWait, usedKey, unlockedDifficulty, hazardFirst, expedSlotGranted };
}

// オフラインEXPの効率。撃破速度の推定(killsPerSecFromAtk)はスキル/会心/攻撃速度を
// 含まず実プレイより辛いため、EXPだけ上乗せして「つけてなくても育つ」感を出す
// (2026-07-10 FB「オフラインでももう少しレベル上がってほしい」)。ゴールドは従来どおり。
export const OFFLINE_EXP_EFF = 1.6;
// (旧)オフラインの卵レート。2026-07-25 に卵の付与そのものを廃止したため未使用。
// 定数は互換のために残す(セーブ移行やテストが参照している可能性への保険)
export const OFFLINE_EGG_RATE = 0.5;

// オフラインで入るのは**経験値だけ**(2026-07-25 Haru指示
// 「基本的にオフライン時には経験値のみしか入らない、かつ上限があるように」)。
//
// なぜ絞るか: 放置ゲームの蛇口は「アプリを起動している時間」に紐づけるのが正しい。
// アプリを閉じている間にモノ(ゴールド・卵・装備)まで増えると、
//   ① 起動せずに増やせる=Botに最も都合のいい蛇口になる(マーケットの供給源)
//   ② 何度も起動し直す動機になり、体験としても濁る
// 経験値だけなら「育つ」感触は残るのに、市場に流れる**モノは1つも増えない**。
// CLAUDE.md の「経済は緩める方向にしか動かせない」に従い、リリース前の今のうちに絞る。
export const OFFLINE_GOLD = false;
export const OFFLINE_EGGS = false;

// オフライン進行。経過時間×パーティ合計火力による撃破速度で**経験値のみ**を付与する。
export function applyOfflineProgress(state, now = Date.now(), rng = Math.random) {
  // 上限: 何日空けても OFFLINE_CAP_MS(12時間)ぶんまでしか入らない。
  // 「放置しっぱなしで無限に伸びる」を構造的に不可能にしている本体がここ
  const elapsed = Math.min(Math.max(0, now - state.lastSeen), OFFLINE_CAP_MS);
  state.lastSeen = now;
  if (elapsed < 60 * 1000) return null; // 1分未満は無視
  // 幕ボスの間(x-10)ではオフライン周回できない(ボスは鍵制の一発勝負)
  if (isBossStage(state.stage)) return null;

  const eff = effectiveStage(state);
  // パーティ合計火力から撃破速度を出す
  const kps = killsPerSecFromAtk(partyAtk(state), eff);
  const kills = Math.floor((elapsed / 1000) * kps);
  if (kills <= 0) return null;

  const expGained = Math.round(expReward(eff) * kills * (1 + partyExpBonus(state)) * OFFLINE_EXP_EFF);
  grantPartyExp(state, expGained);
  state.totalKills += kills;

  // 卵は撃破ごとの抽選のみ(applyKill)なので、オフライン進行(経験値だけを付与する
  // このパス)は元々rollEggDropを呼ばない=卵タイマーを操作する必要自体がない
  return { elapsed, kills, gold: 0, exp: expGained, eggs: [], chests: [], coinsGained: [] };
}

export function serialize(state) {
  stampMints(state); // 保存のたびに未刻印の覚醒/高レア/固有へ通し番号を付与
  return JSON.stringify(state);
}

export function deserialize(json) {
  const state = JSON.parse(json);

  // v1(activeMonsterId 単体)→ v2(party 配列)へマイグレーション
  // 進化石(2026-07-28 新設)の後方互換: 旧セーブには無いので0で初期化。
  // 既にLv30を超えて「今すぐ進化できるのに石が無い」子がいる場合に備えて、
  // 進化可能な子1体につき同系統の石を1個だけ配る(はしごを外さない)
  if (!state.evoStones) {
    state.evoStones = { nuke: 0, guard: 0, heal: 0, buff: 0, random: 0 };
    for (const mon of Object.values(state.monsters ?? {})) {
      const stage = JOBS[mon?.job]?.tier >= 3 ? 2 : JOBS[mon?.job]?.tier ? 1 : 0;
      if (stage < EVOLVE_LEVELS.length && (mon.level ?? 1) >= EVOLVE_LEVELS[stage]) {
        const role = JOBS[mon.job]?.role ?? SKILLS[SPECIES[mon.speciesId]?.skillId]?.active?.type ?? "nuke";
        if (state.evoStones[role] != null) state.evoStones[role] += 1;
      }
    }
  }

  normalizeEvoStonesStored(state); // 倉庫のぶん(2026-08-05)。旧セーブは全部0で始まる

  if (state.version === 1 && state.activeMonsterId) {
    state.party = [state.activeMonsterId];
    delete state.activeMonsterId;
    state.version = 2;
  }

  if (state.version !== SAVE_VERSION) return null;

  // 参照整合性チェック(壊れたセーブでクラッシュしないための最低限)
  if (!Array.isArray(state.party) || state.party.length === 0) return null;
  for (const id of state.party) {
    if (!state.monsters || !state.monsters[id]) return null;
  }
  // 旧レア度体系(〜v2初期: epic/legendary)からのマイグレーション
  // 旧epic→legend、旧legendary→arcana(当時の種族の現在ティアに対応)
  const rarityMigration = { epic: "legend", legendary: "arcana" };
  for (const egg of state.eggs ?? []) {
    if (rarityMigration[egg.rarity]) egg.rarity = rarityMigration[egg.rarity];
  }
  const migrateItems = (items) => {
    for (const item of items ?? []) {
      if (rarityMigration[item.rarity]) item.rarity = rarityMigration[item.rarity];
    }
  };
  migrateItems(state.items);

  // 廃止した記念コイン(銅/銀)を金へ引き上げる(2026-07-22)。
  // 定義から消えたIDが残っていると「使えない在庫」になるので必ず移す
  migrateLegacyCoins(state);

  // 装備の正規化(2026-07-13 FB):
  // ・基礎ステを現行の決定式で引き直す=決定化前のランダム基礎で「低レアの方が
  //   基礎が高い」旧装備の逆転を解消(同部位・同Lvなら必ずレア度順になる)
  // ・武器/サブ武器の「共通装備(ロールなし)」は廃止→IDから決定的にロールを付与
  const hashId = (str) => {
    let h = 2166136261;
    for (let i = 0; i < String(str).length; i++) {
      h ^= String(str).charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return Math.abs(h);
  };
  const normalizeItem = (it) => {
    if (!it || !Array.isArray(it.opts)) return;
    // 細工v2(単一行 it.enhance)→ v3(スロット配列 it.enhances)への移行(2026-07-19)。
    // イモータル未満に付いた旧行もそのまま有効(既得は取り上げない=TBHの轍を踏まない)
    if (it.enhance && !Array.isArray(it.enhances)) {
      it.enhances = [{ kind: "carve", grade: "basic", stat: it.enhance.stat, value: it.enhance.value }];
    }
    delete it.enhance;
    const part = (it.part = it.part ?? inferPart(it));
    if ((part === "weapon" || part === "sub") && !it.role && !it.uniqueId) {
      it.role = ROLE_WEAPON_ORDER[hashId(it.id) % ROLE_WEAPON_ORDER.length];
    }
    // 装備レベルは段階制へ量子化(2026-07-13)
    it.lv = equipLvTier(it.lv ?? 1);
    // 基礎ステの決定値化。アクセはランダム基礎(2026-07-13)なのでステは保持し値だけ正規化
    const o = it.opts[0];
    const baseDef =
      part === "charm"
        ? (CHARM_BASE_POOL.find((d) => d.stat === o?.stat) ??
           (CHARM_KINDS[it.charmKind] && o?.stat === CHARM_KINDS[it.charmKind].stat
             ? CHARM_KINDS[it.charmKind]
             : null))
        : part === "sub"
          ? // サブ武器はロール別プール(2026-07-13)か旧定義(防御/会心威力/攻撃速度)の一致する方
            [
              ...(ROLE_SUB_POOL[it.role] ?? []),
              BASE_STAT_BY_PART.sub,
              { stat: "critDmg", range: [0.08, 0.14] }, // 旧nukeサブ基礎
              { stat: "atkSpeed", range: [0.05, 0.09] }, // 旧buffサブ基礎
              { stat: "dropBonus", range: [0.006, 0.012] }, // 旧buffサブ基礎(2026-07-13前半)
            ].find((d) => d && d.stat === o?.stat) ?? null
          : BASE_STAT_BY_PART[part];
    // 旧buffサブ(攻撃速度基礎)は新プール(CD短縮/ドロップ率)へ移行(2026-07-13 FB)
    let subBaseDef = baseDef;
    if (part === "sub" && it.role === "buff" && o?.base && o.stat === "atkSpeed") {
      const pool = ROLE_SUB_POOL.buff;
      subBaseDef = pool[hashId(it.id + "subbase") % pool.length];
      o.stat = subBaseDef.stat;
    }
    if (o?.base && subBaseDef && o.stat === subBaseDef.stat && VALUE_MULT[it.rarity]) {
      const mid = (subBaseDef.range[0] + subBaseDef.range[1]) / 2;
      o.value = STAT_META[subBaseDef.stat].flat
        ? flatStatValue(subBaseDef.stat, mid, it.rarity, it.lv ?? 1)
        : Math.round(mid * VALUE_MULT[it.rarity] * equipLevelMult(it.lv ?? 1) * 1000) / 1000;
    }
    // 細工v5(2026-07-21): スロット順が 装飾→碑文→彫刻 の循環に変わったので、
    // 既存の行を同じ種のスロットへ移し替える(行の値は変えない=既得は取り上げない)。
    // 同種の枠が無くなった行は残りの空き枠へ退避(種の表示だけ枠に合わせる)
    if (Array.isArray(it.enhances) && it.enhances.some(Boolean)) {
      const slots = enhanceSlotsOf(it);
      if (slots.length > 0) {
        const lines = it.enhances.filter(Boolean);
        const next = new Array(slots.length).fill(null);
        const rest = [];
        for (const ln of lines) {
          const j = next.findIndex((v, idx) => v === null && slots[idx] === ln.kind);
          if (j >= 0) next[j] = ln;
          else rest.push(ln);
        }
        for (const ln of rest) {
          const j = next.findIndex((v) => v === null);
          if (j >= 0) next[j] = { ...ln, kind: slots[j] };
        }
        it.enhances = next;
      }
    }
  };
  for (const it of state.items ?? []) normalizeItem(it);
  for (const it of state.storage ?? []) normalizeItem(it);
  for (const c of state.chests ?? []) normalizeItem(c?.item);
  state.tradeShip = state.tradeShip ?? [];
  for (const it of state.tradeShip) normalizeItem(it);
  // 出品トークン: 数値以外を落とし、未来時刻は現在に丸める
  // (時計を進めて積む→戻す、で消滅して枠が湧くのを防ぐ。本番の消費はサーバー側に移す)
  state.tradeListAt = (Array.isArray(state.tradeListAt) ? state.tradeListAt : [])
    .filter((t) => Number.isFinite(t))
    .map((t) => Math.min(t, Date.now()));
  // タスモンの積み荷(2026-07-16): 壊れた個体を落とし、覚醒した子は手元に戻す
  // (覚醒後に旧版でセーブされた等の事故でも「覚醒個体が出品される」状態を作らない)
  state.tradeShipPrecious = (Array.isArray(state.tradeShipPrecious) ? state.tradeShipPrecious : []).filter(
    (p) => p && typeof p.id === "string",
  );
  state.tradeShipMons = (Array.isArray(state.tradeShipMons) ? state.tradeShipMons : []).filter(
    (m) => m && SPECIES[m.speciesId] && typeof m.id === "string",
  );
  for (const m of [...state.tradeShipMons]) {
    if (!Array.isArray(m.equipment)) m.equipment = [];
    if ((m.awakening ?? 0) > 0) {
      state.tradeShipMons = state.tradeShipMons.filter((x) => x.id !== m.id);
      state.monsters[m.id] = m;
    }
  }
  for (const mon of Object.values(state.monsters ?? {})) {
    for (const it of mon.equipment ?? []) normalizeItem(it);
  }

  // 難易度制(3幕30面×4)導入前のセーブ: 通しステージ番号を難易度+面へ分解する
  if (typeof state.difficulty !== "number" || !Array.isArray(state.maxStageD)) {
    const oldMax = Math.max(state.maxStage ?? 1, state.stage ?? 1);
    const diff = Math.min(DIFFICULTIES.length - 1, Math.floor((oldMax - 1) / STAGES_PER_DIFFICULTY));
    state.difficulty = diff;
    state.maxStageD = DIFFICULTIES.map((_, d) =>
      d < diff ? STAGES_PER_DIFFICULTY : d === diff ? ((oldMax - 1) % STAGES_PER_DIFFICULTY) + 1 : 1,
    );
    const oldCleared = state.bossClearedUpTo ?? 0;
    state.bossClearedD = DIFFICULTIES.map((_, d) =>
      d < diff
        ? STAGES_PER_DIFFICULTY
        : d === diff
          ? Math.max(0, Math.min(STAGES_PER_DIFFICULTY, oldCleared - diff * STAGES_PER_DIFFICULTY))
          : 0,
    );
    state.stage = state.maxStageD[diff];
    // 幕ボスの間で放置しないよう手前の面へ
    if (isBossStage(state.stage) && state.stage > state.bossClearedD[diff]) {
      state.stage = Math.max(1, state.stage - 1);
    }
    state.killsInStage = 0;
    delete state.maxStage;
    delete state.bossClearedUpTo;
  }
  // 配列の形を保証(将来の難易度追加にも耐える)
  state.maxStageD = DIFFICULTIES.map((_, d) =>
    Math.max(1, Math.min(STAGES_PER_DIFFICULTY, state.maxStageD?.[d] ?? 1)),
  );
  state.bossClearedD = DIFFICULTIES.map((_, d) =>
    Math.max(0, Math.min(STAGES_PER_DIFFICULTY, state.bossClearedD?.[d] ?? 0)),
  );
  state.stage = Math.max(1, Math.min(STAGES_PER_DIFFICULTY, state.stage ?? 1));
  // AB7救済(STAGES_PER_DIFFICULTY 30→100): 旧ルールで上の難易度に上がっていたセーブは
  // 新ルールでは解放条件(前難易度の10-10クリア=bossClearedD[D-1]>=100)を満たさず、
  // 実効ステージが跳ね上がってパーティが詰む。現在の難易度が未解放なら、解放済みの最高
  // 難易度へ落として救済する(その難易度の到達点へ、幕ボスの間は手前の面へ)。
  state.difficulty = Math.max(0, Math.min(DIFFICULTIES.length - 1, state.difficulty ?? 0));
  while (state.difficulty > 0 && state.bossClearedD[state.difficulty - 1] < STAGES_PER_DIFFICULTY) {
    state.difficulty -= 1;
    state.stage = Math.max(1, Math.min(STAGES_PER_DIFFICULTY, state.maxStageD[state.difficulty]));
    if (isBossStage(state.stage)) state.stage = Math.max(1, state.stage - 1);
  }
  // 図鑑・デイリーボス導入以前のセーブを正規化(図鑑は現所持から復元)
  if (!state.dex || typeof state.dex !== "object") state.dex = {};
  if (!state.dexEvo || typeof state.dexEvo !== "object") state.dexEvo = {};
  for (const m of Object.values(state.monsters ?? {})) {
    if (!m?.speciesId) continue;
    state.dex[m.speciesId] = true;
    // 進化記録(2026-08-13)の導入以前に進化させた子から系譜を復元する。
    // これが無いと「昔から育てている子ほど図鑑に進化後が出ない」ことになる。
    // 第2進化まで進んでいる子は、第1進化ぶんも見た扱いにする(必ず通った道)
    const st = evolveStage(m);
    for (let s = 1; s <= st; s++) {
      recordDexEvolution(state, m.speciesId, s, s === st ? m.evoSkin : null, m.job);
    }
  }
  if (!state.dailyBossUsed || typeof state.dailyBossUsed !== "object") state.dailyBossUsed = {};
  // 図鑑バフの解放制(2026-07-18)導入以前のセーブ: 未解放リストが無ければ空
  // (=全部解放済み扱い)。図鑑に無いIDが混ざっていたら掃除
  if (!state.dexUnclaimed || typeof state.dexUnclaimed !== "object") state.dexUnclaimed = {};
  for (const id of Object.keys(state.dexUnclaimed)) {
    if (!state.dex[id]) delete state.dexUnclaimed[id];
  }
  // タスモン枠(2026-07-18)導入以前のセーブ: 所持数がキャップを超えていたら
  // 所持数を包む位置まで無償で引き上げる(既存の子は絶対に取り上げない)
  {
    const owned = Object.keys(state.monsters ?? {}).length;
    if (owned > boxCapOf(state)) {
      state.boxCap = Math.max(
        BOX_CAP_BASE,
        Math.ceil(owned / BOX_CAP_STEP) * BOX_CAP_STEP,
      );
    }
  }

  // 装備導入以前のセーブを正規化
  if (!Array.isArray(state.items)) state.items = [];
  // 倉庫導入以前のセーブを正規化
  if (!Array.isArray(state.storage)) state.storage = [];
  migrateItems(state.storage);
  // 獲得履歴導入以前のセーブを正規化
  if (!Array.isArray(state.log)) state.log = [];
  // 宝箱導入以前のセーブを正規化
  if (!Array.isArray(state.chests)) state.chests = [];
  // 宝箱3種化以前のセーブ: 中身のレア度から種類を割り当てる(ウルトラ以上はボス箱あつかい)
  for (const c of state.chests) {
    if (!c.kind) {
      c.kind = c.item?.rarity === "common" ? "wood" : c.item?.rarity === "rare" ? "rare" : "boss";
    }
  }
  // 部位制以前のセーブ: 先頭オプションから部位を推定して付ける
  const normalizeParts = (items) => {
    for (const it of items ?? []) if (!it.part) it.part = inferPart(it);
  };
  normalizeParts(state.items);
  normalizeParts(state.storage);
  normalizeParts(state.chests.map((c) => c.item).filter(Boolean));
  // 基礎ステ制(2026-07-06)以前の装備: 先頭オプションを基礎ステあつかいにする
  const normalizeBase = (items) => {
    for (const it of items ?? []) {
      if (Array.isArray(it.opts) && it.opts.length > 0 && !it.opts.some((o) => o.base)) {
        it.opts[0].base = true;
      }
    }
  };
  normalizeBase(state.items);
  normalizeBase(state.storage);
  normalizeBase(state.chests.map((c) => c.item).filter(Boolean));
  // ボスの鍵: 数値スタック→個別アイテムへ移行(2026-07-13)。旧bossKeysは
  // 今の難易度の鍵に変換する
  if (!Array.isArray(state.keyItems)) state.keyItems = [];
  if (typeof state.bossKeys === "number" && state.bossKeys > 0) {
    for (let i = 0; i < state.bossKeys; i++) addBossKey(state, state.difficulty ?? 0);
  }
  delete state.bossKeys;
  delete state.lastEggAt; // 卵は撃破ごと抽選のみ(2026-08-12)。時間ゲート時代の遺物を掃除
  // 探索の複数パーティ化(2026-08-13): 旧セーブの単数形 state.expedition を配列へ移行。
  // 出発中の探索隊は monIds/開始時刻/時間そのままで1組目として引き継ぐ(損させない)
  if (!Array.isArray(state.expeditions)) {
    state.expeditions = state.expedition?.monIds?.length ? [state.expedition] : [];
  }
  delete state.expedition;
  // 最初の1匹3択の導入以前のセーブは選択ずみあつかい
  if (typeof state.starterChosen !== "boolean") state.starterChosen = true;
  // 記念コイン導入以前のセーブを正規化
  if (!state.coins || typeof state.coins !== "object") state.coins = {};
  delete state.materials; // 細工素材(2026-07-19の旧仕様)は同日v3で廃止=全ゴールド抽選に
  // コインの倉庫預け入れ導入以前のセーブを正規化
  if (!state.storageCoins || typeof state.storageCoins !== "object") state.storageCoins = {};
  // 叡智の水晶: 数値→個別アイテムへ移行(2026-07-13)
  if (!Array.isArray(state.crystalItems)) state.crystalItems = [];
  if (typeof state.respecTokens === "number" && state.respecTokens > 0) {
    for (let i = 0; i < state.respecTokens; i++) addCrystal(state);
  }
  delete state.respecTokens;
  if (state.settings && typeof state.settings.loopStage !== "number") state.settings.loopStage = null;
  // 倉庫拡張導入以前のセーブ: 今の所持数を下回らないページ数で初期化(200枠時代の救済)
  if (typeof state.storageCap !== "number") {
    state.storageCap = Math.max(
      STORAGE_BASE_CAP,
      Math.ceil((state.storage?.length ?? 0) / STORAGE_PAGE) * STORAGE_PAGE,
    );
  }
  // 旧40ページ制のセーブを新80ページ制のグリッドにスナップ(拡張コスト計算が整数になるように)
  state.storageCap =
    STORAGE_BASE_CAP + Math.round((state.storageCap - STORAGE_BASE_CAP) / STORAGE_PAGE) * STORAGE_PAGE;
  state.storageCap = Math.min(STORAGE_MAX_CAP, Math.max(STORAGE_BASE_CAP, state.storageCap));
  // 宝箱倉庫/自動開封の拡張(2026-07-21)導入以前のセーブを正規化
  if (typeof state.chestCapLv !== "number") state.chestCapLv = 0;
  state.chestCapLv = Math.min(CHEST_UPG_MAX, Math.max(0, state.chestCapLv));
  if (typeof state.autoOpenLv !== "number") state.autoOpenLv = 0;
  state.autoOpenLv = Math.min(CHEST_UPG_MAX, Math.max(0, state.autoOpenLv));
  // 卵スロット拡張導入以前のセーブを正規化
  if (typeof state.eggCap !== "number") state.eggCap = MAX_EGG_SLOTS;
  state.eggCap = Math.min(EGG_CAP_MAX, Math.max(MAX_EGG_SLOTS, state.eggCap));
  // 持ち物枠拡張(2026-07-08)導入以前のセーブを正規化
  if (typeof state.invCap !== "number") state.invCap = INV_CAP;
  state.invCap = Math.min(INV_CAP_MAX, Math.max(INV_CAP, state.invCap));
  // createdAt 導入(2026-07-15)以前のセーブ: 遊びはじめた時刻が分からないので、
  // 起点は現在にする(過小に出る=「新規」扱いになるだけで、実害は無い方向へ倒す)
  if (typeof state.createdAt !== "number" || !isFinite(state.createdAt)) state.createdAt = Date.now();
  // 設定導入以前のセーブを正規化
  if (!state.settings || typeof state.settings !== "object") state.settings = {};
  if (typeof state.settings.autoOpenChests !== "boolean") state.settings.autoOpenChests = false;
  if (typeof state.settings.cubeUseStorage !== "boolean") state.settings.cubeUseStorage = true;
  migrateItems(state.chests.map((c) => c.item).filter(Boolean));
  for (const monster of Object.values(state.monsters)) {
    if (!SPECIES[monster.speciesId]) return null;
    // 覚醒導入以前のセーブは awakening を持たない → 0 に正規化
    if (monster.awakening === undefined) monster.awakening = 0;
    // 覚醒6段化(2026-07-16)の移行: 旧n → 新2n に読み替える。
    // 新2/4/6 の倍率は旧1/2/3 と完全一致させてあるので、これで**強さは1ミリも変わらない**。
    // この移行を飛ばすと旧・三重覚醒(x60)が新・覚醒3(x8.4)の扱いになり -87% の後出し
    // ナーフになる(TBHがやって炎上した手口そのもの)。awRev で一度だけ実行する。
    if ((monster.awRev ?? 1) < 2) {
      monster.awakening = Math.min(AWAKEN_MAX, (monster.awakening ?? 0) * 2);
      monster.awRev = 2;
    }
    monster.awakening = Math.max(0, Math.min(AWAKEN_MAX, Math.round(monster.awakening)));
    if (!Array.isArray(monster.equipment)) monster.equipment = [];
    // 部位制移行: 装備中アイテムに部位を付け、同部位の2個目以降はインベントリ/倉庫へ返す
    for (const it of monster.equipment) if (!it.part) it.part = inferPart(it);
    const seenParts = new Set();
    const kept = [];
    for (const it of monster.equipment) {
      if (seenParts.has(it.part)) {
        if (state.items.length < invCapOf(state)) state.items.push(it);
        else state.storage.push(it);
      } else {
        seenParts.add(it.part);
        kept.push(it);
      }
    }
    monster.equipment = kept;
    if (!Array.isArray(monster.perks)) monster.perks = [];
    // 兆しポイント制以前のセーブ: 廃止した強化版兆しを基本版に読み替える
    for (const p of monster.perks) {
      if (p.id === "atk2") p.id = "atk";
      if (p.id === "hp2") p.id = "hp";
    }
    // スフィア盤(2026-07-10)以前のセーブ: 消費ポイント=perks件数として初期化。
    // 旧perksはそのまま効果を持ち続ける(レガシー加算)。盤面は白紙から。
    if (monster.perkSpent == null) monster.perkSpent = monster.perks.length;
    if (!monster.sphere || !Array.isArray(monster.sphere.taken)) monster.sphere = { taken: [], rev: SPHERE_BOARD_REV };
    // 盤面改版(v2→v3等)で消えたノード: 解放を取り下げてポイントを返金し、
    // そのノード由来の効果perksも取り除く(取り損・二重取りの両方を防ぐ)
    const validTaken = monster.sphere.taken.filter((id) => SPHERE_NODES[id]);
    const removedNodes = monster.sphere.taken.length - validTaken.length;
    monster.sphere.taken = validTaken;
    if (removedNodes > 0) {
      monster.perks = monster.perks.filter((p) => !p.node || SPHERE_NODES[p.node]);
      monster.perkSpent = Math.max(0, monster.perkSpent - removedNodes);
    }
    // 盤面のステータス塗り替え(SPHERE_BOARD_REV): ノードIDは同じでも中身(grants)が変割った
    // 改版では、ノード由来のperksを全返金して白紙に(旧statのperkが残る不整合を防ぐ)
    if ((monster.sphere.rev ?? 1) !== SPHERE_BOARD_REV) {
      const nodeTaken = monster.sphere.taken.length;
      if (nodeTaken > 0) {
        monster.perks = monster.perks.filter((p) => !p.node);
        monster.perkSpent = Math.max(0, monster.perkSpent - nodeTaken);
        monster.sphere.taken = [];
      }
      monster.sphere.rev = SPHERE_BOARD_REV;
    }
    // スキル習得/セット導入以前のセーブを正規化
    const baseSkill = SPECIES[monster.speciesId].skillId;
    if (!Array.isArray(monster.learnedSkills) || monster.learnedSkills.length === 0) {
      monster.learnedSkills = [baseSkill];
    }
    monster.learnedSkills = monster.learnedSkills.filter((id) => SKILLS[id]);
    if (!monster.learnedSkills.includes(baseSkill)) monster.learnedSkills.unshift(baseSkill);
    if (!Array.isArray(monster.equippedSkills) || monster.equippedSkills.length === 0) {
      monster.equippedSkills = [baseSkill];
    }
    monster.equippedSkills = monster.equippedSkills.filter((id) =>
      monster.learnedSkills.includes(id),
    );
    // 進化ジョブ: 未知のジョブID(将来の改廃)は落として未進化に戻す
    if (monster.job && !JOBS[monster.job]) delete monster.job;
    // 進化スキン(2026-07-11): 導入前のセーブ/未知の種族IDは決定的に選び直す
    if (monster.evoSkin && !SPECIES[monster.evoSkin]) delete monster.evoSkin;
    if (monster.job && !monster.evoSkin) {
      monster.evoSkin = evoSkinFor(monster, monster.job, evolveStage(monster));
    }
    if (monster.equippedSkills.length === 0) monster.equippedSkills = [baseSkill];
    // +値/スキル節目カウンタ導入(2026-07-07 DQMリワーク)以前のセーブ:
    // +値は0、節目カウンタは「基本スキル以外=全部節目で覚えた」とみなす
    if (typeof monster.plus !== "number") monster.plus = 0;
    if (typeof monster.skillPicks !== "number") {
      monster.skillPicks = Math.max(0, monster.learnedSkills.length - 1);
    }
    migrateItems(monster.equipment);
    normalizeBase(monster.equipment);
  }
  if (!state.recipesFound || typeof state.recipesFound !== "object") {
    state.recipesFound = {};
  }
  // キューブレベル・装備レベル導入(2026-07-07)以前のセーブを正規化
  if (!state.cube || typeof state.cube !== "object") state.cube = { level: 1, exp: 0 };
  state.cube.level = Math.max(1, Math.min(CUBE_LEVEL_MAX, Math.round(state.cube.level ?? 1)));
  state.cube.exp = Math.max(0, state.cube.exp ?? 0);
  // 装備レベルが無い旧アイテムはLv.1帯として扱う
  for (const it of [...state.items, ...state.storage, ...state.chests.map((c) => c.item).filter(Boolean)]) {
    if (typeof it.lv !== "number") it.lv = 1;
  }
  for (const m of Object.values(state.monsters ?? {})) {
    for (const it of m.equipment ?? []) if (typeof it.lv !== "number") it.lv = 1;
  }
  // シリアル刻印導入以前のセーブ: 既存の刻印番号の最大値からカウンタを復元(重複回避)
  if (typeof state.mintSeq !== "number") {
    let maxMint = 0;
    const scan = (arr) => { for (const o of arr ?? []) if (typeof o?.mintNo === "number") maxMint = Math.max(maxMint, o.mintNo); };
    scan(Object.values(state.monsters ?? {}));
    scan(state.items); scan(state.storage);
    scan((state.chests ?? []).map((c) => c.item).filter(Boolean));
    for (const m of Object.values(state.monsters ?? {})) scan(m.equipment);
    state.mintSeq = maxMint;
  }
  // 試用システム(2026-07-22): 不採用が確定した試用コンテンツの実体を回収して
  // ゴールド補償に変える。判定はTRIALSのstatus="rejected"(週次ビルドが更新)。
  // ロード時に毎回走るが、該当が無ければ何もしない(冪等)
  {
    const reaped = reapRejectedTrials(state);
    if (reaped.items + reaped.mons > 0) state.trialReapNotice = reaped; // UIが起動時に1回だけ見せる
  }
  return state;
}
