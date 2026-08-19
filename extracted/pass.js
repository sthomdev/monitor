// タスモンパス(バトルパス)。2026-07-20 DLC計画で方向性承認、まず無料トラックを実装。
//   ・シーズン=28日(週次コンテンツ4本ぶん)。任務(デイリー/ウィークリー)でパスEXP
//   ・無料トラック: ゴールド/ボスの鍵/叡智の水晶+最終30段のみウルトラ確定の卵(2026-07-21 FB)。
//     コインは入れない(プレミアム側の売り)
//   ・プレミアム: 卵(通常段=コモン→レア→ウルトラと段階的/節目=レア度保証)+コイン+限定テーマ+称号。
//     ゴールドは配らない(2026-07-20 FB)。DLC所有で解錠
//     (Steam DLC接続は後続。それまでは一覧表示のみ・受け取り不可)
//   ・報酬は全段「確定表示」(ランダム性なし=ルートタスモン規制リスクを作らない)
// 経済観: 無料トラックの総ゴールド=44.4Mは ヘル1.2日ぶん(36M/日)。番人の20日目標に
// 影響しない周回資源が主体。例外は30段のウルトラ卵1個/シーズン(天然入手量に対し誤差。
// POWER_REGISTRY.passKeys に中立登録済み=台帳はそちら)
import {
  addBossKey, addCrystal, bossKeyCount, BOSS_KEY_CAP, keyLabelOf, eggCapOf,
  expeditionCapOf, EXPEDITION_SLOT_MAX,
} from "./state.js";
import { bumpMissionCounter } from "./missions.js";
import { makeEgg } from "./eggs.js";
import { RARITY_ORDER } from "./data.js";

// プレミアムパスの卵は「表記レア度以上確定」(2026-07-29 FB)。
// 3%で1段上のレア度に上振れする — 表記は下限なので約束を破らない(いつも得しかない)。
// 最上位(セレスティアル)はそれ以上が無いのでそのまま
export const PASS_EGG_UPGRADE_CHANCE = 0.03;
export function rollPassEggRarity(base, rng = Math.random) {
  const i = RARITY_ORDER.indexOf(base);
  if (i >= 0 && i < RARITY_ORDER.length - 1 && rng() < PASS_EGG_UPGRADE_CHANCE) {
    return RARITY_ORDER[i + 1];
  }
  return base;
}
import { dlcOwned } from "./dlc.js";

// プレミアムの「記念コイン」はどの種類か。金=一番下の等級で、実測1万撃破に1枚級の貴重品。
// 上位(白金以上)をパスで毎シーズン配ると、コインの希少度そのものが壊れる
export const PASS_COIN_ID = "gold";

export const PASS_SEASON = Object.freeze({ id: 1, name: "シーズン1", days: 28 });
export const PASS_TIER_EXP = 300; // 1段に必要なEXP(全任務の75%でMAX=25%サボってもOKな緩さ)
export const PASS_MAX_TIER = 30;

// 任務(デイリーは毎日0時、ウィークリーは月曜にリセット)。
// 放置ゲーなので「回収するだけでも進む」ゆるさに寄せる
export const PASS_QUESTS = Object.freeze({
  daily: [
    { id: "kills", label: "敵を 300体倒す", goal: 300, exp: 100 },
    { id: "chests", label: "宝箱を 20個開ける", goal: 20, exp: 100 },
    { id: "hatch", label: "卵を 1個孵す", goal: 1, exp: 100 },
  ],
  weekly: [
    { id: "boss", label: "幕ボスを 5回倒す", goal: 5, exp: 300 },
    { id: "exped", label: "探索を 合計18時間分受け取る", goal: 18, exp: 300 }, // 時間制(2026-07-21 FB: 回数制だと3hと12hが同価値になる)
    { id: "craft", label: "合成を 9回する", goal: 9, exp: 300 },
  ],
});

// 無料トラック(30段・確定表示)。卵は最終30段のみ/コインは入れない(それ以外はプレミアム側の売り)
// gold は段が進むほど増える(1段20万 → 30段300万、合計44.55M。ガードテストが固定)
// 2026-08-09 Haru指示「無料の最初の報酬は15万ゴールドに」: 1段目のみ5万→15万に底上げ
// 2026-08-10 Haru指示「最初のバトルパスの無料報酬は20万Gに」: 15万→20万にさらに底上げ
// (2段目の到達額150万より低いままなので、以降のカーブとの逆転は起きない)
export function passFreeReward(tier) {
  if (tier === 30) return { egg: "ultra", gold: 3_000_000 }; // 最終段: ウルトラ確定の卵(2026-07-21 FB)
  if (tier % 10 === 0) return { crystal: 1, gold: tier * 100_000 }; // 10/20段: 叡智の水晶
  if (tier % 5 === 0) return { key: 1, gold: tier * 80_000 }; // 5/15/25段: ボスの鍵
  if (tier === 1) return { gold: 200_000 };
  return { gold: 50_000 + (tier - 1) * 100_000 };
}

// プレミアムトラック(2026-07-21 FB改訂: 卵の比率を下げ、水晶/ボスの鍵を混ぜる。
// 卵はコモン→レア→ウルトラと後半ほど良く、ウルトラは21段から。報酬は全段この表で確定。
// **確定表示=初日固定**なのでスナップショットのガードテストとセットで変更する
export const PASS_PREMIUM_TRACK = Object.freeze([
  /* 1*/ { egg: "common", label: "コモン確定の卵" },
  /* 2*/ { egg: "common", label: "コモン確定の卵" },
  /* 3*/ { coin: 1, egg: "common", label: "記念コイン+コモン確定の卵" },
  /* 4*/ { key: 1, label: "ボスの鍵" },
  /* 5*/ { coin: 1, label: "記念コイン" },
  /* 6*/ { egg: "common", label: "コモン確定の卵" },
  /* 7*/ { crystal: 1, label: "叡智の水晶" },
  /* 8*/ { egg: "common", label: "コモン確定の卵" },
  /* 9*/ { coin: 1, egg: "rare", label: "記念コイン+レア確定の卵" },
  /*10*/ { egg: "legend", label: "レジェンド確定の卵" },
  /*11*/ { egg: "rare", label: "レア確定の卵" },
  /*12*/ { coin: 1, egg: "rare", label: "記念コイン+レア確定の卵" },
  /*13*/ { key: 1, label: "ボスの鍵" },
  /*14*/ { crystal: 1, label: "叡智の水晶" },
  /*15*/ { coin: 3, label: "記念コイン×3" },
  /*16*/ { egg: "rare", label: "レア確定の卵" },
  /*17*/ { egg: "rare", label: "レア確定の卵" },
  /*18*/ { coin: 1, egg: "rare", label: "記念コイン+レア確定の卵" },
  /*19*/ { egg: "rare", label: "レア確定の卵" },
  /*20*/ { egg: "immortal", label: "イモータル確定の卵" },
  /*21*/ { coin: 1, egg: "ultra", label: "記念コイン+ウルトラ確定の卵" },
  /*22*/ { key: 1, label: "ボスの鍵" },
  /*23*/ { egg: "ultra", label: "ウルトラ確定の卵" },
  /*24*/ { coin: 1, egg: "ultra", label: "記念コイン+ウルトラ確定の卵" },
  /*25*/ { theme: "baroque", label: "限定UIテーマ「黄金のバロック」" },
  /*26*/ { egg: "ultra", label: "ウルトラ確定の卵" },
  /*27*/ { coin: 1, crystal: 1, label: "記念コイン+叡智の水晶" },
  /*28*/ { crystal: 1, label: "叡智の水晶" },
  /*29*/ { egg: "ultra", label: "ウルトラ確定の卵" },
  // 30段目=最終報酬(2026-07-22 FB「有料バトルパスに探索パーティ1枠追加できる権利を最後に」)。
  // **探索枠の上限(EXPEDITION_SLOT_MAX)は動かさない**ので、到達できる戦力の天井は
  // 無料と同じ。有料側が得るのは「ゴールドで買うはずの1枠がタダになる」時短であって、
  // 無料勢が一生届かない領域ではない(難易度番人のPOWER_REGISTRYに同じ理由で登録済み)
  // 2026-07-22 FB「最後の報酬からアルカナの卵削除して」: 30段は探索枠のみ。
  // アルカナ級の卵は月1個級の希少枠(2026-07-13確定)なので、パスで毎シーズン
  // 確定配布すると希少度の設計が崩れる
  /*30*/ { expedSlot: 1, label: "探索パーティ+1枠" },
]);
export function passPremiumReward(tier) {
  return PASS_PREMIUM_TRACK[tier - 1] ?? { label: "?" };
}

// ---- 日付キー(ローカル時刻基準・テストのため now を注入可能) ----
export function passDayKey(now = Date.now()) {
  const d = new Date(now);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function passWeekKey(now = Date.now()) {
  // 月曜はじまりの週番号(エポックは木曜開始なので+4日ずらす)
  return `W${Math.floor((now / 86400000 + 4) / 7)}`;
}

// パス状態の初期化+日次/週次のロールオーバー。全ての入口でこれを通す
export function passState(state, now = Date.now()) {
  if (!state.pass || state.pass.season !== PASS_SEASON.id) {
    state.pass = {
      season: PASS_SEASON.id,
      startedAt: now,
      exp: 0,
      claimedFree: [],
      claimedPremium: [],
      daily: null,
      weekly: null,
    };
  }
  const day = passDayKey(now);
  if (state.pass.daily?.key !== day) state.pass.daily = { key: day, progress: {}, done: [] };
  const week = passWeekKey(now);
  if (state.pass.weekly?.key !== week) state.pass.weekly = { key: week, progress: {}, done: [] };
  return state.pass;
}

export function passTier(state) {
  return Math.min(PASS_MAX_TIER, Math.floor((state.pass?.exp ?? 0) / PASS_TIER_EXP));
}

export function passRemainDays(state, now = Date.now()) {
  const end = (state.pass?.startedAt ?? now) + PASS_SEASON.days * 86400000;
  return Math.max(0, Math.ceil((end - now) / 86400000));
}

// 任務の進捗を進める。ゴール到達の瞬間にパスEXPを自動付与(受け取り操作は不要)。
// 返り値: 今回ゴールした任務の配列(UIのトースト用)
export function passProgress(state, questId, n = 1, now = Date.now()) {
  // ミッションの生涯カウンタを相乗り(2026-07-31)。パス任務の呼び出し現場=
  // 全イベントの現場なので、ここで数えれば新しい配線が要らない。
  // daily/weekly の達成状況とは無関係に必ず数える(ミッションはリセットされない)
  bumpMissionCounter(state, questId, n);
  const p = passState(state, now);
  const completed = [];
  for (const [slotName, quests] of [["daily", PASS_QUESTS.daily], ["weekly", PASS_QUESTS.weekly]]) {
    const q = quests.find((x) => x.id === questId);
    if (!q) continue;
    const slot = p[slotName];
    if (slot.done.includes(questId)) continue;
    slot.progress[questId] = Math.min(q.goal, (slot.progress[questId] ?? 0) + n);
    if (slot.progress[questId] >= q.goal) {
      slot.done.push(questId);
      p.exp += q.exp;
      completed.push(q);
    }
  }
  return completed;
}

// 無料トラックの受け取り。tierは1始まり
export function passClaimFree(state, tier, now = Date.now()) {
  const p = passState(state, now);
  if (tier < 1 || tier > PASS_MAX_TIER) return { error: "その段は ない" };
  if (passTier(state) < tier) return { error: "まだ その段に届いていない" };
  if (p.claimedFree.includes(tier)) return { error: "この報酬は 受け取りずみ" };
  const r = passFreeReward(tier);
  // 鍵/卵の上限チェックは「あらゆる副作用より前」に(先にゴールドを配ると、
  // エラー→再試行のたびに二重付与される。2026-07-20 レビュー指摘#10)
  if (r.key && bossKeyCount(state, state.difficulty ?? 0) >= BOSS_KEY_CAP) {
    return { error: `${keyLabelOf(state.difficulty ?? 0)}は もう${BOSS_KEY_CAP}本 持っている(倉庫に逃がしてから受け取って)` };
  }
  if (r.egg && (state.eggs?.length ?? 0) >= eggCapOf(state)) {
    return { error: "卵の枠が 満杯(卵タブで孵してから受け取って)" };
  }
  if (r.gold) state.gold += r.gold;
  if (r.key) addBossKey(state, state.difficulty ?? 0);
  if (r.crystal) addCrystal(state);
  let egg = null; // 生成した卵は戻り値でも返す(UI側の演出用。「配列末尾=今の卵」の暗黙依存を作らない)
  if (r.egg) {
    egg = makeEgg(r.egg); // レア度確定の卵(30段=ウルトラ 2026-07-21)
    state.eggs.push(egg);
  }
  p.claimedFree.push(tier);
  return { reward: r, tier, egg };
}

// プレミアムトラックの受け取り(2026-07-26 FB「A: 8/10からプレミアムパスを売る」)。
//
// これが無い間、パス窓は所有していても「発売準備中」と出るだけで1つも受け取れなかった。
// 売る以上は必須。無料側(passClaimFree)と同じ規約で書く:
//   ・**副作用より前に全部の上限チェック**を済ませる。先に配ってから弾くと、
//     エラー→再試行のたびに二重付与される(2026-07-20 レビュー指摘#10と同じ轍)
//   ・受け取り済みは claimedPremium に段番号で記録(state側に既に器がある)
//
// 後から買った人が、既に到達ずみの段をさかのぼって受け取れる形にしてある
// (バトルパスの一般的な挙動。買った瞬間に取り逃しが確定するのは体験として最悪)。
export function passClaimPremium(state, tier, now = Date.now()) {
  const p = passState(state, now);
  if (tier < 1 || tier > PASS_MAX_TIER) return { error: "その段は ない" };
  if (!passPremiumOwned(state)) return { error: "プレミアムを 持っていない" };
  if (passTier(state) < tier) return { error: "まだ その段に届いていない" };
  if (p.claimedPremium.includes(tier)) return { error: "この報酬は 受け取りずみ" };
  const r = passPremiumReward(tier);

  // ---- ここから下に副作用を書かない(上限チェックを全部先に済ませる) ----
  if (r.key && bossKeyCount(state, state.difficulty ?? 0) >= BOSS_KEY_CAP) {
    return { error: `${keyLabelOf(state.difficulty ?? 0)}は もう${BOSS_KEY_CAP}本 持っている(倉庫に逃がしてから受け取って)` };
  }
  if (r.egg && (state.eggs?.length ?? 0) >= eggCapOf(state)) {
    return { error: "卵の枠が 満杯(卵タブで孵してから受け取って)" };
  }
  if (r.expedSlot && expeditionCapOf(state) >= EXPEDITION_SLOT_MAX) {
    return { error: "探索枠は これが 最大" };
  }

  // ---- 付与 ----
  if (r.coin) {
    state.coins = state.coins ?? {};
    state.coins[PASS_COIN_ID] = (state.coins[PASS_COIN_ID] ?? 0) + r.coin;
  }
  if (r.key) addBossKey(state, state.difficulty ?? 0);
  if (r.crystal) addCrystal(state);
  if (r.expedSlot) state.expedCap = expeditionCapOf(state) + r.expedSlot;
  let egg = null; // 生成した卵は戻り値でも返す(UIの演出用。「配列末尾=今の卵」の暗黙依存を作らない)
  if (r.egg) {
    // 3%で1段上のレア度に上振れ(2026-07-29 FB「〜以上確定に。3%くらいで1個上位」)
    const rarity = rollPassEggRarity(r.egg);
    egg = makeEgg(rarity);
    if (rarity !== r.egg) egg.passUpgraded = true; // UIが「上振れ!」を祝うための印
    state.eggs.push(egg);
  }
  // テーマ(限定UIスキン)は付与するものが無い。所有しているあいだ選べる実行時判定なので
  // (dlc.js の設計どおり返金で自動的に消える)、ここでは受け取り済みの印だけを付ける
  p.claimedPremium.push(tier);
  return { reward: r, tier, egg, coin: r.coin ? PASS_COIN_ID : null };
}

// プレミアムの所有。判定の実体は dlc.js の1箇所に集約(2026-07-21)。
// Steam接続時は setDlcProvider(BIsDlcInstalled) を差し替えるだけで本番化する。
// 返金で所有が消えたら即座にfalseに戻る(保存値を信用しない設計)。
// 戦闘時間1.1倍(2026-07-24 FB「有料バトルパスに戦闘時間1.1倍機能つけて」)。
// 戦闘ロジックの経過時間を1.1倍で進める=撃破ペース+10%の時短。
// 敵味方の行動が同率で速くなるので戦闘の有利不利は変わらない(難易度中立・
// POWER_REGISTRY.passKeys.battleSpeed に登録済み)。実時間ゲート(卵/宝箱CD/探索)は対象外
export const PASS_BATTLE_SPEED = 1.1;
export function battleSpeedOf(state) {
  return passPremiumOwned(state) ? PASS_BATTLE_SPEED : 1;
}

export function passPremiumOwned(state) {
  return dlcOwned(state, "premiumPass");
}
