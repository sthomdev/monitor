// ゲームバランスの定数と種族データ。
// 数値を変更したら test/ の期待値テストも必ず確認すること(経済に直結する値のため)。

// 自動生成コンテンツ(週次/隔週アップデート)。SPECIES/SKILLS/HATCH_TABLE/PERKS/JOBS/
// DIFFICULTIES/スフィア盤/レベル上限/報酬係数にマージする(2026-07-11 自動アップデート網)。
import {
  EXTRA_SKILLS,
  EXTRA_SPECIES,
  EXTRA_EQUIPMENT,
  EXTRA_PERKS,
  EXTRA_JOBS,
  EXTRA_SPHERE,
  EXTRA_TUNING,
  EXTRA_EXPEDITION_SPOTS,
  EXTRA_DAILY_BOSSES,
  EXTRA_MAILS,
} from "./content-pack.js";

// ---- ライブ調整(隔週の自動バランス調整の受け口 2026-07-11) ----
// 生成器(gen-balance)が書く係数を安全帯にクランプして適用する。ゲートはtest+balance-sim。
const clampNum = (v, lo, hi, d) => (typeof v === "number" && isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);
export const LIVE_TUNING = Object.freeze({
  goldMult: clampNum(EXTRA_TUNING.goldMult, 0.8, 1.25, 1), // 報酬ゴールド係数
  expMult: clampNum(EXTRA_TUNING.expMult, 0.8, 1.25, 1), // 報酬EXP係数
  bossGoldMult: clampNum(EXTRA_TUNING.bossGoldMult, 0.8, 1.5, 1), // ボス報酬(金)の追加係数
  bossExpMult: clampNum(EXTRA_TUNING.bossExpMult, 0.8, 1.5, 1), // ボス報酬(EXP)の追加係数
});
// ---- 難易度較正ノブ(2026-07-18 恒久指示「トーメント全クリ=20日を死守」) ----
// tools/difficulty-guard.js --fix が自動で書き換える唯一の調整点。手で触らない。
// 装備/システム/ステータス追加でクリア日数がずれたら、ここのEXP係数で20日へ戻す
// (ゲート: test/difficulty-guard.test.mjs が毎回検証し、死守帯の外なら赤)。
export const PACE_CALIBRATION = Object.freeze({
  expMult: 0.856, // guard:pace-calibration(この行をツールが書き換える)
});
export const EXPEDITION_SPOTS_PACK = Object.freeze(EXTRA_EXPEDITION_SPOTS);
export const DAILY_BOSSES_PACK = Object.freeze(EXTRA_DAILY_BOSSES);

export const RARITY = Object.freeze({
  COMMON: "common",
  RARE: "rare",
  ULTRA: "ultra",
  LEGEND: "legend",
  IMMORTAL: "immortal",
  ARCANA: "arcana",
  BEYOND: "beyond",
  CENTURY: "century",
  COSMIC: "cosmic",
  CELESTIAL: "celestial", // コズミックの上の最高峰(2026-07-06追加)
});

export const RARITY_ORDER = [
  RARITY.COMMON,
  RARITY.RARE,
  RARITY.ULTRA,
  RARITY.LEGEND,
  RARITY.IMMORTAL,
  RARITY.ARCANA,
  RARITY.BEYOND,
  RARITY.CENTURY,
  RARITY.COSMIC,
  RARITY.CELESTIAL,
];

// ---- レア度ごとの種族数の上限(2026-07-15 目安箱システムの安全装置) ----
// 種族数の配分は「コモンが最多・セレスティアルが最少」の階段型でなければならない。
// レア度内の種族は均等抽選(eggs.js)なので、上位の種族数が増えるほど
// 「特定の1体を引く確率」が薄まる = マーケットのチェイス価値が削れるため。
//
// 上限を絶対値の表で持つと、いずれ頭打ち = 実質的な永久凍結になる。そこで
// 「1つ下のレア度の N% 以下」という比率で導出し、階段の"形"だけを恒久ルールにする。
// コモンの枠(RARITY_CAP_COMMON)だけが伸び、上位はそれに連動して自動的に開く。
// つまり上位を増やしたければ下位を先に育てる必要があり、目安箱に必ず来る
// 「もっと強いキャラを」の声は、まず下位の追加として消化される(構造による整流)。
//
// 実測(2026-07-15): 手書き55 + 週次自動生成101 = 156種。gen-content.js が
// レア度を均等ランダムで選んでいたため階段が崩れ、センチュリー5 < コズミック6 と
// 逆転していた。既存種は削除できない(マーケットで金銭が動いている可能性がある)ので、
// 追加のみで階段を復元する = 下位に空きを作って上位を追い越させる。
export const RARITY_CAP_RATIO = Object.freeze({
  [RARITY.RARE]: 0.9,
  [RARITY.ULTRA]: 0.8,
  [RARITY.LEGEND]: 0.82,
  [RARITY.IMMORTAL]: 0.84,
  [RARITY.ARCANA]: 0.85,
  [RARITY.BEYOND]: 0.85,
  // チェイス帯は急に絞る(既存の設計意図を維持: century/beyond = 5/13 ≒ 0.38)
  [RARITY.CENTURY]: 0.7,
  [RARITY.COSMIC]: 0.7,
  [RARITY.CELESTIAL]: 0.45,
});

// コモン枠の上限。隔週アップデートで rarityCapBonus が積み上がると全レア度が連動して開く
// (levelCapBonus と同じパターン)。38 = 現在のコモン31に対し +7 の空きを持たせた初期値。
export const RARITY_CAP_COMMON = 38 + clampNum(EXTRA_TUNING.rarityCapBonus, 0, 60, 0);

// コモン枠から各レア度の上限を導出する。返り値は必ず単調減少になる。
export function rarityCaps(commonCap = RARITY_CAP_COMMON) {
  const out = { [RARITY.COMMON]: commonCap };
  let prev = commonCap;
  for (const r of RARITY_ORDER.slice(1)) {
    out[r] = Math.round(prev * RARITY_CAP_RATIO[r]);
    prev = out[r];
  }
  return out;
}

// レア度の見た目メタ(色・ラベル・星の数)。UI全体で共有する。
export const RARITY_META = Object.freeze({
  common: { label: "コモン", color: "#b9c2cf", glow: "rgba(185,194,207,0.45)", stars: 1 },
  rare: { label: "レア", color: "#5aa9e6", glow: "rgba(90,169,230,0.6)", stars: 2 },
  ultra: { label: "ウルトラ", color: "#b57bff", glow: "rgba(181,123,255,0.7)", stars: 3 },
  legend: { label: "レジェンド", color: "#ffcf4a", glow: "rgba(255,207,74,0.85)", stars: 4 },
  immortal: { label: "イモータル", color: "#ff5a4a", glow: "rgba(255,90,74,0.85)", stars: 5 },
  arcana: { label: "アルカナ", color: "#e858c8", glow: "rgba(232,88,200,0.85)", stars: 6 },
  beyond: { label: "ビヨンド", color: "#4ae0d0", glow: "rgba(74,224,208,0.85)", stars: 7 },
  century: { label: "センチュリー", color: "#e6ecff", glow: "rgba(230,236,255,0.95)", stars: 8 },
  cosmic: { label: "コズミック", color: "#ad4aff", glow: "rgba(173,74,255,0.95)", stars: 9 },
  celestial: { label: "セレスティアル", color: "#fff6d8", glow: "rgba(255,246,216,1)", stars: 10 },
});

// ---- 属性 ----
// 火水風土の四すくみ(炎→風→土→水→炎)+光闇(相互に強い)。
// 有利属性で殴ると +35%、不利だと -25%。敵からの被ダメージは属性の影響を受けない
// (「詰まない」設計: 相性は攻略を速くする手段であって、詰ませる罰にはしない)。
export const ELEMENTS = Object.freeze({
  FIRE: "fire",
  WATER: "water",
  WIND: "wind",
  EARTH: "earth",
  LIGHT: "light",
  DARK: "dark",
});

export const ELEMENT_META = Object.freeze({
  fire: { label: "炎", color: "#ff6a2a" },
  water: { label: "水", color: "#5bc0eb" },
  wind: { label: "風", color: "#8ae08a" },
  earth: { label: "土", color: "#c08038" },
  light: { label: "光", color: "#ffe066" },
  dark: { label: "闇", color: "#b57bff" },
});

// 攻撃側→有利な相手。光と闇は互いに有利(殴り合いはどちらも加速する)。
export const ELEMENT_ADVANTAGE = Object.freeze({
  fire: "wind",
  wind: "earth",
  earth: "water",
  water: "fire",
  light: "dark",
  dark: "light",
});

// 相性は「編成を考える理由」になるよう強め(有利1.5倍・不利0.55倍)。
// 同格の不利編成は壁になり、有利編成なら突破できる。超レアは素のステ差で貫通できる(力技ルート)。
export const ELEMENT_ADV_MULT = 1.5;
export const ELEMENT_DIS_MULT = 0.55;

// ---- タイプ(役割)相性 (2026-07-08) ----
// 属性に加えて「役割(アタッカー/ヒーラー/タンク/バッファー)」にも得意不得意を持たせ、
// いろんな役割のタスモンを揃える理由(コレクション性)を作る。属性より控えめ(1.3/0.8)で、
// 属性=主軸・タイプ=副軸の二層相性にする。攻撃側の役割→有利を取る相手の役割の環状。
// アタッカー→ヒーラー→タンク→バッファー→アタッカー(火力は回復を、回復は壁を、壁は支援を、支援は火力を制す)
export const ROLE_KEYS = Object.freeze(["nuke", "heal", "guard", "buff"]);

// ---- 防御系の恒久上限(2026-07-18 FB「タンクが強すぎ。ウルトラ弱個体で
// トーメントほぼノーダメ」) ----
// 回復に HEAL_CAP_PER_SEC(3.5%/秒)を入れたとき、バリア(shield)と軽減(かばう×防具)を
// 対象外にしていたのが穴だった: バリア60%/14秒 = パーティ最大HPの4.3%/秒の無償吸収が
// 回復上限と合算されて最悪被ダメ(実効200で7.7%/秒)を上回り、さらに かばう85%×防具50%の
// 多重軽減で通しダメージが7.5%まで落ちる → 目安戦力の1割以下でも文字通り無敵だった。
// バリアの吸収も「毎秒レート」で頭打ちにする: プール ≦ 最大HP × 1.25% × CD秒
// (1.25%は既存の小型バリア(10%/8秒)を無傷で通す線。突出した大型だけが削られる)。
export const SHIELD_CAP_PER_SEC = 0.0125;
// かばう系(被ダメ軽減)の1スキル上限(旧0.85)
export const GUARD_CUT_CAP = 0.6;
// かばう×防具を合わせた通しダメージの下限倍率(=合算軽減は60%まで)。
// 属性耐性(×0.7)は戦略ルートの報酬なのでこの外側に残す
export const DEFENSE_REDUCTION_FLOOR = 0.4;
export const ROLE_ADVANTAGE = Object.freeze({
  nuke: "heal", // アタッカーはヒーラーに強い(回復を上回る瞬間火力)
  heal: "guard", // ヒーラーはタンクに強い(粘り勝ち)
  guard: "buff", // タンクはバッファーに強い(バフを耐えしのぐ)
  buff: "nuke", // バッファーはアタッカーに強い(味方を強化して押し切る)
});
// 2026-07-12 FB「ジョブの得意・不得意は削除」: 倍率を1に(相性は属性の一層のみ)。
// ROLE_ADVANTAGE等の定義は互換のため残すが、ダメージには一切影響しない。
export const ROLE_ADV_MULT = 1;
export const ROLE_DIS_MULT = 1;

// 攻撃側の役割 atk が防御側の役割 def に与えるダメージ倍率(現在は常に1)。
export function roleMult() {
  return 1;
}

// 攻撃属性 atk が防御属性 def に与えるダメージ倍率。
export function elementMult(atk, def) {
  if (!atk || !def) return 1;
  if (ELEMENT_ADVANTAGE[atk] === def) return ELEMENT_ADV_MULT;
  if (ELEMENT_ADVANTAGE[def] === atk) return ELEMENT_DIS_MULT;
  return 1;
}

// 敵の属性。2026-07-07に全6属性へ拡張(新アートが火水風土闇光全て揃ったため)。
// 先頭4つの並びは旧セーブ・旧ログ互換のため変えない(末尾に土・光を追加)。
// これで土・光の味方も敵カウンターに使える=全属性が攻略で意味を持つ。
export const ENEMY_ELEMENTS = ["water", "wind", "fire", "dark", "earth", "light"];

// 敵の見た目ティア(0=小型/1=獣/2=鎧・ゴーレム/3=竜)。難易度が上がるごとに1段階
// 強そうな姿になる(ノーマル=雑魚→トーメント=竜)。実効ステージ(難易度×30+面)で決まる。
export function enemyTier(effStage) {
  return Math.max(0, Math.min(3, Math.floor((effStage - 1) / 30)));
}

// ステージの支配属性(幕=10面ごとに固定)。ウェーブの大半+ボスがこの属性になる。
// 2026-07-13 FB「幕ごとに出現する属性を固定して。キャラを入れ替えなくちゃいけない
// めんどくささをなくして。ステージごとに変えるのは放置ゲームとの相性悪い」
// → 編成の見直しは幕の切り替わり(10面ごと)だけでよい設計に変更。
// 2026-07-13 FB追記「第3幕くらいまでは属性闇固定でいい」→ 第1〜3幕=闇
// (3スターター全員が等倍。序盤はパーティ作りに集中でき、属性の授業は第4幕から)。
// 第4幕以降は 風→水→光→火→土→闇 のループ。被ダメにも属性補正がある
// (battle.js partyDefenseMult: 弱点編成は痛い/耐性編成は硬い)ので、
// 幕の属性に合わせた編成替えが攻略の軸になる。
export const STAGES_PER_ACT = 10;
export const DARK_ACTS = 3; // 序盤の闇固定幕数
const STAGE_ELEMENT_ORDER = ["dark", "wind", "water", "light", "fire", "earth"];
export function stageElement(stage) {
  const act = Math.floor((stage - 1) / STAGES_PER_ACT);
  if (act < DARK_ACTS) return "dark";
  // 第4幕=風から始まり6属性で一巡(闇も後半の幕で再登場する)
  return STAGE_ELEMENT_ORDER[(act - DARK_ACTS + 1) % STAGE_ELEMENT_ORDER.length];
}

// その属性に有利を取れる属性(カウンター)。ポータルの攻略ヒント用。
export function counterElement(elem) {
  for (const [atk, def] of Object.entries(ELEMENT_ADVANTAGE)) {
    if (def === elem) return atk;
  }
  return null;
}

// ---- 難所ステージ(2026-07-15 FB「ナイトメア以降は編成を考えないと攻略できない難所を2箇所ずつ」) ----
// ナイトメア以降の全難易度で 4-5(35) と 8-5(75) が難所。ポータルに⚠マーク+攻略ヒントを出す。
//  trial(属性の試練): 幕属性に有利を取れない仲間の与ダメが88%減 → カウンター属性の編成が必須
//  wall(巨壁)       : 面まるごと超耐久の巨大な1体(HP×25/攻撃×1.6、報酬は1面分) →
//                     ボス特効・とどめ(execute)・高単発の「ボス特化」編成が必須
// 難所(2026-07-24 FB「難所の難易度をもう少し特化して難度を上げて。被ダメージも
// 上がるようにして属性防御の必要性を上げる。属性防御か種族をそろえないと耐えきれない
// 被ダメージに。ヘル以降は難所をもう少し増やして」)。
//   trial(属性の試練): 有利を取れない子の与ダメが激減 → 攻め側の属性そろえを要求
//   storm(属性の嵐)  : 被ダメが takenMult 倍。弱点編成だとまず耐えられないので、
//                      「耐性側で固める(DEF_RESIST_MULT)」か「属性防御(elemDef)を盛る」
//                      のどちらかが必須になる = 守り側の属性投資に意味を持たせる新種
//   wall(巨壁)      : 硬い単体+高火力。1体=1面分の報酬
// takenMult は partyDefenseMult の外側に掛かるので、耐性編成(0.7)と属性防御(最大-30%)を
// 両方積むと素の被ダメ近くまで戻せる=対策すれば通れる、無策だと通れない、が成立する。
//   abyss(深淵)      : 試練と嵐を同時に掛ける最上位の難所(2026-07-25 FB「難所・高難易度
//                      場所をもう少し増やしたい。難易度も上げてほしい」)。
//                      攻め側の属性そろえ**と**守り側の属性投資を**両方**要求する。
//                      片方だけの対策では通れないのが trial/storm との違いで、
//                      ヘル以降にだけ置く「本気の壁」
export const STAGE_GIMMICKS = Object.freeze({
  trial: { kind: "trial", name: "属性の試練", icon: "⚠", offMult: 0.12, takenMult: 1 },
  storm: { kind: "storm", name: "属性の嵐", icon: "☈", takenMult: 2.0 },
  wall: { kind: "wall", name: "巨壁", icon: "⚠", hpMult: 25, atkMult: 1.6, goldMult: 30, expMult: 26, takenMult: 1 },
  abyss: { kind: "abyss", name: "深淵", icon: "☠", offMult: 0.25, takenMult: 3.0 },
});
// 難所の配置。ヘル以降は数を増やす(2026-07-24 FB → 2026-07-25 さらに増設)。
// ナイトメア=3箇所(学習)/ヘル=6箇所/トーメント=8箇所。
// 幕の頭(x-5)に置くと編成を組み直したまま10面走れるので、面の中ほどに散らす。
// 深淵はヘル以降だけ。トーメントは深淵2つ+巨壁2つで「最後の1幕まで気が抜けない」形にする。
// **配置は必ず上位が下位の上位集合(superset)にする**: 同じ面が難易度によって
// 難所だったり普通だったりすると、覚えた攻略が難易度を上げた瞬間に嘘になる。
// 4-5(35)=試練 / 8-5(75)=巨壁 は初期からの固定席で、増設ぶんは常に「足す」だけ
const GIMMICK_MAPS = Object.freeze({
  1: { 25: "storm", 35: "trial", 75: "wall" },
  2: { 15: "trial", 25: "storm", 35: "trial", 55: "abyss", 75: "wall", 85: "storm" },
  3: { 15: "trial", 25: "storm", 35: "trial", 45: "wall", 55: "abyss", 75: "wall", 85: "storm", 95: "abyss" },
});
// 難所の高難易度スケール(2026-07-20 バッチ3 → 2026-07-24 難度特化)。
// ナイトメア=基準、ヘル/トーメントほどギミックが厳しく・報酬(巨壁=1面分の思想)も
// 同率で厚くなる。**報酬ルールは初日固定**(公平性原則: ルールは初日固定、量は後から積む)。
// 初回踏破報酬(叡智の水晶/トーメントは+鍵)は applyKill 側。値の変更はガードテストとセット
// 2026-07-25 FB「難易度を上げてほしい」で全体を一段引き上げ。深淵はヘル以降にだけ存在する。
export const GIMMICK_SCALE = Object.freeze({
  1: {
    trial: { offMult: 0.12, takenMult: 1.35 },
    storm: { takenMult: 2.2 },
    wall: { hpMult: 25, atkMult: 1.6, goldMult: 30, expMult: 26, takenMult: 1.2 },
  },
  2: {
    trial: { offMult: 0.10, takenMult: 1.6 },
    storm: { takenMult: 2.7 },
    wall: { hpMult: 30, atkMult: 1.75, goldMult: 36, expMult: 31, takenMult: 1.4 },
    abyss: { offMult: 0.25, takenMult: 3.0 },
  },
  3: {
    trial: { offMult: 0.07, takenMult: 1.9 },
    storm: { takenMult: 3.2 },
    wall: { hpMult: 38, atkMult: 1.9, goldMult: 46, expMult: 40, takenMult: 1.6 },
    abyss: { offMult: 0.18, takenMult: 3.8 },
  },
});
export function stageGimmick(difficulty, stage) {
  const d = difficulty ?? 0;
  if (d < 1) return null; // ノーマルは編成の勉強前なので難所なし
  const map = GIMMICK_MAPS[d] ?? GIMMICK_MAPS[3]; // 新地域(4+)はトーメント配置を踏襲
  const kind = map[stage];
  if (!kind) return null;
  const scale = (GIMMICK_SCALE[d] ?? GIMMICK_SCALE[3])[kind];
  return { ...STAGE_GIMMICKS[kind], ...scale, tier: d };
}

// 撃破1回あたりの卵ドロップ率(基本値。スキルのドロップ率ボーナスが加算される)
// 仲間3体まで(駆け出しの加護)は4倍でパーティ作り優先、3体そろったら基本値へ激下げ。
// 2026-07-08「卵の排出量まだ多い。半分くらいでいい」→ 0.008→0.004(約半分)。
// 2026-07-08 追加「卵はもっともっと絞っていい。出たら熱い！になるよう」→ 0.004→0.0012(約1/3)。
export const EGG_DROP_CHANCE = 0.0012;

// 卵インベントリの最大スロット数
export const MAX_EGG_SLOTS = 12;

// ステージ進行に必要な撃破数。
// 10→30: 1ステージ=約10ウェーブ+最後にボス。「1面が1つの戦い」になる長さ
export const KILLS_PER_STAGE = 30;

// ---- 難易度(ノーマル→トーメント) ----
// 全10幕100面 × 4難易度。敵の強さ・報酬・ドロップは「実効ステージ」
// (難易度×100+面)で一直線のカーブに乗る(難易度は100面ごとの節目/ゲート)。
// 2026-07-08「難易度切り替えは3-10でなく10-10に」→ 30→100。
// 前の難易度の10-10(幕ボス)を倒すと次の難易度が解放される。
export const STAGES_PER_DIFFICULTY = 100;
// 新地域(隔週の自動アップデート)はトーメントの先に難易度として積み上がる(実効ステージ延長)
export const DIFFICULTIES = Object.freeze([
  { id: 0, name: "ノーマル", color: "#8ab8ff" },
  { id: 1, name: "ナイトメア", color: "#b08aff" },
  { id: 2, name: "ヘル", color: "#ff8a5a" },
  { id: 3, name: "トーメント", color: "#ff5a8a" },
  ...((EXTRA_TUNING.regions ?? []).slice(0, 8).map((r, i) => ({
    id: 4 + i,
    name: String(r.name ?? `未踏域${i + 1}`).slice(0, 8),
    color: /^#[0-9a-f]{6}$/i.test(r.color ?? "") ? r.color : "#c8b4ff",
    generated: true,
  }))),
]);

// レベル上限。トーメント3-10はLv80前後+良装備+相性で「工夫すれば」届く調整。
// 隔週アップデートで levelCapBonus(+5ずつ・上限+100)が積み上がる
export const LEVEL_CAP = 100 + clampNum(EXTRA_TUNING.levelCapBonus, 0, 100, 0);

// オフライン進行の上限(ミリ秒)
export const OFFLINE_CAP_MS = 12 * 60 * 60 * 1000;

// オフライン中に得られる卵の上限
export const OFFLINE_EGG_CAP = 10;

// 野生卵の抽選ウェイト。アルカナ以降も「超低確率の奇跡」として出る(基準の8%に圧縮)。
// 2026-07-17 FB「アルカナ以上は普通にプレイして1か月に1個出るか出ないかのレベルに」:
// 0.15→0.08。実測(実効400・12h/日・卵6.9個/日)でアルカナ以上の合計 ≈0.5個/月。
// キャラ性能の激強境界をアルカナ以上に引き上げた(rarityStatMult)ぶん、入手も夢枠に
export const WILD_EGG_HIGH_SCALE = 0.08;

export function wildEggWeights(stage) {
  const w = rarityWeights(stage);
  const s = WILD_EGG_HIGH_SCALE;
  return {
    common: w.common,
    rare: w.rare,
    ultra: w.ultra,
    legend: w.legend,
    immortal: w.immortal,
    arcana: w.arcana * s,
    beyond: w.beyond * s,
    century: w.century * s,
    cosmic: w.cosmic * s,
    celestial: w.celestial * s,
  };
}

// レア度別の基本抽選ウェイト。上位ほど桁違いに出にくく、ステージが進むほど強く開放される。
// 設計(2026-07-08ユーザー指示「序盤からウルトラ出すぎ / レベルが上がるほど高レアに傾斜」):
//  - 序盤はコモン/レアが主役。ウルトラの基礎ウェイトを 12→4 に下げ「序盤の乱発」を解消。
//  - 代わりにウルトラ以上の成長率を大きくし、進むほど上位レアが伸びる強い傾斜に。
//  - さらにコモンをステージで逓減させ、後半は分母が上位側へ寄る(体感の傾斜を強める)。
// テスト制約: stage1で厳密な希少度階段 / 上位ティアは stage50>stage1 かつ w(∞)<w(1)×20。
export function rarityWeights(stage) {
  const grow = (base, rate, cap) => base + Math.min(cap, stage * rate);
  return {
    // コモンは進行で減衰(64→下限8)。減衰を速めて(0.5→0.6)後半ほど分母が上位側へ寄り、
    // 「ステージが上がるほど高レアが出る」傾斜を強める(2026-07-09ユーザー指示)。
    [RARITY.COMMON]: Math.max(8, 64 - stage * 0.6),
    [RARITY.RARE]: 26,
    [RARITY.ULTRA]: grow(4, 0.16, 22),
    [RARITY.LEGEND]: grow(1.3, 0.06, 8),
    [RARITY.IMMORTAL]: grow(0.4, 0.02, 3),
    [RARITY.ARCANA]: grow(0.15, 0.008, 1.2),
    [RARITY.BEYOND]: grow(0.05, 0.003, 0.5),
    [RARITY.CENTURY]: grow(0.015, 0.001, 0.18),
    [RARITY.COSMIC]: grow(0.004, 0.0003, 0.05),
    // セレスティアル: ドロップは超極小(基本は合成・配合の到達点)
    [RARITY.CELESTIAL]: grow(0.001, 0.0001, 0.015),
  };
}

// 個体値(IV)の範囲。ステータス倍率としてかかる。
export const IV_MIN = 0.85;
export const IV_MAX = 1.15;

// 配合で生まれた子は通常上限を少し超えられる(厳選のごほうび)。
export const IV_MAX_BRED = 1.3;

// 色違い(シャイニー)の出現率。配合卵は確率アップ。
// 2026-07-10 方針転換: 色違いは「確定で覚醒個体」(見た目+実力の両取りの最上級当たり)。
// 孵化時に覚醒抽選を外していても覚醒1を保証する(eggs.js)。
// 2026-08-11 Haru指示「覚醒個体と色違いの排出率を逆にして」: 野生(WILD)は色違いが
// 実質「覚醒の上位互換(確定で覚醒も付く)」なのに単体覚醒より出やすい逆転が起きていた
// (旧: 色違い0.8% > 単体覚醒0.5%)ので、単体覚醒の方をわずかに出やすくする向きへ入れ替え
export const SHINY_CHANCE_WILD = 0.005;
export const SHINY_CHANCE_BRED = 0.05;
// 調合で色違いを餌にしたとき、色違い(=覚醒)が遺伝する確率。
// 確定覚醒の色違いを1体潰す重い代償に見合うギャンブル(期待値: 4体で約68%)。
export const SHINY_FEED_INHERIT = 0.25;

// ---- 育成: 兆し(パーク) ----
// ポイント制のパッシブ。Lv2ごとに1ポイントもらえて、好きなバフに自由に振れる。
// 「こまめに1個ずつ強くなる」手ざわり重視(1ポイントの効果は小さめに刻む)。
// 同じ兆しに重ね振りできる(乗算/加算で累積)。ふり直しは不可。
// 2026-07-10 スフィア盤拡張: 1レベルごとに1pt(Lv100=100pt)。効果は半分に刻み直し、
// 総量は従来(Lv2ごと×2倍値)と同等= balance-sim の較正を維持しつつ、盤面の一歩を細かく。
export const PERK_INTERVAL = 1;

// 1ポイントあたりの効果。2026-07-12: ポイントがレベル×1.5に増えた(2領域制覇FB)ため
// 効果は2/3に薄めて、同レベルの総合戦力は従来較正と同等に保つ(sim緑を維持)。
// 「/pt」表記は廃止(2026-07-16 FB「/ptの表示がいらない」)。1ノード=1回分の素の値を書く
const BASE_PERKS = {
  atk: { id: "atk", label: "力の兆し", desc: "攻撃 +1.0%", mult: { atk: 1.01 } },
  hp: { id: "hp", label: "体力の兆し", desc: "最大HP +1.1%", mult: { hp: 1.011 } },
  skill: { id: "skill", label: "技の兆し", desc: "スキル威力 +0.9%", stat: { skillPower: 0.009 } },
  // 1ptあたりの限界価値をそろえる(2026-07-11 FB「どこに進んでも差がないように」):
  // atk/hpは複利なので、加算系のspeed/def/cdrは高めに設定して釣り合わせる(上限で頭打ちあり)
  speed: { id: "speed", label: "疾風の兆し", desc: "攻撃速度 +0.8%", stat: { atkSpeed: 0.008 } },
  drop: { id: "drop", label: "運の兆し", desc: "卵ドロップ +0.09%", stat: { dropBonus: 0.0009 } },
  gold: { id: "gold", label: "商人の兆し", desc: "ゴールド +0.7%", stat: { goldBonus: 0.007 } },
  // 系統別スフィア再設計(2026-07-11 FB: タンク=防御/ヒーラー・バッファー=CD短縮も伸びる)
  def: { id: "def", label: "守りの兆し", desc: "被ダメージ -0.7%", stat: { defCut: 0.007 } },
  cdr: { id: "cdr", label: "刹那の兆し", desc: "クールタイム短縮 +0.5%", stat: { cdr: 0.005 } },
  // ---- スフィア盤の特殊スフィア(レーン終端の固有能力 2026-07-10) ----
  // sumPerk/perkStat/perkMult が既存経路で拾うため、追加の配線は不要。
  scrit: { id: "scrit", label: "会心の極意", desc: "会心率 +4%", stat: { critRate: 0.04 }, special: true },
  scritdmg: { id: "scritdmg", label: "致命の一撃", desc: "会心ダメージ +25%", stat: { critDmg: 0.25 }, special: true },
  scdr: { id: "scdr", label: "神速の理", desc: "クールタイム短縮 +4%", stat: { cdr: 0.04 }, special: true },
  sguard: { id: "sguard", label: "鉄壁の構え", desc: "最大HP +12%", mult: { hp: 1.12 }, special: true },
  sdrop: { id: "sdrop", label: "豊穣の加護", desc: "卵ドロップ +1%", stat: { dropBonus: 0.01 }, special: true },
  sgold: { id: "sgold", label: "黄金の商才", desc: "ゴールド +10%", stat: { goldBonus: 0.1 }, special: true },
  // ---- ジョブ島の専用特殊スフィア(レア職/隠し職だけが解放できる 2026-07-11) ----
  // 2026-07-16 劇レア化(レア職1/40・隠し職1/500)に合わせて強化。隠し職コアはレア職の明確に上
  jsamurai: { id: "jsamurai", label: "兜割り", desc: "会心ダメージ +60%", stat: { critDmg: 0.6 }, special: true },
  jwarden: { id: "jwarden", label: "岩壁の加護", desc: "最大HP +35%", mult: { hp: 1.35 }, special: true },
  jdruid: { id: "jdruid", label: "森の叡智", desc: "スキル威力 +40%", stat: { skillPower: 0.4 }, special: true },
  jonmyoji: { id: "jonmyoji", label: "式神の加護", desc: "クールタイム短縮 +10%", stat: { cdr: 0.1 }, special: true },
  jgodhand: { id: "jgodhand", label: "神の腕", desc: "攻撃 +50%", mult: { atk: 1.5 }, special: true },
  jtitan: { id: "jtitan", label: "巨神の体躯", desc: "最大HP +60%", mult: { hp: 1.6 }, special: true },
  jseraph: { id: "jseraph", label: "天の恵み", desc: "スキル威力 +60%", stat: { skillPower: 0.6 }, special: true },
  jhao: { id: "jhao", label: "覇者の風格", desc: "ゴールド +50% 卵 +2%", stat: { goldBonus: 0.5, dropBonus: 0.02 }, special: true },
  // 追加の道の終端(重複スポーク用)+蜘蛛の巣の深層特殊(リング9の網目 2026-07-10)
  sovereign: { id: "sovereign", label: "覇王の紋", desc: "攻撃 +15%", mult: { atk: 1.15 }, special: true },
  aegis: { id: "aegis", label: "不滅の加護", desc: "最大HP +15%", mult: { hp: 1.15 }, special: true },
  s2crit: { id: "s2crit", label: "会心の真髄", desc: "会心率 +6%", stat: { critRate: 0.06 }, special: true },
  s2skill: { id: "s2skill", label: "魔力暴走", desc: "スキル威力 +15%", stat: { skillPower: 0.15 }, special: true },
  s2speed: { id: "s2speed", label: "風の化身", desc: "攻撃速度 +6%", stat: { atkSpeed: 0.06 }, special: true },
  s2cdr: { id: "s2cdr", label: "刹那の境地", desc: "クールタイム短縮 +6%", stat: { cdr: 0.06 }, special: true },
  // 2026-08-12 FB「目玉スフィアの必要な特殊スフィアの数を4つに統一して」:
  // 各系統2個→4個へ拡張するにあたり不足ぶんを新設(sovereign/s2crit復活+8個新規)
  sgale: { id: "sgale", label: "疾風の心得", desc: "攻撃速度 +5%", stat: { atkSpeed: 0.05 }, special: true },
  sward: { id: "sward", label: "守りの型", desc: "被ダメージ -5%", stat: { defCut: 0.05 }, special: true },
  sstout: { id: "sstout", label: "頑健の証", desc: "最大HP +12%", mult: { hp: 1.12 }, special: true },
  sfocus: { id: "sfocus", label: "集中の心得", desc: "スキル威力 +8%", stat: { skillPower: 0.08 }, special: true },
  smend: { id: "smend", label: "癒しの心得", desc: "クールタイム短縮 +5%", stat: { cdr: 0.05 }, special: true },
  sluck: { id: "sluck", label: "幸運の兆し", desc: "卵ドロップ +0.8%", stat: { dropBonus: 0.008 }, special: true },
  shaste: { id: "shaste", label: "疾走の支援", desc: "攻撃速度 +5%", stat: { atkSpeed: 0.05 }, special: true },
  sfortune: { id: "sfortune", label: "商いの才", desc: "ゴールド +8%", stat: { goldBonus: 0.08 }, special: true },
  // ---- キーストーン(2026-07-11 FB「各方面の最終あたりに固有の特殊ポイント。FF/ディアブロ4参考」) ----
  // 各系統の最奥に1個だけある複合能力。ビルドの「ゴール」になる強さ(遠いほど強いの頂点)
  kattack: {
    id: "kattack", label: "オーバードライブ", special: true, keystone: true,
    desc: "攻撃 +10% ・会心率 +5% ・会心ダメージ +20%",
    mult: { atk: 1.1 }, stat: { critRate: 0.05, critDmg: 0.2 },
  },
  ktank: {
    id: "ktank", label: "不動要塞", special: true, keystone: true,
    desc: "最大HP +15% ・被ダメージ -6%",
    mult: { hp: 1.15 }, stat: { defCut: 0.06 },
  },
  khealer: {
    id: "khealer", label: "生命の泉", special: true, keystone: true,
    desc: "スキル威力 +20% ・クールタイム短縮 +5%",
    stat: { skillPower: 0.2, cdr: 0.05 },
  },
  kbuffer: {
    id: "kbuffer", label: "豊穣の女神", special: true, keystone: true,
    desc: "卵ドロップ +1.5% ・ゴールド +20% ・クールタイム短縮 +3%",
    stat: { dropBonus: 0.015, goldBonus: 0.2, cdr: 0.03 },
  },
  kutility: {
    id: "kutility", label: "星の導き", special: true, keystone: true,
    desc: "会心率 +4% ・攻撃速度 +4% ・ゴールド +10%",
    stat: { critRate: 0.04, atkSpeed: 0.04, goldBonus: 0.1 },
  },
};
// 内蔵の兆し + 自動生成の特殊スフィア効果(content-pack)をマージ
export const PERKS = Object.freeze({ ...BASE_PERKS, ...EXTRA_PERKS });

// 5系統セクター定義(2026-08-12 FB「目玉スフィアによって取得難易度が違いすぎる」で再設計)。
// 系統別の伸びるステータス(2026-07-11 FB): アタッカー=攻撃・攻撃速度 / タンク=HP・防御 /
// ヒーラー=スキル威力・CD短縮 / バッファー=各種ドロップ率・CD短縮 / 便利=金・卵(彩り枠)。
// specialsは「その系統の実際のクラスタに配置する特殊スフィア」の正=盤面生成(SPHERE_BOARD)
// と目玉の解放条件(SPHERE_SECTOR_SPECIALS)の両方がここを唯一の真実として参照する。
// 旧設計は「効果IDで紐づけるが配置は距離順」で、系統と配置がズレて①系統によって
// 必要数が2〜3個で不揃い ②kbufferの条件(sgold)が便利の領域のクラスタに実際には
// 配置される、という二重の不整合があった。配置(sectorOf)と条件
// (SPHERE_SECTOR_SPECIALS)を同じ配列から生成することで「違う系統の特殊が必要」
// という事態が構造的に起きないようにする。**全系統ちょうど4個**に統一
// (2026-08-12 Haru指示。導入時点では2個だったが、4個へ拡張)
export const SPHERE_SECTORS_DEF = Object.freeze([
  { label: "アタッカーの領域", stats: ["atk", "speed"], specials: ["scrit", "scritdmg", "sovereign", "sgale"] },
  { label: "タンクの領域", stats: ["hp", "def"], specials: ["sguard", "aegis", "sward", "sstout"] },
  { label: "ヒーラーの領域", stats: ["skill", "cdr"], specials: ["s2skill", "scdr", "sfocus", "smend"] },
  { label: "バッファーの領域", stats: ["drop", "cdr", "speed"], specials: ["sdrop", "s2cdr", "sluck", "shaste"] },
  { label: "便利の領域", stats: ["gold", "drop"], specials: ["s2speed", "sgold", "s2crit", "sfortune"] },
]);
// 目玉スフィア(キーストーン)の解放条件: 同系統の特殊スフィアを全部解放(2026-07-12 FB)。
// SPHERE_SECTORS_DEFのspecialsをそのまま使う(系統と配置を一致させるため。旧仕様の
// 「幾何セクターでなく効果IDで紐づける」は上記の理由で廃止)
export const SPHERE_KEYSTONE_IDS = Object.freeze(["kattack", "ktank", "khealer", "kbuffer", "kutility"]);
export const SPHERE_SECTOR_SPECIALS = Object.freeze(
  Object.fromEntries(SPHERE_KEYSTONE_IDS.map((kid, i) => [kid, [...SPHERE_SECTORS_DEF[i].specials]])),
);

// ---- スフィア盤 v3: FF10本家級の広大な星図(2026-07-10) ----
// 「クラスタ(6〜9個の環)」を7×5の有機グリッドに散らし、近傍クラスタを小道でつなぐ。
// 決定的シード生成=ノードIDと配置は常に同じ(セーブ互換)。
// ※BOARD_SEEDや生成パラメータを変えるとIDが変わる→旧盤面の解放は deserialize が
//   検出してポイント返金リセットする(効果perksも該当ノード分を取り下げ)。
// 総ノード数 ≈ 370 >> Lv100の100pt = 取れるのは3割弱。どの特殊(20個=系統ごとに
// 最遠4クラスタの核)へルートを引くかが最大の戦略。UI側はズーム/パンで観る
// (SPHERE_BOARD_SIZE が仮想空間)
export const SPHERE_STATS = ["atk", "hp", "skill", "speed", "drop", "gold", "def", "cdr"];
// 盤面の「中身」の版数。ノードIDは同じままstat/grantsを塗り替えたときに上げる
// (deserializeがノード由来perksを全返金して白紙に戻す)。rev2=系統別ステータス再設計(2026-07-11)
// rev3=ジョブ島の再設計(スタート直下へ移設+リングを主/副ステ構成に 2026-07-16)
// rev4=バッファー領域のゴールド削減(drop/cdr/speedへ塗り替え 2026-07-21 FB)
// rev5=特殊スフィアの配置を系統ごとに固定(全系統2個に統一。2026-08-12 FB)
// rev6=目玉スフィアの必要数を全系統4個へ拡張(2026-08-12 Haru指示)
export const SPHERE_BOARD_REV = 6;
function sphereLink(nodes, a, b) {
  if (a === b) return;
  if (!nodes[a].edges.includes(b)) nodes[a].edges.push(b);
  if (!nodes[b].edges.includes(a)) nodes[b].edges.push(a);
}
const SPHERE_BOARD = (() => {
  let s = 20260710 >>> 0; // BOARD_SEED(変えるとID総取り替え=返金リセット発動)
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const nodes = {};
  const COLS = 7;
  const ROWS = 5;
  const SPACING = 235;
  const statCycle = [
    "atk", "hp", "skill", "speed", "atk", "drop", "hp", "gold", "skill", "atk",
    "hp", "speed", "gold", "drop", "skill", "atk", "hp", "gold", "speed", "drop",
    "atk", "hp", "skill", "speed", "atk", "drop", "hp", "gold", "skill", "speed",
    "atk", "hp", "skill", "gold", "drop",
  ];
  // クラスタ中心の配置(蜂の巣風オフセット+ジッター。四隅をまれに欠けさせて有機的に)
  const clusters = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if ((r === 0 || r === ROWS - 1) && (c === 0 || c === COLS - 1) && rnd() < 0.75) continue;
      const x = (c + (r % 2 ? 0.5 : 0)) * SPACING + (rnd() - 0.5) * 70;
      const y = r * SPACING * 0.92 + (rnd() - 0.5) * 60;
      clusters.push({ x, y, stat: statCycle[clusters.length % statCycle.length], ring: [] });
    }
  }
  // 中央に最も近いクラスタ=スタートの座
  const cx0 = ((COLS - 1) * SPACING) / 2;
  const cy0 = ((ROWS - 1) * SPACING * 0.92) / 2;
  let startIdx = 0;
  let bestD = Infinity;
  clusters.forEach((cl, i) => {
    const d = Math.hypot(cl.x - cx0, cl.y - cy0);
    if (d < bestD) {
      bestD = d;
      startIdx = i;
    }
  });
  // 系統(5方向)ごとに、スタートから遠いクラスタ2個の核へ特殊スフィアを配る
  // (遠いほど強いのが奥に、は従来どおり。2026-08-12 FB「目玉スフィアによって取得
  // 難易度が違いすぎる」対応: 旧実装は距離順グローバルで12個選んでいたため、方角に
  // よっては該当クラスタが0〜4個に偏り、系統と配置が一致しない不整合があった。
  // ここで方角ごとに割り当てることで、系統内で完結し必要数も揃う)
  const scx = clusters[startIdx].x;
  const scy = clusters[startIdx].y;
  const sectorOf = (x, y) => {
    // 北(-90°)を基準に72°ずつ5分割
    const deg = (Math.atan2(y - scy, x - scx) * 180) / Math.PI; // -180..180、0=東
    return Math.floor((((deg + 90 + 36) % 360) + 360) % 360 / 72) % 5;
  };
  const specialAt = new Map();
  for (let sec = 0; sec < SPHERE_SECTORS_DEF.length; sec++) {
    const inSector = clusters
      .map((cl, i) => ({ i, d: Math.hypot(cl.x - scx, cl.y - scy) }))
      .filter(({ i }) => i !== startIdx && sectorOf(clusters[i].x, clusters[i].y) === sec)
      .sort((a, b) => b.d - a.d);
    SPHERE_SECTORS_DEF[sec].specials.forEach((sp, k) => {
      if (inSector[k]) specialAt.set(inSector[k].i, sp);
    });
  }
  // クラスタの環ノード+核
  clusters.forEach((cl, ci) => {
    const n = 6 + Math.floor(rnd() * 4); // 6〜9個の環
    const rad = 52 + rnd() * 22;
    const a0 = rnd() * Math.PI * 2;
    for (let k = 0; k < n; k++) {
      const id = `c${ci}_${k}`;
      const ang = a0 + (k / n) * Math.PI * 2;
      const stat = rnd() < 0.25 ? SPHERE_STATS[Math.floor(rnd() * SPHERE_STATS.length)] : cl.stat;
      nodes[id] = {
        id,
        stat,
        type: "small",
        grants: [stat],
        x: cl.x + Math.cos(ang) * rad,
        y: cl.y + Math.sin(ang) * rad * (0.85 + rnd() * 0.3),
        edges: [],
      };
      cl.ring.push(id);
      if (k > 0) sphereLink(nodes, id, `c${ci}_${k - 1}`);
    }
    sphereLink(nodes, `c${ci}_0`, `c${ci}_${n - 1}`); // 環を閉じる
    if (ci !== startIdx) {
      // 核: 特殊クラスタ=特殊スフィア、それ以外=大スフィア(3pt分)
      const id = `c${ci}_core`;
      const sp = specialAt.get(ci);
      nodes[id] = sp
        ? { id, stat: null, type: "special", grants: [sp], x: cl.x, y: cl.y, edges: [] }
        : { id, stat: cl.stat, type: "big", grants: [cl.stat, cl.stat, cl.stat], x: cl.x, y: cl.y, edges: [] };
      const spokes = 2 + Math.floor(rnd() * 2);
      for (let sk = 0; sk < spokes; sk++) {
        sphereLink(nodes, id, cl.ring[Math.floor(rnd() * cl.ring.length)]);
      }
    }
  });
  // クラスタ間の小道(互いに最も近い環ノード同士を1〜3個の中継ノードでつなぐ)
  const edgesDone = new Set();
  const connect = (a, b) => {
    const key = a < b ? `${a}-${b}` : `${b}-${a}`;
    if (edgesDone.has(key) || a === b) return;
    edgesDone.add(key);
    const ca = clusters[a];
    const cb = clusters[b];
    let na = ca.ring[0];
    let nb = cb.ring[0];
    let bd = Infinity;
    for (const ia of ca.ring) {
      for (const ib of cb.ring) {
        const d = Math.hypot(nodes[ia].x - nodes[ib].x, nodes[ia].y - nodes[ib].y);
        if (d < bd) {
          bd = d;
          na = ia;
          nb = ib;
        }
      }
    }
    const hops = Math.max(1, Math.min(3, Math.round(bd / 95) - 1));
    let prev = na;
    for (let h = 1; h <= hops; h++) {
      const t = h / (hops + 1);
      const id = `p${key}_${h}`;
      const stat = rnd() < 0.5 ? ca.stat : cb.stat;
      nodes[id] = {
        id,
        stat,
        type: "small",
        grants: [stat],
        x: nodes[na].x + (nodes[nb].x - nodes[na].x) * t + (rnd() - 0.5) * 40,
        y: nodes[na].y + (nodes[nb].y - nodes[na].y) * t + (rnd() - 0.5) * 40,
        edges: [],
      };
      sphereLink(nodes, id, prev);
      prev = id;
    }
    sphereLink(nodes, prev, nb);
  };
  // プリム風に全クラスタを連結
  const connected = new Set([startIdx]);
  while (connected.size < clusters.length) {
    let ba = -1;
    let bb = -1;
    let bd = Infinity;
    for (const a of connected) {
      for (let b = 0; b < clusters.length; b++) {
        if (connected.has(b)) continue;
        const d = Math.hypot(clusters[a].x - clusters[b].x, clusters[a].y - clusters[b].y);
        if (d < bd) {
          bd = d;
          ba = a;
          bb = b;
        }
      }
    }
    connect(ba, bb);
    connected.add(bb);
  }
  // 横道: 各クラスタから近い2つへ追加接続(迂回ルート=巡回路を作る)
  for (let a = 0; a < clusters.length; a++) {
    const near = clusters
      .map((cl, b) => ({ b, d: Math.hypot(cl.x - clusters[a].x, cl.y - clusters[a].y) }))
      .filter((e) => e.b !== a)
      .sort((x, y) => x.d - y.d)
      .slice(0, 2);
    for (const e of near) if (e.d < SPACING * 1.45) connect(a, e.b);
  }
  // スタート: 中央クラスタの環全てが start(中心点)に接続
  for (const id of clusters[startIdx].ring) nodes[id].edges.push("start");

  // ---- 5系統セクター(2026-07-11 FB「大きく5方向に分かれて育てる方向を選べるように」) ----
  // 盤面を中心から5方向に大別: 北=アタッカー(力) / 北東=タンク(体力) / 南東=ヒーラー(技) /
  // 南西=バッファー(疾風) / 北西=便利系(運・商)。ノードのstatを方角で塗り直す。
  // 定義(label/stats/specials)はSPHERE_SECTORS_DEF(モジュール先頭)を1本の真実として使う。
  // scx/scy/sectorOfは特殊スフィアの配置(上の specialAt 計算)で既に定義済みのものを使い回す
  const hashPick = (id, arr) => arr[perkHash(`sect:${id}`) % arr.length];
  for (const n of Object.values(nodes)) {
    if (n.jobLock || n.type === "special") continue;
    const sec = SPHERE_SECTORS_DEF[sectorOf(n.x, n.y)];
    // 85%はセクターのステータス、15%は彩り(決定的ハッシュ)
    const st =
      perkHash(`mix:${n.id}`) % 100 < 85
        ? hashPick(n.id, sec.stats)
        : SPHERE_STATS[perkHash(`alt:${n.id}`) % SPHERE_STATS.length];
    n.stat = st;
    n.grants = n.type === "big" ? [st, st, st] : [st];
    n.sector = sectorOf(n.x, n.y);
  }
  // 特殊スフィアの grants は上の specialAt 計算で系統ごとに確定済み。ここでは
  // sector フィールドだけ埋める(UI・封印判定・ツールチップが参照する)
  for (const sn of Object.values(nodes)) {
    if (sn.type !== "special" || sn.jobLock) continue;
    sn.sector = sectorOf(sn.x, sn.y);
  }
  // ---- 入口ルート(2026-07-11 FB「最初の場所から5系統方向を全方位迎えるルート」) ----
  // startから各セクターの最寄りクラスタへ、系統色の一本道(2〜3ノード)を直結で張る。
  // 「北へ行けばアタッカー」の選択がスタート直後から明確になる。
  // ※rnd()は使わない(乱数消費が変わると後続の座標が動くため。位置はperkHashの決定的ジッター)
  for (let sec = 0; sec < SPHERE_SECTORS_DEF.length; sec++) {
    let target = null;
    let bd = Infinity;
    clusters.forEach((cl, ci) => {
      if (ci === startIdx) return;
      if (sectorOf(cl.x, cl.y) !== sec) return;
      const d = Math.hypot(cl.x - scx, cl.y - scy);
      if (d < bd) {
        bd = d;
        target = cl;
      }
    });
    if (!target) continue; // そのセクターにクラスタが無い(まれ)
    // クラスタ側の接続先=startに最も近い環ノード
    let entry = target.ring[0];
    let ed = Infinity;
    for (const id of target.ring) {
      const d = Math.hypot(nodes[id].x - scx, nodes[id].y - scy);
      if (d < ed) {
        ed = d;
        entry = id;
      }
    }
    const ex = nodes[entry].x;
    const ey = nodes[entry].y;
    const hops = Math.max(2, Math.min(3, Math.round(Math.hypot(ex - scx, ey - scy) / 85) - 1));
    const stat = SPHERE_SECTORS_DEF[sec].stats[0];
    let prev = null;
    for (let hIdx = 1; hIdx <= hops; hIdx++) {
      const t = hIdx / (hops + 1);
      const id = `g${sec}_${hIdx}`;
      const jx = ((perkHash(`gx:${id}`) % 100) - 50) * 0.5;
      const jy = ((perkHash(`gy:${id}`) % 100) - 50) * 0.5;
      nodes[id] = {
        id,
        stat,
        type: "small",
        grants: [stat],
        x: scx + (ex - scx) * t + jx,
        y: scy + (ey - scy) * t + jy,
        edges: hIdx === 1 ? ["start"] : [],
        sector: sec,
        gateway: true,
      };
      if (prev) sphereLink(nodes, id, prev);
      prev = id;
    }
    sphereLink(nodes, prev, entry);
  }

  // ---- キーストーン(2026-07-11 FB): 各系統の最奥に固有の複合特殊を1個ずつ配置 ----
  // FF10の隠しスフィア/ディアブロ4のパラゴン基点のように「その方面を最後まで進んだ者だけの
  // ゴール」。セクター内でstartから最も遠いノードのさらに一歩先に張り出す。
  // ※rnd()は使わない(後続のジョブ島配置の乱数列を動かさないため)
  for (let sec = 0; sec < SPHERE_SECTORS_DEF.length; sec++) {
    // セクターの中心方角±32°で最も遠いノードに付ける(境界ぎわだと「不動要塞が
    // タンク領域に見えない」ため 2026-07-11 FB)。候補が無ければ角度制限なしで再探索
    const bisector = ((sec * 72 - 90) * Math.PI) / 180;
    const pickFar = (maxAngle) => {
      let far = null;
      let fd = -1;
      for (const n of Object.values(nodes)) {
        if (n.jobLock || n.gateway) continue;
        if (sectorOf(n.x, n.y) !== sec) continue;
        if (maxAngle != null) {
          const ang = Math.atan2(n.y - scy, n.x - scx);
          let diff = Math.abs(ang - bisector);
          if (diff > Math.PI) diff = Math.PI * 2 - diff;
          if (diff > maxAngle) continue;
        }
        const d = Math.hypot(n.x - scx, n.y - scy);
        if (d > fd) {
          fd = d;
          far = n;
        }
      }
      return { far, fd };
    };
    let { far, fd } = pickFar((32 * Math.PI) / 180);
    if (!far) ({ far, fd } = pickFar(null));
    if (!far) continue;
    const id = `k${sec}`;
    const ux = (far.x - scx) / (fd || 1);
    const uy = (far.y - scy) / (fd || 1);
    nodes[id] = {
      id,
      stat: SPHERE_SECTORS_DEF[sec].stats[0],
      type: "special",
      keystone: true,
      grants: [SPHERE_KEYSTONE_IDS[sec]],
      x: far.x + ux * 70,
      y: far.y + uy * 70,
      edges: [],
      sector: sec,
    };
    sphereLink(nodes, id, far.id);
  }

  // UI用のセクターメタ(ラベルを引きの表示で盤面に描く)
  var sphereSectorMeta = SPHERE_SECTORS_DEF.map((s, i) => ({
    label: s.label,
    stat: s.stats[0],
    angle: ((i * 72 - 90) * Math.PI) / 180,
  }));

  // ---- ジョブ島(2026-07-11): レア職/隠し職だけが入れる専用クラスタ ----
  // jobLock付きノードは該当ジョブのタスモンにしか見えず解放もできない(state/ui側でガード)。
  // 島の中心=そのジョブ専用の特殊スフィア。
  // 配置(2026-07-16 FB「配置を考えて」): スタートの真下(5方向の入口ルートの隙間=南)に置く。
  // 以前は盤面の遥か下端に8島横並びで、①島が見つけられない ②スタートへの接続線が
  // 盤面を横断する、という見た目の破綻があった。1体のタスモンに見えるのは自分のジョブの
  // 島だけ(nodeVisible)なので、8島を同じ座標に重ねても衝突しない。
  // 中身も職のテーマで2系統に(単一statの羅列をやめ、リングを主/副ステで交互に)。
  const JOB_ISLANDS = [
    { job: "samurai", special: "jsamurai", stat: "atk", sub: "speed" },
    { job: "warden", special: "jwarden", stat: "hp", sub: "def" },
    { job: "druid", special: "jdruid", stat: "skill", sub: "cdr" },
    { job: "onmyoji", special: "jonmyoji", stat: "speed", sub: "cdr" },
    { job: "godhand", special: "jgodhand", stat: "atk", sub: "speed" },
    { job: "titan", special: "jtitan", stat: "hp", sub: "def" },
    { job: "seraph", special: "jseraph", stat: "skill", sub: "cdr" },
    { job: "hao", special: "jhao", stat: "gold", sub: "drop" },
  ];
  const islandCx = clusters[startIdx].x;
  const islandCy = clusters[startIdx].y + SPACING * 0.75; // 南=入口ルート(72°刻み)の真ん中の隙間
  JOB_ISLANDS.forEach((isl) => {
    const icx = islandCx;
    const n = 6;
    const ringIds = [];
    for (let q = 0; q < n; q++) {
      const id = `j_${isl.job}_${q}`;
      const ang = (q / n) * Math.PI * 2 + rnd() * 0.4;
      const st = q === 3 || q % 2 === 0 ? isl.stat : isl.sub; // 主ステ4:副ステ2
      nodes[id] = {
        id,
        stat: st,
        type: q === 3 ? "big" : "small",
        grants: q === 3 ? [st, st, st] : [st],
        x: icx + Math.cos(ang) * 52,
        y: islandCy + Math.sin(ang) * 44,
        edges: [],
        jobLock: isl.job,
      };
      ringIds.push(id);
      if (q > 0) sphereLink(nodes, id, ringIds[q - 1]);
    }
    sphereLink(nodes, ringIds[0], ringIds[n - 1]);
    const coreId = `j_${isl.job}_core`;
    nodes[coreId] = {
      id: coreId,
      stat: null,
      type: "special",
      grants: [isl.special],
      x: icx,
      y: islandCy,
      edges: [],
      jobLock: isl.job,
    };
    sphereLink(nodes, coreId, ringIds[0]);
    sphereLink(nodes, coreId, ringIds[3]);
    // 入口: ジョブを得た瞬間からstart直結で振り始められる
    nodes[ringIds[0]].edges.push("start");
  });
  // 座標を正規化(余白60)
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const n of Object.values(nodes)) {
    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x);
    maxY = Math.max(maxY, n.y);
  }
  for (const n of Object.values(nodes)) {
    n.x = Math.round(n.x - minX + 60);
    n.y = Math.round(n.y - minY + 60);
  }
  return {
    nodes,
    start: { x: Math.round(clusters[startIdx].x - minX + 60), y: Math.round(clusters[startIdx].y - minY + 60) },
    w: Math.round(maxX - minX + 120),
    h: Math.round(maxY - minY + 120),
    sectors: sphereSectorMeta,
  };
})();
// 自動生成スフィア(content-pack): 生成器が「既存ノードに接続する小クラスタ」を絶対座標で
// 追記する。ここでマージ+双方向エッジ化+盤面サイズ拡張(新IDのみ=既存の解放はそのまま)。
(() => {
  const nodes = SPHERE_BOARD.nodes;
  const added = [];
  for (const raw of EXTRA_SPHERE) {
    if (!raw || !raw.id || nodes[raw.id]) continue;
    const grants = (raw.grants ?? [raw.stat ?? "atk"]).filter((g) => BASE_PERKS[g] || EXTRA_PERKS[g]);
    if (grants.length === 0) continue;
    nodes[raw.id] = {
      id: raw.id,
      stat: raw.stat ?? grants[0],
      type: raw.type === "special" ? "special" : raw.type === "big" ? "big" : "small",
      grants,
      x: Math.round(raw.x ?? 0),
      y: Math.round(raw.y ?? 0),
      edges: [],
      sector: raw.sector ?? null,
      generated: true,
    };
    added.push(raw);
  }
  for (const raw of added) {
    for (const e of raw.edges ?? []) {
      if (e === "start") {
        if (!nodes[raw.id].edges.includes("start")) nodes[raw.id].edges.push("start");
      } else if (nodes[e]) {
        sphereLink(nodes, raw.id, e);
      }
    }
    // どこにも繋がらなかった孤島は取り除く(壊れた生成物への保険)
    if (nodes[raw.id].edges.length === 0) delete nodes[raw.id];
  }
  for (const n of Object.values(nodes)) {
    SPHERE_BOARD.w = Math.max(SPHERE_BOARD.w, n.x + 60);
    SPHERE_BOARD.h = Math.max(SPHERE_BOARD.h, n.y + 60);
  }
})();
// ---- 見た目の重なり解消(2026-07-18 FB「スフィア1,2個目で異常に近いのがいて誤爆
// しそう。形としても微妙」) ----
// ジッター配置の副作用で10〜30px級の重なりが盤面全体に240組あった。座標(x/y)だけを
// 反発緩和で押し広げる: ID/接続/効果は一切変えないのでセーブ互換・ルート互換は完全。
// ジョブ島(jobLock)同士は同時に表示されないので、異なるジョブ同士のペアは対象外。
(() => {
  const nodes = Object.values(SPHERE_BOARD.nodes);
  const MIN_D = 34; // ノード直径(視覚上)+余白。環の設計間隔(約36px〜)は崩さない
  const MAX_SHIFT = 26; // 元の位置からの累計移動上限(盤面の形を保つ)
  const home = new Map(nodes.map((n) => [n.id, { x: n.x, y: n.y }]));
  for (let iter = 0; iter < 60; iter++) {
    let moved = false;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        if (a.jobLock && b.jobLock && a.jobLock !== b.jobLock) continue; // 同時に見えない
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let d = Math.hypot(dx, dy);
        if (d >= MIN_D) continue;
        if (d < 1e-6) {
          // 完全同座標: IDから決定的な方向を作って割る
          const h = perkHash(`${a.id}|${b.id}`);
          dx = Math.cos(h % 360);
          dy = Math.sin(h % 360);
          d = 1;
        }
        const push = (MIN_D - d) / 2 + 0.5;
        const ux = dx / d;
        const uy = dy / d;
        const clampTo = (n, nx, ny) => {
          const h0 = home.get(n.id);
          const ox = nx - h0.x;
          const oy = ny - h0.y;
          const od = Math.hypot(ox, oy);
          if (od > MAX_SHIFT) {
            n.x = h0.x + (ox / od) * MAX_SHIFT;
            n.y = h0.y + (oy / od) * MAX_SHIFT;
          } else {
            n.x = nx;
            n.y = ny;
          }
        };
        clampTo(a, a.x - ux * push, a.y - uy * push);
        clampTo(b, b.x + ux * push, b.y + uy * push);
        moved = true;
      }
    }
    if (!moved) break;
  }
  for (const n of nodes) {
    n.x = Math.round(n.x);
    n.y = Math.round(n.y);
  }
})();
export const SPHERE_NODES = Object.freeze(SPHERE_BOARD.nodes);
export const SPHERE_START = Object.freeze(SPHERE_BOARD.start);
export const SPHERE_BOARD_SIZE = Object.freeze({ w: SPHERE_BOARD.w, h: SPHERE_BOARD.h });
export const SPHERE_SECTORS = Object.freeze(SPHERE_BOARD.sectors);

// もらえるポイント数。2026-07-12 FB「Lv100で2領域制覇できるくらい」:
// 盤面≈370ノード=1領域≈74なので、Lv100で150pt(=レベル×1.5)あれば2領域を踏破できる。
// 1ptあたりの効果は2/3に薄めてあり、同レベルの総合戦力は従来の較正と同等
// (ポイントは「広さ」に使い、強さの総量は変えない)。
export function perkMilestones(level) {
  return Math.floor((level * 3) / 2);
}

// ---- スキル習得の節目(こちらは従来どおりLv10ごと。兆しとは別カウント) ----
export const SKILL_PICK_INTERVAL = 10;

export function skillMilestones(level) {
  return Math.floor(level / SKILL_PICK_INTERVAL);
}

export function perkHash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h = (h ^ s.charCodeAt(i)) * 16777619;
    h >>>= 0;
  }
  return h;
}

// ---- 進化(2段階+隠し職 2026-07-11) ----
// 第1進化=Lv30(基本職→上位職 tier2)、第2進化=Lv60(上位職→最上位職 tier3)。
// 選択肢は毎回2つ: 「同系統の上位職」+「ランダム枠」(別系統の同ティア。まれにレア職=
// 1ティア上、超低確率で隠し職tier4が光る。個体×段の決定的ハッシュ=リセマラ不可)。
// ジョブ倍率は覚醒と同じく balance-sim の代表パーティに含めない「プレイヤー側の上振れ」。
// hue = 進化でキャラの絵の色が変わる(スプライトの色相シフト。見た目でも進化が分かる)。
export const EVOLVE_LEVELS = [30, 60]; // [第1進化, 第2進化]
// 2026-07-28 FB「進化の費用が安すぎてビビる」: 3000→12000(4倍)。
// 進化は個体の一生を決める節目なので、費用にも節目の重さを持たせる
// 2026-07-29 FB「進化の金額が安すぎ。10倍くらい。2回目はその10倍。レア度が高いほど高額に」
// 費用 = 星 × 基本 × 傾斜^(星-1) × 段倍率^進化段。
//   コモン第1進化 12万G(旧1.2万の10倍) / 第2進化 120万G(さらに10倍)
//   イモータル第1 ≈199万G / コズミック第1 ≈1190万G(レア度の傾斜1.35^(星-1))
export const EVOLVE_GOLD_PER_STAR = 120000;
export const EVOLVE_STAGE_MULT = 10; // 第2進化=第1の10倍
export const EVOLVE_RARITY_SLOPE = 1.35; // 星が1つ上がるごとの追い傾斜
// ランダム枠はさらに高額(2026-07-28 FB「ランダム性のあるほうはめっちゃ高額でいい」)。
// 25%で外れる賭けに大金を積む=当てたときの物語が濃くなる
export const EVOLVE_RANDOM_MULT = 4;

// ---- 進化石(2026-07-28 FB): 進化にはゴールドに加えてこの石が要る ----
// 同系統進化 = 進化先ジョブのロールに対応した石を1個。
// ランダム進化 = 激レアドロップの「ランダム進化石」を1個(外れても消える=賭けの重み)。
// キーは JOBS の role と同じ(nuke/guard/heal/buff)+ random。
// 2026-07-29 FB「アイコンかっこよくして」: 絵文字→宝石アート(tools/gen-stone-icons.py)。
// icon(絵文字)はログ等の文字だけの文脈用に残す
export const EVO_STONES = Object.freeze({
  nuke: { id: "nuke", label: "アタッカーの進化石", icon: "⚔", color: "#ff8a5a", img: "assets/ui/keys/stone_nuke.png" },
  guard: { id: "guard", label: "タンクの進化石", icon: "🛡", color: "#8ab8ff", img: "assets/ui/keys/stone_guard.png" },
  heal: { id: "heal", label: "ヒーラーの進化石", icon: "✚", color: "#8af0a8", img: "assets/ui/keys/stone_heal.png" },
  buff: { id: "buff", label: "バッファーの進化石", icon: "↑", color: "#ffd76a", img: "assets/ui/keys/stone_buff.png" },
  random: { id: "random", label: "ランダム進化石", icon: "❖", color: "#ff8ad8", img: "assets/ui/keys/stone_random.png" },
});
export const EVO_STONE_ROLES = Object.freeze(["nuke", "guard", "heal", "buff"]);
// 石のレア度は固定(2026-07-29 Haru指示「ジョブ進化石はイモータル、ランダム進化石は
// アルカナで」)。抽選制は同日中に廃止 — レア度は種類の格付けであって運の要素ではない。
// どちらも出品ゲート(レジェンド以上)を満たすので、全ての進化石が交易船に積める
export const EVO_STONE_RARITY = Object.freeze({
  nuke: "immortal", guard: "immortal", heal: "immortal", buff: "immortal",
  random: "arcana",
});
// ドロップ率(通常撃破)。ロール石は第1進化(Lv30)までに2〜3個貯まる程度、
// ランダム進化石は「数日に1個」の激レア(叡智の水晶と同格の扱い)
export const EVO_STONE_DROP_CHANCE = 0.0006;
export const EVO_STONE_RANDOM_CHANCE = 0.00004;
// 幕ボス(x-10)撃破は鍵制の一発勝負なので、ご褒美としてロール石が高確率で出る
export const EVO_STONE_BOSS_CHANCE = 0.35;
export const EVO_STONE_BOSS_RANDOM_CHANCE = 0.03;
// 2026-07-16 FB「当選率をもっと下げて劇レアでいいから、スキルをもっともっと強く」:
// レア職 8%→2.5%(1/40)、隠し職 1%→0.2%(1/500)。そのぶん専用スキルと島コアを大幅強化。
// 「持っている人を見かけたら自慢していい」水準の当選率に、性能もそれに見合う別格へ。
export const RARE_JOB_CHANCE = 0.025; // ランダム枠が固有レア職に化ける率(第1進化)
export const SKIP_JOB_CHANCE = 0.05; // ランダム枠で最上位職(tier3)へ飛び級する率(第1進化)
export const HIDDEN_JOB_CHANCE = 0.002; // 隠し職(tier4)が出る超低確率
// ランダム枠の「外れ」率(2026-07-11 FB): 進化せず費用だけ消える。確実な同系統との真のトレードオフ
export const EVOLVE_FAIL_CHANCE = 0.25;
// 第1進化のランダム枠は中身を伏せて「？？？」で見せる(開けてからのお楽しみ=賭けたくなる要素)

// ---- 極み(第3の節目 2026-07-11): 最上位職がLv90で迎える最後の選択 ----
// A「確実」= ステータス+15%/+15%。B「運命」= 高確率でそのまま、まれに
// 隠し職転職/覚醒+1/色違い化(いずれも1点ものの夢)。確率は開示する(ガチャ規制ポリシー)。
export const PINNACLE_LEVEL = 90;
export const PINNACLE_GOLD_PER_STAR = 9000;
export const PINNACLE_SOLID_MULT = Object.freeze({ atk: 1.15, hp: 1.15 });
// 隠し職は2026-07-16に劇レア化(8%→2%)。専用スキルをそれに見合う別格の強さにしたため
export const PINNACLE_GAMBLE = Object.freeze({ hidden: 0.02, awaken: 0.1, shiny: 0.1 }); // 残り78%=そのまま
const BASE_JOBS = {
  // ---- 第1進化(tier2・上位職) ----
  // 2026-07-13 FB「進化のステ変化が寂しい。全般的に上昇+ジョブ特性で伸び分化」:
  // 全職が攻撃/HPとも明確に上がり、さらにジョブ特性ステ(stat)が伸びる。
  // アタッカー=攻撃速度/会心 タンク=被ダメ軽減 ヒーラー=スキル威力/CD短縮 バッファー=CD短縮+周回
  berserker: { id: "berserker", label: "バーサーカー", role: "nuke", tier: 2, mult: { atk: 1.2, hp: 1.12 }, stat: { atkSpeed: 0.06, critRate: 0.03 }, hue: 18, desc: "攻撃+20% HP+12% ・攻撃速度+6% 会心+3%" },
  guardian: { id: "guardian", label: "ガーディアン", role: "guard", tier: 2, mult: { atk: 1.12, hp: 1.25 }, stat: { defCut: 0.05 }, hue: 195, desc: "HP+25% 攻撃+12% ・被ダメ-5%" },
  sage: { id: "sage", label: "セージ", role: "heal", tier: 2, mult: { atk: 1.12, hp: 1.15 }, stat: { skillPower: 0.15, cdr: 0.03 }, hue: 85, desc: "攻撃+12% HP+15% ・スキル威力+15% CD-3%" },
  warchief: { id: "warchief", label: "ウォーチーフ", role: "buff", tier: 2, mult: { atk: 1.15, hp: 1.12 }, stat: { cdr: 0.04 }, hue: 275, farm: { gold: 0.1, drop: 0.005 }, desc: "攻撃+15% HP+12% ・CD-4% ゴールド+10% 卵+0.5%" },
  // ---- レア職(tier2・rare。第1進化のランダム枠だけに出る固有職 2026-07-11) ----
  samurai: { id: "samurai", label: "サムライ", charName: "ムラサメ", role: "nuke", tier: 2, rare: true, mult: { atk: 1.32, hp: 1.12 }, stat: { atkSpeed: 0.09, critRate: 0.05 }, hue: 345, skillId: "iaigiri", desc: "攻撃+32% HP+12% ・攻撃速度+9% 会心+5% ・専用技【居合一閃】" },
  warden: { id: "warden", label: "ウォーデン", charName: "イワオウ", role: "guard", tier: 2, rare: true, mult: { atk: 1.15, hp: 1.42 }, stat: { defCut: 0.08 }, hue: 170, skillId: "earthfort", desc: "HP+42% 攻撃+15% ・被ダメ-8% ・専用技【大地の砦】" },
  druid: { id: "druid", label: "ドルイド", charName: "コダマ", role: "heal", tier: 2, rare: true, mult: { atk: 1.18, hp: 1.28 }, stat: { skillPower: 0.22, cdr: 0.05 }, hue: 105, skillId: "sylvanbless", desc: "攻撃+18% HP+28% ・スキル威力+22% CD-5% ・専用技【森羅の祝福】" },
  onmyoji: { id: "onmyoji", label: "陰陽師", charName: "ミコネコ", role: "buff", tier: 2, rare: true, mult: { atk: 1.25, hp: 1.2 }, stat: { cdr: 0.06 }, hue: 260, skillId: "onmyodo", farm: { gold: 0.15, drop: 0.01 }, desc: "攻撃+25% HP+20% ・CD-6% ゴールド+15% 卵+1% ・専用技【陰陽道】" },
  // ---- 第2進化(tier3・最上位職) ----
  dragoon: { id: "dragoon", label: "ドラグーン", role: "nuke", tier: 3, mult: { atk: 1.45, hp: 1.22 }, stat: { atkSpeed: 0.12, critRate: 0.06 }, hue: 35, desc: "攻撃+45% HP+22% ・攻撃速度+12% 会心+6%" },
  paladin: { id: "paladin", label: "パラディン", role: "guard", tier: 3, mult: { atk: 1.22, hp: 1.6 }, stat: { defCut: 0.1 }, hue: 215, desc: "HP+60% 攻撃+22% ・被ダメ-10%" },
  saint: { id: "saint", label: "セイント", role: "heal", tier: 3, mult: { atk: 1.3, hp: 1.4 }, stat: { skillPower: 0.3, cdr: 0.06 }, hue: 120, desc: "攻撃+30% HP+40% ・スキル威力+30% CD-6%" },
  overlord: { id: "overlord", label: "オーバーロード", role: "buff", tier: 3, mult: { atk: 1.35, hp: 1.35 }, stat: { cdr: 0.08 }, hue: 305, farm: { gold: 0.2, drop: 0.015, exp: 0.1 }, desc: "攻撃+35% HP+35% ・CD-8% ゴールド+20% 卵+1.5% EXP+10%" },
  // ---- 隠し職(tier4・超低確率の夢枠。名前は虹色表示。専用スキル+専用島つき) ----
  godhand: { id: "godhand", label: "ゴッドハンド", charName: "コンゴウ", role: "nuke", tier: 4, hidden: true, mult: { atk: 1.9, hp: 1.4 }, stat: { atkSpeed: 0.2, critRate: 0.1 }, hue: 55, skillId: "godfist", desc: "攻撃+90% HP+40% ・攻撃速度+20% 会心+10% ・専用技【神々の一撃】" },
  titan: { id: "titan", label: "ティターン", charName: "アトラス", role: "guard", tier: 4, hidden: true, mult: { atk: 1.4, hp: 2.1 }, stat: { defCut: 0.15 }, hue: 240, skillId: "unsinkable", desc: "HP+110% 攻撃+40% ・被ダメ-15% ・専用技【不沈】" },
  seraph: { id: "seraph", label: "セラフ", charName: "セラフィ", role: "heal", tier: 4, hidden: true, mult: { atk: 1.55, hp: 1.7 }, stat: { skillPower: 0.5, cdr: 0.1 }, hue: 150, skillId: "heavenlight", desc: "攻撃+55% HP+70% ・スキル威力+50% CD-10% ・専用技【天光】" },
  hao: { id: "hao", label: "覇皇", charName: "ハクオウ", role: "buff", tier: 4, hidden: true, mult: { atk: 1.7, hp: 1.6 }, stat: { cdr: 0.12 }, hue: 330, skillId: "hadou", farm: { gold: 0.35, drop: 0.03, exp: 0.2 }, desc: "攻撃+70% HP+60% ・CD-12% ゴールド+35% 卵+3% EXP+20% ・専用技【覇道】" },
};
// 内蔵ジョブ + 自動生成ジョブ(content-pack)をマージ。生成ジョブは倍率を安全帯にクランプ
// (tier2の内蔵帯 1.05〜1.35)。tier2非レアなら進化のランダム枠に自動で載る。
export const JOBS = Object.freeze({
  ...BASE_JOBS,
  ...Object.fromEntries(
    EXTRA_JOBS.filter((j) => j && j.id && !BASE_JOBS[j.id]).map((j) => [
      j.id,
      {
        ...j,
        tier: 2,
        rare: false,
        hidden: false,
        mult: {
          atk: clampNum(j.mult?.atk, 1.05, 1.35, 1.15),
          hp: clampNum(j.mult?.hp, 1.05, 1.35, 1.12),
        },
        hue: clampNum(j.hue, 0, 359, 0),
        generated: true,
      },
    ]),
  ),
});
export function jobOf(mon) {
  return JOBS[mon?.job] ?? null;
}
export function jobMult(mon, key) {
  return jobOf(mon)?.mult?.[key] ?? 1;
}
// ジョブ特性の加算ステ(攻撃速度/会心/被ダメ軽減/スキル威力/CD短縮 2026-07-13)
export function jobStat(mon, key) {
  return jobOf(mon)?.stat?.[key] ?? 0;
}

// ---- 図鑑バフ(2026-07-16 FB「図鑑を埋めた%に応じてバフ+1種ごとの個別バフ。
//      いらないキャラがいなくなる=集める楽しさを実装したい」) ----
// 1種登録するごとに、その種族のテーマ(スキルの型)に沿った小さなバフが恒久で付く。
// 手書き156個は破綻するので決定的に自動導出(スキル型×星)。週次の新種にも自動で付く。
//   攻撃型(nuke)→攻撃 / 守り型(guard)・回復型(heal)→最大HP / 支援型(buff)→ゴールド
//   値 = 0.05% × 星(★1=0.05%…★10=0.5%。支援のゴールドは4倍スケール)
// さらに図鑑の達成率の節目で追加ボーナス。合計には上限(キャップ)があり、
// 週次で種族が増えても(+101種/年)インフレしない。
// drop だけ Infinity(=上限なし)。2026-08-13 Haru指示で卵ドロップだけが
// 「基本率に掛ける倍率」へ変わり(partyDropBonus/eggDropChance)、積んでも
// 実効率が基本率の1.65倍程度にしかならなくなったため歯止めが不要になった。
// 他の4つ(atk/hp/gold/exp)は従来どおりの加算式なので上限は据え置く
export const DEX_BUFF_CAPS = Object.freeze({ atk: 0.12, hp: 0.12, gold: 0.6, drop: Infinity, exp: 0.15 });
export const DEX_MILESTONES = Object.freeze([
  { pct: 0.1, label: "10%達成", desc: "ゴールド +5%", gold: 0.05 },
  { pct: 0.25, label: "25%達成", desc: "卵ドロップ +0.5%", drop: 0.005 },
  { pct: 0.5, label: "50%達成", desc: "経験値 +10%", exp: 0.1 },
  { pct: 0.75, label: "75%達成", desc: "攻撃 +3%", atk: 0.03 },
  { pct: 1.0, label: "コンプリート", desc: "攻撃 +5% 最大HP +5%", atk: 0.05, hp: 0.05 },
]);
// 2026-07-17 FB「キャラごとに図鑑バフは異なるように」: 役割で寄せつつ、
// 同役割でも種族idの決定的ハッシュで「効果先(3枠)」と「大きさ(×0.7〜1.3)」を散らす。
// 同じ「攻撃+0.15%」が並ぶ図鑑にならない=1種1種が固有の贈り物になる
const DEX_BUFF_POOLS = Object.freeze({
  nuke: ["atk", "atk", "exp"],
  guard: ["hp", "hp", "gold"],
  heal: ["hp", "exp", "hp"],
  buff: ["gold", "drop", "gold"],
});
const DEX_BUFF_BASE = Object.freeze({ atk: 0.0005, hp: 0.0005, gold: 0.002, drop: 0.00002, exp: 0.001 });
const DEX_BUFF_LABEL = Object.freeze({ atk: "攻撃", hp: "最大HP", gold: "ゴールド", drop: "卵ドロップ", exp: "経験値" });
export function dexBuffOf(speciesId) {
  const sp = SPECIES[speciesId];
  if (!sp) return null;
  const stars = RARITY_META[sp.rarity]?.stars ?? 1;
  const type = SKILLS[sp.skillId]?.active?.type ?? "nuke";
  const h = perkHash(`dexbuff:${speciesId}`);
  const stat = (DEX_BUFF_POOLS[type] ?? DEX_BUFF_POOLS.nuke)[h % 3];
  const jitter = 0.7 + ((h >> 4) % 61) / 100; // 0.70〜1.30(決定的)
  const value = DEX_BUFF_BASE[stat] * stars * jitter;
  const pct = Math.round(value * 10000) / 100; // 0.01%刻み
  return { stat, value, label: `${DEX_BUFF_LABEL[stat]} +${pct}%` };
}
// 図鑑全体の合計(dex = state.dex の {speciesId: true} マップ)。キャップ適用済みの値を返す
export function dexTotals(dex) {
  const sum = { atk: 0, hp: 0, gold: 0, drop: 0, exp: 0 };
  let count = 0;
  for (const id of Object.keys(dex ?? {})) {
    const b = dexBuffOf(id);
    if (!b) continue;
    count++;
    sum[b.stat] += b.value;
  }
  const total = Object.keys(SPECIES).length;
  const pct = total > 0 ? count / total : 0;
  const hit = DEX_MILESTONES.filter((m) => pct >= m.pct);
  for (const m of hit) {
    for (const k of Object.keys(sum)) sum[k] += m[k] ?? 0;
  }
  for (const k of Object.keys(sum)) sum[k] = Math.min(DEX_BUFF_CAPS[k], sum[k]);
  return { ...sum, count, total, pct, milestones: hit.length };
}

// ---- スキル習得(Lv10ごとの2択) ----

// スキルのレア度星(そのスキルを持つ種族のうち最小の星)。遅延構築でSPECIES定義順に依存しない。
// 種族が持たないレアスキルは RARE_SKILL_STARS の明示値を使う。
let _skillStars = null;
export function skillStars(skillId) {
  if (RARE_SKILL_STARS[skillId]) return RARE_SKILL_STARS[skillId];
  if (!_skillStars) {
    _skillStars = {};
    for (const sp of Object.values(SPECIES)) {
      const stars = RARITY_META[sp.rarity].stars;
      _skillStars[sp.skillId] = Math.min(_skillStars[sp.skillId] ?? 99, stars);
    }
  }
  return _skillStars[skillId] ?? 1;
}

// スキルの属性(そのスキルを持つ種族のうち最小星の種族の属性)。skillStarsと同じ遅延構築。
// 種族が持たないレアスキル(RARE_SKILL_STARSのみ)は属性なし=どの属性にも係数1で扱う。
let _skillElements = null;
export function skillElement(skillId) {
  if (!_skillElements) {
    _skillElements = {};
    const bestStars = {};
    for (const sp of Object.values(SPECIES)) {
      const stars = RARITY_META[sp.rarity].stars;
      if (stars < (bestStars[sp.skillId] ?? 99)) {
        bestStars[sp.skillId] = stars;
        _skillElements[sp.skillId] = sp.element;
      }
    }
  }
  return _skillElements[skillId] ?? null;
}

// 2択のうち1枠が「レア枠」(自分の星を超えるスキル)に化ける確率。
// 実際は決定的ハッシュによる擬似乱数(同じ個体×節目なら常に同じ結果)。
// 高レアの個体ほどレア枠が出やすい(2026-07-10: ★1=約9% → ★10=約20%)。
export const RARE_CHOICE_CHANCE = 0.08;
export function rareChoiceChance(ownStars) {
  return RARE_CHOICE_CHANCE + (ownStars ?? 1) * 0.012;
}

// 習得候補の重み。属性一致のスキルを3倍優遇し、高レア個体ほど高星スキルを重く引く
// (★10個体なら★8スキルの重みは★1スキルの約8倍。★1個体はほぼフラット)。
function skillChoiceWeight(id, ownStars, element) {
  const elemW = element && skillElement(id) === element ? 3 : 1;
  const starW = 1 + Math.max(0, skillStars(id) - 1) * ((ownStars ?? 1) / 10);
  return Math.max(1, Math.round(elemW * starW * 10));
}

// 節目 milestone(1はじまり)の習得2択を決定的に返す。
// 候補: 自分の星+1までのスキルから、まだ覚えていないもの。選び直しは不可。
// まれに(RARE_CHOICE_CHANCE)2枠目が星+2〜+4の「レアスキル枠」に化ける。
// role: このタスモンのジョブ(nuke/heal/guard/buff)。ジョブに沿ったスキルだけを提示する
// (2026-07-09「ジョブと覚えるスキルを統一」):
//   ・アタッカー(nuke): 攻撃スキルのみ(回復を覚えない)
//   ・ヒーラー/タンク/バッファー: 自ジョブのスキル + 攻撃スキル(独自のアタックも持てる)
export function allowedSkillTypes(role) {
  return role === "nuke" ? ["nuke"] : [role, "nuke"];
}
// element: このタスモンの属性。属性一致スキルが優先候補になる(2026-07-10)。
export function skillChoices(monsterId, milestone, ownStars, learned = [], role = "nuke", element = null) {
  const allowed = allowedSkillTypes(role);
  const inRole = (id) => allowed.includes(SKILLS[id]?.active?.type);
  // 効果の「型」= type+kind(単体/全体/継続/吸収/とどめ/加速/会心/結界/回復/かばう/強化)。
  // 覚えている型と同型のスキルは候補から外す=効果かぶり防止(2026-07-11 FB)。
  // ただし外し切ってプールが痩せたら同型も許す(選べないよりまし)
  const comboOf = (id) => `${SKILLS[id]?.active?.type}:${SKILLS[id]?.active?.kind ?? "single"}`;
  const learnedCombos = new Set(learned.map(comboOf));
  const basePool = Object.keys(SKILLS)
    .filter((id) => inRole(id))
    .filter((id) => !SKILLS[id].jobOnly) // ジョブ専用スキルは習得2択に出ない(2026-07-11)
    .filter((id) => !SKILLS[id].enhanceOnly) // 細工限定スキルも出ない(2026-07-21)
    .filter((id) => !SKILLS[id].signature) // 種族固有スキルは他種族の習得2択に出ない(2026-08-07)
    .filter((id) => skillStars(id) <= ownStars + 1)
    .filter((id) => !learned.includes(id))
    .sort();
  const freshPool = basePool.filter((id) => !learnedCombos.has(comboOf(id)));
  const pool = freshPool.length >= 2 ? freshPool : basePool;
  if (pool.length <= 2) return pool;
  // 重み付き決定的抽選(属性一致×3・高レア個体ほど高星スキル寄り)。
  // 同じ個体×節目なら常に同じ2択(選び直し不可)は従来どおり。
  const weights = pool.map((id) => skillChoiceWeight(id, ownStars, element));
  const total = weights.reduce((a, b) => a + b, 0);
  const pickAt = (h) => {
    let r = h % total;
    for (let i = 0; i < pool.length; i++) {
      r -= weights[i];
      if (r < 0) return pool[i];
    }
    return pool[pool.length - 1];
  };
  const picked = [];
  let h = perkHash(`skill:${monsterId}:${milestone}`);
  let guard = 0;
  while (picked.length < 2 && guard++ < 64) {
    const id = pickAt(h);
    if (!picked.includes(id)) picked.push(id);
    h = (h * 1664525 + 1013904223) >>> 0;
  }
  for (const id of pool) {
    if (picked.length >= 2) break;
    if (!picked.includes(id)) picked.push(id); // 重みの偏りで2つ目が出なかった保険
  }
  // レア枠の抽選(高揚感: 「この2択、片方が光ってる!」)。高レア個体ほど出やすい
  const rh = perkHash(`rare:${monsterId}:${milestone}`);
  if ((rh % 1000) / 1000 < rareChoiceChance(ownStars)) {
    const rarePool = Object.keys(SKILLS)
      .filter((id) => inRole(id))
      .filter((id) => !SKILLS[id].jobOnly)
      .filter((id) => !SKILLS[id].enhanceOnly)
      .filter((id) => {
        const s = skillStars(id);
        return s >= ownStars + 2 && s <= ownStars + 4;
      })
      .filter((id) => !learned.includes(id))
      .sort();
    if (rarePool.length > 0) {
      // レア枠内も属性一致を優遇(一致スキルがあれば3倍の重み)
      const rw = rarePool.map((id) => (element && skillElement(id) === element ? 3 : 1));
      const rTotal = rw.reduce((a, b) => a + b, 0);
      let r = rh % rTotal;
      let rPick = rarePool[rarePool.length - 1];
      for (let i = 0; i < rarePool.length; i++) {
        r -= rw[i];
        if (r < 0) {
          rPick = rarePool[i];
          break;
        }
      }
      picked[1] = rPick;
    }
  }
  return picked;
}

// ---- 覚醒個体 ----
// 孵化時の低確率抽選で生まれる特別個体。ステータス激変+スキルが「真・」に覚醒する。
// 覚醒した親を配合に使うほど子の覚醒率が上がり、両親覚醒のときだけ二重覚醒(+2)の芽がある。
// 覚醒個体は「引いた瞬間ゲームが変わる別次元の当たり」。2026-07-10 方針:
// 演出でなく“強さそのもの”を極端にして射幸性を出す。倍率・スキルを大幅強化し、
// 究極の追い求め枠として 三重覚醒(Lv3) を追加(両親とも二重覚醒からのみ)。
// ※覚醒は balance-sim の代表パーティ(非覚醒のティア平均)に含まれない=数値を上げても
//   バランスゲートは緑のまま。あくまで「格上を引けた時だけ無双」の力技ルート。
// ---- 覚醒6段化(2026-07-16: 原神の凸方式を輸入) ----
// 3段 → 6段。**天井(覚醒6)は旧・三重覚醒(DPS x60)から1ミリも動かさない**。
// 素直に「1〜6を天井x60に等分」すると旧覚醒3が x60→x7.8 の -87% になり、
// TBHの後出しナーフ(Botに効かず正規プレイヤーだけ殴りレビュー爆撃)と同じ轍を踏む。
// そこで **旧n → 新2n** に読み替える移行(deserialize)と対になった曲線にする:
//   新2 = 旧1(x4.5) / 新4 = 旧2(x15.4) / 新6 = 旧3(x60) ← 誰も1ミリも損しない
//   新1/3/5 = その間の幾何補間(x2.12 / x8.31 / x30.4)= 重複を重ねて届く新しい段
// 野生0.5%/色違い/極みは「+2段」にすることで、CLAUDE.mdの
// 「引いた瞬間ゲームが変わる別次元の当たり」も従来どおりの強さで保たれる。
// ※覚醒は balance-sim の代表パーティ(非覚醒のティア平均)に含まれない=数値を上げても
//   バランスゲートは緑のまま。天井を動かさないのはこのガードが効かないからでもある。
export const AWAKEN_MAX = 6;
export const AWAKENING = Object.freeze({
  // 覚醒抽選の確率(親の覚醒数 0/1/2 別)
  // 2026-08-11 Haru指示「覚醒個体と色違いの排出率を逆にして」: SHINY_CHANCE_WILD参照
  chanceWild: 0.008,
  chanceBred: [0.02, 0.08, 0.25],
  // 両親覚醒時のみ、覚醒した子が二重覚醒に昇格する確率
  doubleChance: 0.2,
  // 両親とも二重覚醒のときだけ、二重覚醒の子が三重覚醒へ昇格する確率(最上位の夢枠)
  tripleChance: 0.12,
  // 「生まれつきの特別」が与える段数(野生抽選・色違い・極み)。
  // 2026-07-17 FB「最初の覚醒は1でいい、飛び級いらない」: 2→1。
  // 生まれつきは覚醒Ⅰから始まり、同種を重ねて1段ずつ登る(原神の凸と同じ体験)。
  // ※旧セーブの移行(旧n→新2n)はこれと無関係に awRev が守る(既存個体は据え置き)
  bornStep: 1,
  // ステータス倍率(覚醒1〜6)。偶数段が旧1/2/3と完全一致する。
  mult: {
    1: { atk: 1.41, hp: 1.26 },
    2: { atk: 2.0, hp: 1.6 }, // = 旧・覚醒1
    3: { atk: 2.61, hp: 1.96 },
    4: { atk: 3.4, hp: 2.4 }, // = 旧・二重覚醒
    5: { atk: 4.52, hp: 3.1 },
    6: { atk: 6.0, hp: 4.0 }, // = 旧・三重覚醒(天井は動かさない)
  },
  // スキル覚醒(威力倍率・クールダウン倍率)。
  skill: {
    1: { power: 1.34, cooldown: 0.89 },
    2: { power: 1.8, cooldown: 0.8 }, // = 旧・覚醒1
    3: { power: 2.25, cooldown: 0.7 },
    4: { power: 2.8, cooldown: 0.62 }, // = 旧・二重覚醒
    5: { power: 3.55, cooldown: 0.53 },
    6: { power: 4.5, cooldown: 0.45 }, // = 旧・三重覚醒
  },
  // パーティ全体への周回ボーナス(1体あたり)
  dropBonus: { 1: 0.015, 2: 0.03, 3: 0.04, 4: 0.05, 5: 0.065, 6: 0.08 },
  goldBonus: { 1: 0.05, 2: 0.1, 3: 0.15, 4: 0.2, 5: 0.27, 6: 0.35 },
  // ソフトキャップ(スノーボール防止)。
  // dropBonusCap は 2026-08-13 に撤廃(Haru指示「キャップ外して乗算式にしようか」)。
  // 卵ドロップが「基本率×(1+ボーナス)」の乗算式になり、積んでも実効率が基本率の
  // 1.65倍程度で頭打ちになる=雪だるま式が構造的に起きないため歯止めが不要になった。
  // ゴールドは従来どおり加算式なので上限は据え置く(partyGoldBonus)
  goldBonusCap: 1.2,
  // 特別個体は個体値も別格に優秀(下限を引き上げ。各卵の上限までクランプ)。
  // 野生は通常上限1.15まで、配合卵は1.3まで=覚醒はほぼS〜SSランク確定。
  ivFloor: { 1: 1.06, 2: 1.12, 3: 1.17, 4: 1.22, 5: 1.26, 6: 1.3 },
  // 表示メタ。6段のハシゴになったので二重/三重でなく通し番号で呼ぶ
  label: { 1: "覚醒Ⅰ", 2: "覚醒Ⅱ", 3: "覚醒Ⅲ", 4: "覚醒Ⅳ", 5: "覚醒Ⅴ", 6: "覚醒Ⅵ" },
  color: "#ff5f3f",
});

// ---- スキル ----
// active: クールダウン(秒)ごとに自動発動するアクティブ効果。
//   type "nuke": 発動者の攻撃力 × power の追加ダメージ(crit:true なら会心表示)
//   type "heal": パーティ最大HP × power を回復
//   type "buff": duration 秒のあいだ パーティ攻撃 × (1+power)
//   type "guard": duration 秒のあいだ 被ダメ × (1-power)。counter があれば
//                 かばっている間に攻撃してきた敵へ 攻撃×counter の反撃
//   heal を併せ持つ nuke もある(レジェンダリー)。
// 職業の色: アタッカー=nuke / ヒーラー=heal(自動回復は無いので生命線) /
//           タンク=guard(かばう) / バッファー=buff
// passive: 常時かかる補正。atkMult/hpMult は本人のステータス、
//          dropBonus/goldBonus はパーティ全体に加算される割合。
const BASE_SKILLS = {
  fang: {
    id: "fang",
    name: "かえんぎば",
    active: { type: "nuke", fx: "slash", power: 3.0, color: "#ff6a2a" },
    cooldown: 6,
    passive: { atkMult: 1.1 },
    desc: "6秒ごと: 敵に 攻撃×3.0 の炎ダメージ / 攻撃 +10%",
    tiers: [
      { name: "かえんぎば", power: 4.5, cooldown: 6, desc: "6秒ごと: 8秒かけて合計 攻撃×4.5 の継続ダメージ / 攻撃 +10%" },
      { name: "かえんぎば・改", power: 5.6, cooldown: 5, desc: "5秒ごと: 8秒かけて合計 攻撃×5.6 の継続ダメージ / 攻撃 +10%" },
      { name: "かえんぎば・皆伝", power: 7, cooldown: 5, desc: "5秒ごと: 8秒かけて合計 攻撃×7 の継続ダメージ / 攻撃 +10%" },
    ],
    signature: true,
  },
  aquaveil: {
    id: "aquaveil",
    name: "いやしのみず",
    active: { type: "heal", power: 0.14, color: "#5bc0eb" },
    cooldown: 7,
    passive: { hpMult: 1.15 },
    desc: "7秒ごと: パーティHPを 14% 回復 / 最大HP +15%",
  },
  hardshell: {
    id: "hardshell",
    name: "まもりのから",
    active: { type: "guard", power: 0.35, duration: 4, color: "#8bc34a" },
    cooldown: 8,
    passive: { hpMult: 1.1, dropBonus: 0.02 },
    desc: "8秒ごと: 4秒間 かばう(被ダメ -35%) / 最大HP +10% ドロップ +2%",
  },
  galeedge: {
    id: "galeedge",
    name: "かぜのやいば",
    active: { type: "nuke", fx: "slash", power: 4.0, crit: true, color: "#90dbf4" },
    cooldown: 5,
    passive: {},
    desc: "5秒ごと: 敵に 攻撃×4.0(必ず会心)",
  },
  volt: {
    id: "volt",
    name: "サンダーボルト",
    active: { type: "nuke", fx: "beam", power: 4.5, color: "#ffe600" },
    cooldown: 6,
    passive: { atkMult: 1.08 },
    desc: "6秒ごと: 敵に 攻撃×4.5 の電撃 / 攻撃 +8%",
  },
  inferno: {
    id: "inferno",
    name: "業火の息吹",
    active: { type: "nuke", fx: "rain", power: 7.0, color: "#ff3020" },
    cooldown: 5,
    passive: { atkMult: 1.15 },
    desc: "5秒ごと: 敵に 攻撃×7.0 の業火 / 攻撃 +15%",
  },
  goldenaura: {
    id: "goldenaura",
    name: "黄金のしんか",
    active: { type: "nuke", fx: "nova", power: 12, heal: 0.25, color: "#ffcf4a" },
    cooldown: 8,
    passive: { atkMult: 1.2, hpMult: 1.2, dropBonus: 0.05, goldBonus: 0.3 },
    // 「全能力強化」は何がどれだけ強くなるか確認できない曖昧表現だったので実値に(2026-07-15 FB)
    desc: "8秒ごと: 敵に 攻撃×12 + パーティHP25%回復 / 攻撃 +20% 最大HP +20% ドロップ +5% ゴールド +30%",
    tiers: [
      { name: "黄金のしんか", power: 12, cooldown: 8, desc: "8秒ごと: 敵に 攻撃×12 + パーティHP25%回復 / 攻撃 +20% 最大HP +20% ドロップ +5% ゴールド +30%" },
      { name: "黄金のしんか・改", power: 15, cooldown: 7, desc: "7秒ごと: 敵に 攻撃×15 + パーティHP25%回復 / 攻撃 +20% 最大HP +20% ドロップ +5% ゴールド +30%" },
      { name: "黄金のしんか・皆伝", power: 18.6, cooldown: 6, desc: "6秒ごと: 敵に 攻撃×18.6 + パーティHP25%回復 / 攻撃 +20% 最大HP +20% ドロップ +5% ゴールド +30%" },
    ],
    signature: true,
  },
  shadowfang: {
    id: "shadowfang",
    name: "かげのキバ",
    active: { type: "nuke", fx: "slash", power: 3.5, color: "#9a6ae0" },
    cooldown: 5,
    passive: {},
    desc: "5秒ごと: 敵に 攻撃×3.5 の影撃",
    tiers: [
      { name: "かげのキバ", power: 3.5, cooldown: 5, desc: "5秒ごと: 敵に 攻撃×3.5 の影撃" },
      { name: "かげのキバ・改", power: 4.4, cooldown: 5, desc: "5秒ごと: 敵に 攻撃×4.4 の影撃" },
      { name: "かげのキバ・皆伝", power: 5.4, cooldown: 4, desc: "4秒ごと: 敵に 攻撃×5.4 の影撃" },
    ],
    signature: true,
  },
  rockguard: {
    id: "rockguard",
    name: "いわのまもり",
    active: { type: "guard", power: 0.4, duration: 5, color: "#b08a58" },
    cooldown: 9,
    passive: { hpMult: 1.2 },
    desc: "9秒ごと: 5秒間 かばう(被ダメ -40%) / 最大HP +20%",
  },
  stinger: {
    id: "stinger",
    name: "でんげきばり",
    active: { type: "nuke", fx: "shot", power: 3.0, crit: true, color: "#ffd84a" },
    cooldown: 4,
    passive: {},
    desc: "4秒ごと: 敵に 攻撃×3.0(必ず会心)",
  },
  frostfang: {
    id: "frostfang",
    name: "こおりのキバ",
    active: { type: "nuke", fx: "slash", power: 4.5, color: "#7ad0f0" },
    cooldown: 6,
    passive: { hpMult: 1.1 },
    desc: "6秒ごと: 敵に 攻撃×4.5 の氷撃 / 最大HP +10%",
    tiers: [
      { name: "こおりのキバ", power: 4.3, cooldown: 6, desc: "6秒ごと: 敵に 攻撃×4.3(HP35%未満の敵には ×9.9 のトドメ) / 最大HP +10%" },
      { name: "こおりのキバ・改", power: 5.4, cooldown: 5, desc: "5秒ごと: 敵に 攻撃×5.4(HP35%未満の敵には ×12.4 のトドメ) / 最大HP +10%" },
      { name: "こおりのキバ・皆伝", power: 6.7, cooldown: 5, desc: "5秒ごと: 敵に 攻撃×6.7(HP35%未満の敵には ×15.4 のトドメ) / 最大HP +10%" },
    ],
    signature: true,
  },
  bloom: {
    id: "bloom",
    name: "いやしのはな",
    active: { type: "heal", power: 0.2, color: "#ff8ab8" },
    cooldown: 7,
    passive: { dropBonus: 0.03 },
    desc: "7秒ごと: パーティHPを 20% 回復 / 卵ドロップ +3%",
  },
  darkwind: {
    id: "darkwind",
    name: "やみのかぜ",
    active: { type: "nuke", fx: "slash", power: 5.0, crit: true, color: "#8a6ab8" },
    cooldown: 5,
    passive: {},
    desc: "5秒ごと: 敵に 攻撃×5.0(必ず会心)",
  },
  abysscall: {
    id: "abysscall",
    name: "しんかいのさけび",
    active: { type: "nuke", fx: "nova", power: 6.5, heal: 0.1, color: "#5ad0e8" },
    cooldown: 6,
    passive: { goldBonus: 0.1 },
    desc: "6秒ごと: 敵に 攻撃×6.5 + HP10%回復 / ゴールド +10%",
  },
  gaiawall: {
    id: "gaiawall",
    name: "だいちのかべ",
    active: { type: "guard", power: 0.55, duration: 5, counter: 0.8, color: "#7aa848" },
    cooldown: 8,
    passive: { hpMult: 1.25, dropBonus: 0.03 },
    desc: "8秒ごと: 5秒間 かばう(被ダメ -55%)+攻撃×0.8で反撃 / 最大HP +25% ドロップ +3%",
  },
  voidbreath: {
    id: "voidbreath",
    name: "虚空の息吹",
    active: { type: "nuke", fx: "nova", power: 11, color: "#ff58c8" },
    cooldown: 7,
    passive: { atkMult: 1.25, hpMult: 1.1, dropBonus: 0.05, goldBonus: 0.25 },
    desc: "7秒ごと: 敵に 攻撃×11 の虚空撃 / 全能力強化",
    tiers: [
      { name: "虚空の息吹", power: 10.4, cooldown: 7, desc: "7秒ごと: 敵に 攻撃×10.4(HP35%未満の敵には ×23.9 のトドメ) / 攻撃 +25% 最大HP +10% ドロップ +5% ゴールド +25%" },
      { name: "虚空の息吹・改", power: 13, cooldown: 6, desc: "6秒ごと: 敵に 攻撃×13(HP35%未満の敵には ×29.9 のトドメ) / 攻撃 +25% 最大HP +10% ドロップ +5% ゴールド +25%" },
      { name: "虚空の息吹・皆伝", power: 16.1, cooldown: 6, desc: "6秒ごと: 敵に 攻撃×16.1(HP35%未満の敵には ×37 のトドメ) / 攻撃 +25% 最大HP +10% ドロップ +5% ゴールド +25%" },
    ],
    signature: true,
  },
  prismveil: {
    id: "prismveil",
    name: "プリズムのいやし",
    active: { type: "heal", power: 0.25, color: "#ffb8e8" },
    cooldown: 6,
    passive: { dropBonus: 0.05, goldBonus: 0.15 },
    desc: "6秒ごと: パーティHPを 25% 回復 / ドロップ +5% ゴールド +15%",
    tiers: [
      { name: "プリズムのいやし", power: 0.35, cooldown: 6, desc: "6秒ごと: 8秒かけて パーティHPを合計 35% 回復(リジェネ) / ドロップ +5% ゴールド +15%" },
      { name: "プリズムのいやし・改", power: 0.42, cooldown: 5, desc: "5秒ごと: 8秒かけて パーティHPを合計 42% 回復(リジェネ) / ドロップ +5% ゴールド +15%" },
      { name: "プリズムのいやし・皆伝", power: 0.51, cooldown: 5, desc: "5秒ごと: 8秒かけて パーティHPを合計 51% 回復(リジェネ) / ドロップ +5% ゴールド +15%" },
    ],
    signature: true,
  },
  stormcall: {
    id: "stormcall",
    name: "らいうのほうこう",
    active: { type: "nuke", fx: "rain", power: 9, color: "#8ac8ff" },
    cooldown: 5,
    passive: { atkMult: 1.2 },
    desc: "5秒ごと: 敵に 攻撃×9 の雷雨 / 攻撃 +20%",
    tiers: [
      { name: "らいうのほうこう", power: 6.8, cooldown: 5, desc: "5秒ごと: 敵に 攻撃×6.8 +与ダメの50%をパーティHPに吸収 / 攻撃 +20%" },
      { name: "らいうのほうこう・改", power: 8.5, cooldown: 5, desc: "5秒ごと: 敵に 攻撃×8.5 +与ダメの50%をパーティHPに吸収 / 攻撃 +20%" },
      { name: "らいうのほうこう・皆伝", power: 10.5, cooldown: 4, desc: "4秒ごと: 敵に 攻撃×10.5 +与ダメの50%をパーティHPに吸収 / 攻撃 +20%" },
    ],
    signature: true,
  },
  chronoshift: {
    id: "chronoshift",
    name: "ときのしはい",
    // センチュリー帯唯一のアタッカースキル(帯に火力が1つもないと編成が詰むため nuke)
    active: { type: "nuke", fx: "nova", power: 13, color: "#f0e0b0" },
    cooldown: 6,
    passive: { hpMult: 1.2, goldBonus: 0.2 },
    desc: "6秒ごと: 敵に 攻撃×13 の時震 / 最大HP +20% ゴールド +20%",
    tiers: [
      { name: "ときのしはい", power: 19.5, cooldown: 6, desc: "6秒ごと: 8秒かけて合計 攻撃×19.5 の継続ダメージ / 最大HP +20% ゴールド +20%" },
      { name: "ときのしはい・改", power: 24.4, cooldown: 5, desc: "5秒ごと: 8秒かけて合計 攻撃×24.4 の継続ダメージ / 最大HP +20% ゴールド +20%" },
      { name: "ときのしはい・皆伝", power: 30.2, cooldown: 5, desc: "5秒ごと: 8秒かけて合計 攻撃×30.2 の継続ダメージ / 最大HP +20% ゴールド +20%" },
    ],
    signature: true,
  },
  relicaegis: {
    id: "relicaegis",
    name: "いにしえのまもり",
    active: { type: "heal", power: 0.3, color: "#c8c0a8" },
    cooldown: 8,
    passive: { hpMult: 1.4, dropBonus: 0.05 },
    desc: "8秒ごと: パーティHPを 30% 回復 / 最大HP +40% ドロップ +5%",
    tiers: [
      { name: "いにしえのまもり", power: 0.42, cooldown: 8, desc: "8秒ごと: 8秒かけて パーティHPを合計 42% 回復(リジェネ) / 最大HP +40% ドロップ +5%" },
      { name: "いにしえのまもり・改", power: 0.5, cooldown: 7, desc: "7秒ごと: 8秒かけて パーティHPを合計 50% 回復(リジェネ) / 最大HP +40% ドロップ +5%" },
      { name: "いにしえのまもり・皆伝", power: 0.61, cooldown: 6, desc: "6秒ごと: 8秒かけて パーティHPを合計 61% 回復(リジェネ) / 最大HP +40% ドロップ +5%" },
    ],
    signature: true,
  },
  nebulaflare: {
    id: "nebulaflare",
    name: "せいうんのきらめき",
    active: { type: "nuke", fx: "nova", power: 13, heal: 0.15, color: "#ff8ad8" },
    cooldown: 6,
    passive: { dropBonus: 0.06, goldBonus: 0.3 },
    desc: "6秒ごと: 敵に 攻撃×13 + HP15%回復 / ドロップ +6% ゴールド +30%",
    tiers: [
      { name: "せいうんのきらめき", power: 12.3, cooldown: 6, desc: "6秒ごと: 敵に 攻撃×12.3(HP35%未満の敵には ×28.3 のトドメ) + パーティHP15%回復 / ドロップ +6% ゴールド +30%" },
      { name: "せいうんのきらめき・改", power: 15.4, cooldown: 5, desc: "5秒ごと: 敵に 攻撃×15.4(HP35%未満の敵には ×35.4 のトドメ) + パーティHP15%回復 / ドロップ +6% ゴールド +30%" },
      { name: "せいうんのきらめき・皆伝", power: 19.1, cooldown: 5, desc: "5秒ごと: 敵に 攻撃×19.1(HP35%未満の敵には ×43.9 のトドメ) + パーティHP15%回復 / ドロップ +6% ゴールド +30%" },
    ],
    signature: true,
  },
  cosmicbreath: {
    id: "cosmicbreath",
    name: "銀河の息吹",
    active: { type: "nuke", fx: "nova", power: 16, color: "#8ae0ff" },
    cooldown: 7,
    passive: { atkMult: 1.3, hpMult: 1.2, dropBonus: 0.06, goldBonus: 0.4 },
    desc: "7秒ごと: 敵に 攻撃×16 の銀河撃 / 攻撃 +30% 最大HP +20% ドロップ +6% ゴールド +40%",
    tiers: [
      { name: "銀河の息吹", power: 16, cooldown: 7, desc: "7秒ごと: 敵に 攻撃×16 の銀河撃 / 攻撃 +30% 最大HP +20% ドロップ +6% ゴールド +40%" },
      { name: "銀河の息吹・改", power: 20, cooldown: 6, desc: "6秒ごと: 敵に 攻撃×20 の銀河撃 / 攻撃 +30% 最大HP +20% ドロップ +6% ゴールド +40%" },
      { name: "銀河の息吹・皆伝", power: 24.8, cooldown: 6, desc: "6秒ごと: 敵に 攻撃×24.8 の銀河撃 / 攻撃 +30% 最大HP +20% ドロップ +6% ゴールド +40%" },
    ],
    signature: true,
  },
  // ---- コモン ----
  leafcut: {
    id: "leafcut",
    name: "はっぱカッター",
    active: { type: "nuke", fx: "slash", power: 2.8, color: "#7ac858" },
    cooldown: 6,
    passive: {},
    desc: "6秒ごと: 敵に 攻撃×2.8 の葉刃",
  },
  puffgust: {
    id: "puffgust",
    name: "ふわふわかぜ",
    active: { type: "nuke", fx: "shot", power: 2.6, color: "#f0e0c0" },
    cooldown: 5,
    passive: {},
    desc: "5秒ごと: 敵に 攻撃×2.6 のつむじ風",
  },
  mudsplash: {
    id: "mudsplash",
    name: "どろかけ",
    active: { type: "nuke", fx: "shot", power: 2.5, color: "#a87838" },
    cooldown: 7,
    passive: { hpMult: 1.08 },
    desc: "7秒ごと: 敵に 攻撃×2.5 の泥撃 / 最大HP +8%",
  },
  dewheal: {
    id: "dewheal",
    name: "あさつゆ",
    active: { type: "heal", power: 0.1, color: "#5ecfd8" },
    cooldown: 8,
    passive: {},
    desc: "8秒ごと: パーティHPを 10% 回復",
  },
  honeydrop: {
    id: "honeydrop",
    name: "はちみつのしずく",
    active: { type: "heal", power: 0.08, color: "#ffb838" },
    cooldown: 6,
    passive: { goldBonus: 0.02 },
    desc: "6秒ごと: パーティHPを 8% 回復 / ゴールド +2%",
  },
  peachpurr: {
    id: "peachpurr",
    name: "ももいろのうたごえ",
    active: { type: "buff", power: 0.2, duration: 3, color: "#ffb8c8" },
    cooldown: 8,
    passive: {},
    desc: "8秒ごと: 3秒間 パーティ攻撃 +20%",
  },
  coalguard: {
    id: "coalguard",
    name: "すみのよろい",
    active: { type: "guard", power: 0.3, duration: 4, color: "#6a6272" },
    cooldown: 9,
    passive: { hpMult: 1.1 },
    desc: "9秒ごと: 4秒間 かばう(被ダメ -30%) / 最大HP +10%",
  },
  // ---- レア ----
  thornlash: {
    id: "thornlash",
    name: "とげのムチ",
    active: { type: "nuke", fx: "slash", power: 3.2, color: "#5e9e38" },
    cooldown: 5,
    passive: {},
    desc: "5秒ごと: 敵に 攻撃×3.2 の棘撃",
  },
  cinderpeck: {
    id: "cinderpeck",
    name: "ひのこづつき",
    active: { type: "nuke", fx: "shot", power: 3.4, color: "#e85a30" },
    cooldown: 5,
    passive: {},
    desc: "5秒ごと: 敵に 攻撃×3.4 の火の粉",
  },
  tideguard: {
    id: "tideguard",
    name: "しおのまもり",
    active: { type: "heal", power: 0.12, color: "#3ec0c4" },
    cooldown: 7,
    passive: { hpMult: 1.15 },
    desc: "7秒ごと: パーティHPを 12% 回復 / 最大HP +15%",
  },
  boltdash: {
    id: "boltdash",
    name: "でんこうダッシュ",
    active: { type: "nuke", fx: "beam", power: 3.0, crit: true, color: "#ffdc48" },
    cooldown: 5,
    passive: {},
    desc: "5秒ごと: 敵に 攻撃×3.0(必ず会心)",
  },
  moonbloom: {
    id: "moonbloom",
    name: "つきのはな",
    active: { type: "heal", power: 0.15, color: "#b8b8e8" },
    cooldown: 8,
    passive: { dropBonus: 0.02 },
    desc: "8秒ごと: パーティHPを 15% 回復 / 卵ドロップ +2%",
  },
  duskclaw: {
    id: "duskclaw",
    name: "たそがれのツメ",
    active: { type: "nuke", fx: "slash", power: 3.3, color: "#806898" },
    cooldown: 5,
    passive: {},
    desc: "5秒ごと: 敵に 攻撃×3.3 の宵闇撃",
  },
  // ---- ウルトラ ----
  blazetail: {
    id: "blazetail",
    name: "ほのおのしっぽ",
    active: { type: "nuke", fx: "slash", power: 4.2, color: "#f06828" },
    cooldown: 6,
    passive: { atkMult: 1.08 },
    desc: "6秒ごと: 敵に 攻撃×4.2 の炎尾 / 攻撃 +8%",
  },
  thunderdive: {
    id: "thunderdive",
    name: "らいめいダイブ",
    active: { type: "nuke", fx: "rain", power: 4.6, color: "#ffe038" },
    cooldown: 6,
    passive: {},
    desc: "6秒ごと: 敵に 攻撃×4.6 の雷鳴急降下",
  },
  glacierwall: {
    id: "glacierwall",
    name: "ひょうがのかべ",
    active: { type: "guard", power: 0.45, duration: 5, color: "#88c8e8" },
    cooldown: 9,
    passive: { hpMult: 1.2 },
    desc: "9秒ごと: 5秒間 かばう(被ダメ -45%) / 最大HP +20%",
  },
  mistveil: {
    id: "mistveil",
    name: "きりのヴェール",
    active: { type: "heal", power: 0.16, color: "#8e98a8" },
    cooldown: 7,
    passive: { dropBonus: 0.02 },
    desc: "7秒ごと: パーティHPを 16% 回復 / 卵ドロップ +2%",
  },
  terrafang: {
    id: "terrafang",
    name: "だいちのキバ",
    active: { type: "nuke", fx: "slash", power: 4.3, color: "#c08038" },
    cooldown: 6,
    passive: { hpMult: 1.1 },
    desc: "6秒ごと: 敵に 攻撃×4.3 の大地撃 / 最大HP +10%",
  },
  // ---- レジェンド ----
  blizzard: {
    id: "blizzard",
    name: "吹雪の息吹",
    active: { type: "nuke", fx: "rain", power: 6.5, color: "#6ab0dc" },
    cooldown: 5,
    passive: { atkMult: 1.12 },
    desc: "5秒ごと: 敵に 攻撃×6.5 の吹雪 / 攻撃 +12%",
  },
  solarray: {
    id: "solarray",
    name: "たいようこうせん",
    active: { type: "nuke", fx: "beam", power: 6.0, heal: 0.08, color: "#ffc838" },
    cooldown: 6,
    passive: { goldBonus: 0.1 },
    desc: "6秒ごと: 敵に 攻撃×6.0 + HP8%回復 / ゴールド +10%",
  },
  thornwall: {
    id: "thornwall",
    name: "いばらのとりで",
    active: { type: "guard", power: 0.5, duration: 5, counter: 1.0, color: "#4a9434" },
    cooldown: 8,
    passive: { hpMult: 1.25 },
    desc: "8秒ごと: 5秒間 いばらのかばう(被ダメ -50%)+攻撃×1.0で反撃 / 最大HP +25%",
  },
  tempestfang: {
    id: "tempestfang",
    name: "しっぷうのキバ",
    active: { type: "nuke", fx: "slash", power: 6.8, crit: true, color: "#b8dcc4" },
    cooldown: 5,
    passive: {},
    desc: "5秒ごと: 敵に 攻撃×6.8(必ず会心)",
  },
  // ---- イモータル ----
  pyrestorm: {
    id: "pyrestorm",
    name: "ごうえんのあらし",
    active: { type: "nuke", fx: "rain", power: 7.5, color: "#ff7828" },
    cooldown: 5,
    passive: { atkMult: 1.15 },
    desc: "5秒ごと: 敵に 攻撃×7.5 の劫炎 / 攻撃 +15%",
  },
  lunarblessing: {
    id: "lunarblessing",
    name: "つきのしゅくふく",
    active: { type: "heal", power: 0.22, color: "#c0c0d8" },
    cooldown: 7,
    passive: { dropBonus: 0.04 },
    desc: "7秒ごと: パーティHPを 22% 回復 / 卵ドロップ +4%",
  },
  titanguard: {
    id: "titanguard",
    name: "きょしんのまもり",
    active: { type: "buff", power: 0.55, duration: 5, color: "#847a66" },
    cooldown: 8,
    passive: { hpMult: 1.3 },
    desc: "8秒ごと: 5秒間 パーティ攻撃 +55% / 最大HP +30%",
  },
  tempestbolt: {
    id: "tempestbolt",
    name: "らんうのいかずち",
    active: { type: "nuke", fx: "beam", power: 7.0, crit: true, color: "#4a80d8" },
    cooldown: 5,
    passive: { goldBonus: 0.1 },
    desc: "5秒ごと: 敵に 攻撃×7.0(必ず会心) / ゴールド +10%",
  },
  // ---- アルカナ ----
  mysticeye: {
    id: "mysticeye",
    name: "しんぴのまなこ",
    active: { type: "buff", power: 0.6, duration: 6, color: "#8058c8" },
    cooldown: 8,
    passive: { hpMult: 1.2, dropBonus: 0.04 },
    desc: "8秒ごと: 6秒間 パーティ攻撃 +60% / 最大HP +20% ドロップ +4%",
    tiers: [
      { name: "しんぴのまなこ", power: 0.35, cooldown: 8, desc: "8秒ごと: 6秒間 パーティ会心率 +35% / 最大HP +20% ドロップ +4%" },
      { name: "しんぴのまなこ・改", power: 0.35, cooldown: 7, desc: "7秒ごと: 6秒間 パーティ会心率 +35% / 最大HP +20% ドロップ +4%" },
      { name: "しんぴのまなこ・皆伝", power: 0.35, cooldown: 7, desc: "7秒ごと: 6秒間 パーティ会心率 +35% / 最大HP +20% ドロップ +4%" },
    ],
    signature: true,
  },
  runebarrier: {
    id: "runebarrier",
    name: "ルーンのけっかい",
    active: { type: "heal", power: 0.28, color: "#5ae0d0" },
    cooldown: 8,
    passive: { hpMult: 1.35, goldBonus: 0.15 },
    desc: "8秒ごと: パーティHPを 28% 回復 / 最大HP +35% ゴールド +15%",
    tiers: [
      { name: "ルーンのけっかい", power: 0.28, cooldown: 8, desc: "8秒ごと: パーティHPを 28% 回復 / 最大HP +35% ゴールド +15%" },
      { name: "ルーンのけっかい・改", power: 0.34, cooldown: 7, desc: "7秒ごと: パーティHPを 34% 回復 / 最大HP +35% ゴールド +15%" },
      { name: "ルーンのけっかい・皆伝", power: 0.41, cooldown: 6, desc: "6秒ごと: パーティHPを 41% 回復 / 最大HP +35% ゴールド +15%" },
    ],
    signature: true,
  },
  celestclaw: {
    id: "celestclaw",
    name: "てんじょうのツメ",
    active: { type: "nuke", fx: "slash", power: 11.5, color: "#f8e8b0" },
    cooldown: 6,
    passive: { atkMult: 1.2, dropBonus: 0.04 },
    desc: "6秒ごと: 敵に 攻撃×11.5 の天翔撃 / 攻撃 +20% ドロップ +4%",
    tiers: [
      { name: "てんじょうのツメ", power: 8.6, cooldown: 6, desc: "6秒ごと: 敵に 攻撃×8.6 +与ダメの50%をパーティHPに吸収 / 攻撃 +20% ドロップ +4%" },
      { name: "てんじょうのツメ・改", power: 10.8, cooldown: 5, desc: "5秒ごと: 敵に 攻撃×10.8 +与ダメの50%をパーティHPに吸収 / 攻撃 +20% ドロップ +4%" },
      { name: "てんじょうのツメ・皆伝", power: 13.3, cooldown: 5, desc: "5秒ごと: 敵に 攻撃×13.3 +与ダメの50%をパーティHPに吸収 / 攻撃 +20% ドロップ +4%" },
    ],
    signature: true,
  },
  // ---- ビヨンド ----
  galaxysting: {
    id: "galaxysting",
    name: "銀河のはり",
    active: { type: "nuke", fx: "beam", power: 9.5, crit: true, color: "#6a42b8" },
    cooldown: 5,
    passive: { goldBonus: 0.2 },
    desc: "5秒ごと: 敵に 攻撃×9.5(必ず会心) / ゴールド +20%",
    tiers: [
      { name: "銀河のはり", power: 7.1, cooldown: 5, desc: "5秒ごと: 敵に 攻撃×7.1 +与ダメの50%をパーティHPに吸収 / ゴールド +20%" },
      { name: "銀河のはり・改", power: 8.9, cooldown: 5, desc: "5秒ごと: 敵に 攻撃×8.9 +与ダメの50%をパーティHPに吸収 / ゴールド +20%" },
      { name: "銀河のはり・皆伝", power: 11, cooldown: 4, desc: "4秒ごと: 敵に 攻撃×11 +与ダメの50%をパーティHPに吸収 / ゴールド +20%" },
    ],
    signature: true,
  },
  phantomhowl: {
    id: "phantomhowl",
    name: "もうじゃのとおぼえ",
    active: { type: "buff", power: 0.65, duration: 6, color: "#4c3e80" },
    cooldown: 8,
    passive: { atkMult: 1.15, dropBonus: 0.05 },
    desc: "8秒ごと: 6秒間 パーティ攻撃 +65% / 攻撃 +15% ドロップ +5%",
    tiers: [
      { name: "もうじゃのとおぼえ", power: 0.5, cooldown: 8, desc: "8秒ごと: 6秒間 パーティ攻撃速度 +50% / 攻撃 +15% ドロップ +5%" },
      { name: "もうじゃのとおぼえ・改", power: 0.5, cooldown: 7, desc: "7秒ごと: 6秒間 パーティ攻撃速度 +50% / 攻撃 +15% ドロップ +5%" },
      { name: "もうじゃのとおぼえ・皆伝", power: 0.5, cooldown: 7, desc: "7秒ごと: 6秒間 パーティ攻撃速度 +50% / 攻撃 +15% ドロップ +5%" },
    ],
    signature: true,
  },
  // ---- センチュリー ----
  eternalbloom: {
    id: "eternalbloom",
    name: "えいえんのはな",
    active: { type: "heal", power: 0.32, color: "#f8d8e0" },
    cooldown: 7,
    passive: { hpMult: 1.3, dropBonus: 0.06, goldBonus: 0.2 },
    desc: "7秒ごと: パーティHPを 32% 回復 / 最大HP +30% ドロップ +6% ゴールド +20%",
    tiers: [
      { name: "えいえんのはな", power: 0.45, cooldown: 7, desc: "7秒ごと: 8秒かけて パーティHPを合計 45% 回復(リジェネ) / 最大HP +30% ドロップ +6% ゴールド +20%" },
      { name: "えいえんのはな・改", power: 0.54, cooldown: 6, desc: "6秒ごと: 8秒かけて パーティHPを合計 54% 回復(リジェネ) / 最大HP +30% ドロップ +6% ゴールド +20%" },
      { name: "えいえんのはな・皆伝", power: 0.65, cooldown: 6, desc: "6秒ごと: 8秒かけて パーティHPを合計 65% 回復(リジェネ) / 最大HP +30% ドロップ +6% ゴールド +20%" },
    ],
    signature: true,
  },

  // ---- セレスティアル ----
  genesisnova: {
    id: "genesisnova",
    name: "創世のノヴァ",
    active: { type: "nuke", fx: "nova", power: 20, heal: 0.2, color: "#fff6d8" },
    cooldown: 7,
    passive: { atkMult: 1.25, hpMult: 1.25, dropBonus: 0.08, goldBonus: 0.3 },
    desc: "7秒ごと: 敵に 攻撃×20 の創世光 + HP20%回復 / 全能力+25% ドロップ+8% ゴールド+30%",
    tiers: [
      { name: "創世のノヴァ", power: 13, cooldown: 7, desc: "7秒ごと: 敵全体に 攻撃×13 の一斉攻撃 + パーティHP20%回復 / 攻撃 +25% 最大HP +25% ドロップ +8% ゴールド +30%" },
      { name: "創世のノヴァ・改", power: 16.3, cooldown: 6, desc: "6秒ごと: 敵全体に 攻撃×16.3 の一斉攻撃 + パーティHP20%回復 / 攻撃 +25% 最大HP +25% ドロップ +8% ゴールド +30%" },
      { name: "創世のノヴァ・皆伝", power: 20.2, cooldown: 6, desc: "6秒ごと: 敵全体に 攻撃×20.2 の一斉攻撃 + パーティHP20%回復 / 攻撃 +25% 最大HP +25% ドロップ +8% ゴールド +30%" },
    ],
    signature: true,
  },

  // ---- レアスキル(種族は持たない・Lv10ごとの2択にまれに出る大当たり) ----
  guardianaegis: {
    id: "guardianaegis",
    name: "守護聖壁",
    active: { type: "guard", power: 0.6, duration: 6, counter: 1.5, color: "#ffd76a" },
    cooldown: 9,
    passive: { hpMult: 1.2 },
    desc: "9秒ごと: 6秒間 聖壁のかばう(被ダメ -60%)+攻撃×1.5で反撃 / 最大HP +20%",
  },
  lifebloom: {
    id: "lifebloom",
    name: "生命の大樹",
    active: { type: "heal", power: 0.45, color: "#8af0a8" },
    cooldown: 7,
    passive: { hpMult: 1.15, dropBonus: 0.02 },
    desc: "7秒ごと: パーティHPを 45% 回復 / 最大HP +15% ドロップ +2%",
  },
  warcry: {
    id: "warcry",
    name: "鬨の咆哮",
    active: { type: "buff", power: 0.9, duration: 6, color: "#ff8a4a" },
    cooldown: 8,
    passive: { atkMult: 1.1 },
    desc: "8秒ごと: 6秒間 パーティ攻撃 +90% / 攻撃 +10%",
  },
  meteorruin: {
    id: "meteorruin",
    name: "流星の裁き",
    active: { type: "nuke", fx: "nova", power: 15, color: "#ffb8f0" },
    cooldown: 6,
    passive: { atkMult: 1.1 },
    desc: "6秒ごと: 敵に 攻撃×15 の流星 / 攻撃 +10%",
  },
  // ---- スキル多様化(2026-07-11): 有名RPGの原型にならった多彩な効果 ----
  // kind: aoe=全体攻撃 / dot=継続ダメージ / drain=吸収 / execute=とどめ /
  //       haste=攻撃速度バフ / critup=会心率バフ / shield=バリア
  //   ※バリアは SHIELD_CAP_PER_SEC(1.25%/秒×CD)の上限内で設計すること(2026-07-18)
  // 全体攻撃の威力は2026-07-21 FB「倍率低くて死んでる」で一斉買い上げ(×1.8前後)。
  // 3体ヒットの合計では単体ニュークを超えるが、ボス(単体)では劣る=役割分担は維持
  chainbolt: {
    id: "chainbolt",
    name: "チェーンライトニング",
    active: { type: "nuke", kind: "aoe", fx: "nova", power: 2.4, color: "#ffe066" },
    cooldown: 10,
    desc: "10秒ごと: 敵全体に 攻撃×2.4 の連鎖雷(取り巻き処理の要)",
  },
  blizzardra: {
    id: "blizzardra",
    name: "ブリザードラ",
    active: { type: "nuke", kind: "aoe", fx: "nova", power: 3.2, color: "#8ad8ff" },
    cooldown: 12,
    desc: "12秒ごと: 敵全体に 攻撃×3.2 の吹雪",
  },
  quakebreak: {
    id: "quakebreak",
    name: "アースクエイク",
    active: { type: "nuke", kind: "aoe", fx: "nova", power: 3.6, color: "#d8a860" },
    cooldown: 13,
    passive: { atkMult: 1.05 },
    desc: "13秒ごと: 敵全体に 攻撃×3.6 の大地震 / 攻撃 +5%",
  },
  meteorfall: {
    id: "meteorfall",
    name: "メテオフォール",
    active: { type: "nuke", kind: "aoe", fx: "rain", power: 4.6, color: "#ff8a4a" },
    cooldown: 15,
    desc: "15秒ごと: 敵全体に 攻撃×4.6 の隕石群(最強の全体魔法)",
  },
  // ---- 多段攻撃(2026-07-21 FB「多段攻撃とか追加できない?」)。kind: multi ----
  // 1発ごとに会心判定・倒すと残りのヒットは次の敵へ流れる(FF連撃の気持ちよさ)
  tripleslash: {
    id: "tripleslash",
    name: "三連斬",
    active: { type: "nuke", kind: "multi", hits: 3, fx: "slash", power: 1.3, color: "#ffd84a" },
    cooldown: 8,
    desc: "8秒ごと: 敵に 攻撃×1.3 の斬撃を3連続(倒すと次の敵へ)",
  },
  flurryblows: {
    id: "flurryblows",
    name: "百裂拳",
    active: { type: "nuke", kind: "multi", hits: 6, fx: "slash", power: 0.9, color: "#ff8a4a" },
    cooldown: 12,
    desc: "12秒ごと: 敵に 攻撃×0.9 の連打を6連続(倒すと次の敵へ)",
  },
  // ---- 細工限定の激レアスキル(2026-07-21 FB)。抽選の出目でしか付かない ----
  // enhanceOnly: 習得候補プール/レア枠に出ない。強さはジョブ専用級の一歩手前で設計
  dragonraid: {
    id: "dragonraid",
    name: "ドラゴンレイド",
    enhanceOnly: true,
    active: { type: "nuke", kind: "multi", hits: 6, fx: "slash", power: 1.4, color: "#ff5a3a" },
    cooldown: 10,
    desc: "10秒ごと: 敵に 攻撃×1.4 の竜牙を6連続(倒すと次の敵へ)",
  },
  adamantwall: {
    id: "adamantwall",
    name: "アダマンウォール",
    enhanceOnly: true,
    active: { type: "guard", kind: "shield", power: 0.18, duration: 14, color: "#8ab8ff" },
    cooldown: 16,
    passive: { hpMult: 1.12 },
    desc: "16秒ごと: 最大HPの18%分のバリア(被ダメを先に吸収) / 最大HP +12%",
  },
  goldenstorm: {
    id: "goldenstorm",
    name: "ゴールデンストーム",
    enhanceOnly: true,
    active: { type: "nuke", kind: "aoe", fx: "nova", power: 4.2, color: "#ffd67a" },
    cooldown: 12,
    passive: { goldBonus: 0.12 },
    desc: "12秒ごと: 敵全体に 攻撃×4.2 の黄金嵐 / ゴールド +12%",
  },
  poisonmist: {
    id: "poisonmist",
    name: "ポイズンミスト",
    active: { type: "nuke", kind: "dot", fx: "shot", power: 4.5, duration: 8, color: "#b06aff" },
    cooldown: 12,
    desc: "12秒ごと: 攻撃×4.5分の毒を8秒かけて与える(高HPの敵に刺さる)",
  },
  ignition: {
    id: "ignition",
    name: "イグニッション",
    active: { type: "nuke", kind: "dot", power: 7.5, duration: 8, fx: "beam", color: "#ff6a2a" },
    cooldown: 14,
    passive: { atkMult: 1.08 },
    desc: "14秒ごと: 攻撃×7.5分の業火を8秒かけて与える / 攻撃 +8%",
  },
  souldrain: {
    id: "souldrain",
    name: "ソウルドレイン",
    active: { type: "nuke", kind: "drain", fx: "beam", drain: 0.6, power: 2.4, color: "#c86aff" },
    cooldown: 9,
    desc: "9秒ごと: 攻撃×2.4のダメージ+その60%をHPに吸収(回復役がいない編成の生命線)",
  },
  guillotine: {
    id: "guillotine",
    name: "ギロチン",
    active: { type: "nuke", kind: "execute", fx: "slash", execTh: 0.35, execMult: 2.4, power: 2.4, crit: true, color: "#ff4a6a" },
    cooldown: 11,
    desc: "11秒ごと: 攻撃×2.4。敵HP35%未満なら さらに×2.4のトドメ(ボス削りの答え)",
  },
  hastega: {
    id: "hastega",
    name: "ヘイスト",
    active: { type: "buff", kind: "haste", power: 0.4, duration: 8, color: "#8af0d8" },
    cooldown: 18,
    desc: "18秒ごと: 8秒間 パーティの攻撃速度 +40%",
  },
  criticaleye: {
    id: "criticaleye",
    name: "クリティカルアイ",
    active: { type: "buff", kind: "critup", power: 0.25, duration: 8, color: "#ffd24a" },
    cooldown: 16,
    desc: "16秒ごと: 8秒間 パーティの会心率 +25%(会心ダメージ盛りと相性抜群)",
  },
  magicbarrier: {
    id: "magicbarrier",
    name: "マジックバリア",
    active: { type: "guard", kind: "shield", power: 0.2, duration: 12, color: "#8ab8ff" },
    cooldown: 20,
    passive: { hpMult: 1.08 },
    desc: "20秒ごと: 最大HPの20%分のバリア(被ダメを先に吸収) / 最大HP +8%",
  },

  // ---- ジョブ専用スキル(レア職/隠し職の進化で自動習得。他では手に入らない) ----
  // 2026-07-16 FB「当選率を下げて劇レアでいいから、もっともっと強く」: レア職1/40・隠し職1/500に
  // 劇レア化したぶん、汎用スキルの最上位を明確に超える別格の水準へ引き上げた。
  // ただし回復は毎秒上限(HEAL_CAP=3.5%/秒)、バリアはレート上限(SHIELD_CAP_PER_SEC)
  // (どちらも「回復3体で無敵」事件の再発防止)なので、この2系統は素の量ではなく
  // 回転(CD)とパッシブ(最大HP)で強くする。攻撃・バフ系は素直に数値で別格
  iaigiri: {
    id: "iaigiri",
    name: "居合一閃",
    jobOnly: true,
    active: { type: "nuke", kind: "execute", execTh: 0.4, execMult: 3.5, power: 20, crit: true, fx: "slash", color: "#ff5a4a" },
    cooldown: 8,
    passive: { atkMult: 1.25 },
    desc: "【サムライ専用】8秒ごと: 攻撃×20の一閃。敵HP40%未満で×3.5のトドメ / 攻撃 +25%",
  },
  earthfort: {
    id: "earthfort",
    name: "大地の砦",
    jobOnly: true,
    active: { type: "guard", kind: "shield", power: 0.15, duration: 12, color: "#d8a860" },
    cooldown: 14,
    passive: { hpMult: 1.3 },
    desc: "【ウォーデン専用】14秒ごと: 最大HPの15%バリア / 最大HP +30%",
  },
  sylvanbless: {
    id: "sylvanbless",
    name: "森羅の祝福",
    jobOnly: true,
    active: { type: "heal", power: 0.7, color: "#8af0a8" },
    cooldown: 13,
    passive: { hpMult: 1.2 },
    desc: "【ドルイド専用】13秒ごと: パーティHPを70%回復 / 最大HP +20%",
  },
  onmyodo: {
    id: "onmyodo",
    name: "陰陽道",
    jobOnly: true,
    active: { type: "buff", kind: "critup", power: 0.5, duration: 12, color: "#c86aff" },
    cooldown: 14,
    passive: { atkMult: 1.15 },
    desc: "【陰陽師専用】14秒ごと: 12秒間 パーティ会心率 +50% / 攻撃 +15%",
  },
  godfist: {
    id: "godfist",
    name: "神々の一撃",
    jobOnly: true,
    active: { type: "nuke", power: 36, crit: true, fx: "nova", color: "#ffd24a" },
    cooldown: 10,
    passive: { atkMult: 1.35 },
    desc: "【ゴッドハンド専用】10秒ごと: 攻撃×36の神撃 / 攻撃 +35%",
  },
  unsinkable: {
    id: "unsinkable",
    name: "不沈",
    jobOnly: true,
    active: { type: "guard", kind: "shield", power: 0.15, duration: 13, color: "#8ab8ff" },
    cooldown: 15,
    passive: { hpMult: 1.45 },
    desc: "【ティターン専用】15秒ごと: 最大HPの15%バリア / 最大HP +45%",
  },
  heavenlight: {
    id: "heavenlight",
    name: "天光",
    jobOnly: true,
    active: { type: "heal", power: 1.0, color: "#fff2c8" },
    cooldown: 18,
    passive: { hpMult: 1.3 },
    desc: "【セラフ専用】18秒ごと: パーティHPを100%回復 / 最大HP +30%",
  },
  hadou: {
    id: "hadou",
    name: "覇道",
    jobOnly: true,
    active: { type: "buff", power: 0.9, duration: 12, color: "#ff8ad8" },
    cooldown: 18,
    passive: { atkMult: 1.25 },
    desc: "【覇皇専用】18秒ごと: 12秒間 パーティ攻撃 +90% / 攻撃 +25%",
  },
};
// ---- スキル多様化(2026-07-15 FB「似たようなスキルが多くて付け替えの楽しみがない」) ----
// kindのない素のスキル(単発nuke72/素buff20/素guard33/即時heal39)が同質の山だったため、
// idハッシュで機構(kind)へ決定的に振り分ける。威力は機構ごとに換算して総合力を保つ
// (aoeは3体に当たるぶん単発威力を下げる、dotは遅延のぶん総量を盛る、など)。
// 明示的にkindを持つスキル(2026-07-11の多様化スキルやジョブ専用)はそのまま。
function skillIdHash(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}
const pct = (v) => Math.round(v * 100);
function passiveDesc(passive) {
  if (!passive) return "";
  const parts = [];
  if (passive.atkMult) parts.push(`攻撃 +${pct(passive.atkMult - 1)}%`);
  if (passive.hpMult) parts.push(`最大HP +${pct(passive.hpMult - 1)}%`);
  if (passive.dropBonus) parts.push(`ドロップ +${pct(passive.dropBonus)}%`);
  if (passive.goldBonus) parts.push(`ゴールド +${pct(passive.goldBonus)}%`);
  return parts.length ? ` / ${parts.join(" ")}` : "";
}
function diversifySkill(skill) {
  const a = skill.active;
  if (!a || a.kind) return skill; // 機構持ちはそのまま
  const h = skillIdHash(skill.id) % 20;
  const cd = skill.cooldown;
  const tail = passiveDesc(skill.passive);
  // 付随ヒール(active.heal)は kind に関係なく発動する(ui.js applySkillHeal)。
  // 機構を振り直すと desc を作り直すので、ここで拾わないと説明から回復が消えてしまう
  // (2026-07-15 FB「説明通りに機能していないスキルがある」の一因)
  const healPart = a.heal ? ` + パーティHP${pct(a.heal)}%回復` : "";
  const out = (active, activeDesc) => ({
    ...skill,
    active,
    desc: `${cd}秒ごと: ${activeDesc}${healPart}${tail}`,
  });
  if (a.type === "nuke") {
    if (h < 6) return skill; // 単発はそのまま(30%)
    if (h < 10) {
      // 全体: 2026-07-21 FB「倍率低くて死んでる」→ 40%から65%へ買い上げ。
      // 3体合計では単体を超えるが、ボス(単体)では65%=使い分けの余地を残す
      const p = Math.max(0.6, +(a.power * 0.65).toFixed(1));
      return out({ ...a, kind: "aoe", power: p }, `敵全体に 攻撃×${p} の一斉攻撃`);
    }
    if (h < 14) {
      const p = +(a.power * 1.5).toFixed(1); // 継続: 遅延のぶん総量1.5倍を8秒で
      return out({ ...a, kind: "dot", power: p, duration: 8 }, `8秒かけて合計 攻撃×${p} の継続ダメージ`);
    }
    if (h < 17) {
      const p = +(a.power * 0.95).toFixed(1); // トドメ: HP35%未満の敵に2.3倍
      return out(
        { ...a, kind: "execute", power: p, execTh: 0.35, execMult: 2.3 },
        `敵に 攻撃×${p}(HP35%未満の敵には ×${+(p * 2.3).toFixed(1)} のトドメ)`,
      );
    }
    const p = +(a.power * 0.75).toFixed(1); // 吸収: 与ダメの50%をパーティHPへ
    return out({ ...a, kind: "drain", power: p, drain: 0.5 }, `敵に 攻撃×${p} +与ダメの50%をパーティHPに吸収`);
  }
  if (a.type === "buff") {
    if (h < 8) return skill; // パーティ攻撃バフはそのまま(40%)
    if (h < 14) {
      const p = Math.min(0.5, a.power);
      return out(
        { ...a, kind: "haste", power: p },
        `${a.duration}秒間 パーティ攻撃速度 +${pct(p)}%`,
      );
    }
    const p = Math.min(0.35, +(a.power * 0.6).toFixed(2));
    return out({ ...a, kind: "critup", power: p }, `${a.duration}秒間 パーティ会心率 +${pct(p)}%`);
  }
  if (a.type === "guard") {
    if (h < 9) return skill; // かばうはそのまま(45%)
    if (h < 14) {
      // 吸収レート上限: プールはCD1秒あたり最大HP1.25%まで(2026-07-18 タンク無敵対策)
      const p = Math.min(0.6, a.power, +(SHIELD_CAP_PER_SEC * cd).toFixed(2));
      return out(
        { ...a, kind: "shield", power: p },
        `最大HP×${pct(p)}% のバリアを張る(先に被ダメを吸収)`,
      );
    }
    const p = +(a.power * 0.8).toFixed(2); // いばら: 軽減は少し薄く+反撃つき
    return out(
      { ...a, kind: "counter", power: p, counter: 1.2 },
      `${a.duration}秒間 かばう(被ダメ -${pct(p)}%)+攻撃してきた敵に 攻撃×1.2 の反撃`,
    );
  }
  if (a.type === "heal") {
    if (h < 12) return skill; // 即時回復はそのまま(60%)
    const p = +(a.power * 1.4).toFixed(2); // リジェネ: 遅延のぶん総量1.4倍を8秒で
    return out(
      { ...a, kind: "regen", power: p, duration: 8 },
      `8秒かけて パーティHPを合計 ${pct(p)}% 回復(リジェネ)`,
    );
  }
  return skill;
}
// ---- スキル重複の解消(2026-07-16 FB「スキルの内容がかぶっているものがある」) ----
// 週次生成が同じ数値テンプレを量産するため、シグネチャ(種類/機構/威力/CD/持続/パッシブ)が
// 完全一致するグループは2匹目以降を決定的に変奏する: CDを +1,-1,+2,-2…ずらし、
// 威力を係数(威力/CD)維持でスケール。総合力は変えないので回復上限などのガードもそのまま。
// descも同時に書き換える(説明↔実装の番人テストが整合を保証する)。
function dedupSkillVariants(map) {
  const sig = (s) => {
    const a = s.active;
    return [a.type, a.kind ?? "", a.power, s.cooldown, a.duration ?? "", a.count ?? "", a.heal ?? "",
      JSON.stringify(s.passive ?? {})].join("|");
  };
  const groups = new Map();
  for (const id of Object.keys(map).sort()) {
    const k = sig(map[id]);
    (groups.get(k) ?? groups.set(k, []).get(k)).push(id);
  }
  for (const ids of groups.values()) {
    const usedCd = new Set([map[ids[0]].cooldown]); // 基準のCD(1匹目)は使用済み
    ids.forEach((id, i) => {
      if (i === 0) return; // 1匹目は基準としてそのまま
      const s = map[id];
      const a = s.active;
      // かばう/バフは「持続<CD」を守る(張りっぱなし防止)。それ以外はCD3秒が下限
      const minCd = a.type === "guard" || a.type === "buff" ? (a.duration ?? 0) + 2 : 3;
      // +1,-1,+2,-2…の順で、下限と同グループの使用済みを避けた最初のCDを選ぶ
      let cd2 = s.cooldown;
      for (let d = 1; d < 12 && cd2 === s.cooldown; d++) {
        for (const cand of [s.cooldown + d, s.cooldown - d]) {
          if (cand >= minCd && !usedCd.has(cand)) {
            cd2 = cand;
            break;
          }
        }
      }
      if (cd2 === s.cooldown) return;
      usedCd.add(cd2);
      const ratio = cd2 / s.cooldown;
      const p2 =
        a.type === "nuke"
          ? Math.round(a.power * ratio * 10) / 10
          : Math.round(a.power * ratio * 100) / 100;
      let desc = s.desc.replace(`${s.cooldown}秒ごと`, `${cd2}秒ごと`);
      if (a.type === "nuke") {
        // とどめ表記(×威力×倍率の積)が先(基準トークンを巻き込まない順序)
        if (a.kind === "execute" && a.execMult) {
          const prodOld = +(a.power * a.execMult).toFixed(1);
          const prodNew = +(p2 * a.execMult).toFixed(1);
          desc = desc.replace(`×${prodOld} `, `×${prodNew} `);
        }
        desc = desc.replace(`×${a.power}`, `×${p2}`);
      } else {
        // percent系は文脈つきトークンで置換(パッシブ側の同じ数字を巻き込まない)
        const t = (v) => Math.round(v * 100);
        const ctx = [
          [` ${t(a.power)}% 回復`, ` ${t(p2)}% 回復`],
          [`被ダメ -${t(a.power)}%`, `被ダメ -${t(p2)}%`],
          [`最大HP×${t(a.power)}%`, `最大HP×${t(p2)}%`],
          [`パーティ攻撃 +${t(a.power)}%`, `パーティ攻撃 +${t(p2)}%`],
          [`攻撃速度 +${t(a.power)}%`, `攻撃速度 +${t(p2)}%`],
          [`会心率 +${t(a.power)}%`, `会心率 +${t(p2)}%`],
        ];
        for (const [from, to] of ctx) {
          if (desc.includes(from)) {
            desc = desc.replace(from, to);
            break;
          }
        }
      }
      map[id] = { ...s, cooldown: cd2, active: { ...a, power: p2 }, desc };
    });
  }
  return map;
}
// 内蔵スキル + 自動生成スキル(content-pack)をマージ。
export const SKILLS = Object.freeze(
  Object.fromEntries(
    Object.entries(
      dedupSkillVariants(
        Object.fromEntries(
          Object.entries({ ...BASE_SKILLS, ...EXTRA_SKILLS }).map(([id, s]) => [id, diversifySkill(s)]),
        ),
      ),
    // 個別スキルは凍結しない(2026-07-18: i18nが起動時にnameをenへ差し替えるため。
    // SKILLS本体(キー集合)の凍結は維持=スキルの追加削除は引き続き不可)
    ).map(([id, s]) => [id, s]),
  ),
);

// レアスキルの星(種族が持たないスキルはここで明示する。skillStarsが参照)。
// 自動生成スキル(content-pack)は poolStars 付きなら習得候補プールにも載る
const BASE_RARE_SKILL_STARS = {
  guardianaegis: 6,
  lifebloom: 6,
  warcry: 7,
  meteorruin: 7,
  // 多様化スキル(2026-07-11): 星=覚えられる目安レア度。役割はkindで差別化
  chainbolt: 3,
  blizzardra: 5,
  quakebreak: 6,
  meteorfall: 7,
  poisonmist: 3,
  ignition: 6,
  souldrain: 4,
  guillotine: 6,
  hastega: 4,
  criticaleye: 5,
  magicbarrier: 5,
  // 多段攻撃(2026-07-21 FB)
  tripleslash: 4,
  flurryblows: 6,
  // 細工限定(候補プールには出ない=enhanceOnly。星は表示用)
  dragonraid: 9,
  adamantwall: 9,
  goldenstorm: 9,
  // ジョブ専用(候補プールには出ない=jobOnly。星は表示用)
  iaigiri: 8,
  earthfort: 8,
  sylvanbless: 8,
  onmyodo: 8,
  godfist: 10,
  unsinkable: 10,
  heavenlight: 10,
  hadou: 10,
};
export const RARE_SKILL_STARS = Object.freeze({
  ...BASE_RARE_SKILL_STARS,
  ...Object.fromEntries(
    Object.values(EXTRA_SKILLS)
      .filter((s) => s && s.poolStars)
      .map((s) => [s.id, clampNum(s.poolStars, 2, 8, 4)]),
  ),
});

// ---- 種族 ----
// レア度が上がるほど基礎ステータスが大きく跳ね上がる(高レアは別格に強い)。
const BASE_SPECIES = {
  flamewolf: {
    id: "flamewolf",
    name: "フレイムウルフ",
    rarity: RARITY.COMMON,
    element: ELEMENTS.FIRE,
    baseAtk: 6,
    baseHp: 45,
    skillId: "fang",
  },
  aquafox: {
    id: "aquafox",
    name: "アクアフォックス",
    rarity: RARITY.COMMON,
    element: ELEMENTS.WATER,
    baseAtk: 5,
    baseHp: 55,
    skillId: "aquaveil",
  },
  terrashell: {
    id: "terrashell",
    name: "テラシェル",
    rarity: RARITY.COMMON,
    element: ELEMENTS.EARTH,
    baseAtk: 4,
    baseHp: 70,
    skillId: "hardshell",
  },
  galebird: {
    id: "galebird",
    name: "ゲイルバード",
    rarity: RARITY.ULTRA,
    element: ELEMENTS.WIND,
    baseAtk: 14,
    baseHp: 100,
    skillId: "galeedge",
  },
  voltgecko: {
    id: "voltgecko",
    name: "ボルトゲッコー",
    rarity: RARITY.ULTRA,
    element: ELEMENTS.LIGHT,
    baseAtk: 13,
    baseHp: 115,
    skillId: "volt",
  },
  emberdrake: {
    id: "emberdrake",
    name: "エンバードレイク",
    rarity: RARITY.LEGEND,
    element: ELEMENTS.FIRE,
    baseAtk: 22,
    baseHp: 160,
    skillId: "inferno",
  },
  auradrake: {
    id: "auradrake",
    name: "オーラドレイク",
    rarity: RARITY.ARCANA,
    element: ELEMENTS.LIGHT,
    baseAtk: 55,
    baseHp: 360,
    skillId: "goldenaura",
  },
  shadowmouse: {
    id: "shadowmouse",
    name: "シャドウマウス",
    rarity: RARITY.RARE,
    element: ELEMENTS.DARK,
    baseAtk: 9,
    baseHp: 60,
    skillId: "shadowfang",
  },
  pebblemole: {
    id: "pebblemole",
    name: "ペブルモール",
    rarity: RARITY.RARE,
    element: ELEMENTS.EARTH,
    baseAtk: 6,
    baseHp: 110,
    skillId: "rockguard",
  },
  sparkbee: {
    id: "sparkbee",
    name: "スパークビー",
    rarity: RARITY.RARE,
    element: ELEMENTS.LIGHT,
    baseAtk: 10,
    baseHp: 55,
    skillId: "stinger",
  },
  frostwolf: {
    id: "frostwolf",
    name: "フロストウルフ",
    rarity: RARITY.ULTRA,
    element: ELEMENTS.WATER,
    baseAtk: 12,
    baseHp: 125,
    skillId: "frostfang",
  },
  sunblossom: {
    id: "sunblossom",
    name: "サンブロッサム",
    rarity: RARITY.LEGEND,
    element: ELEMENTS.LIGHT,
    baseAtk: 18,
    baseHp: 190,
    skillId: "bloom",
  },
  nightraven: {
    id: "nightraven",
    name: "ナイトレイヴン",
    rarity: RARITY.LEGEND,
    element: ELEMENTS.DARK,
    baseAtk: 24,
    baseHp: 140,
    skillId: "darkwind",
  },
  abyssfox: {
    id: "abyssfox",
    name: "アビスフォックス",
    rarity: RARITY.IMMORTAL,
    element: ELEMENTS.WATER,
    baseAtk: 34,
    baseHp: 240,
    skillId: "abysscall",
  },
  gaiaturtle: {
    id: "gaiaturtle",
    name: "ガイアタートル",
    rarity: RARITY.IMMORTAL,
    element: ELEMENTS.EARTH,
    baseAtk: 28,
    baseHp: 300,
    skillId: "gaiawall",
  },
  voiddrake: {
    id: "voiddrake",
    name: "ヴォイドドレイク",
    rarity: RARITY.ARCANA,
    element: ELEMENTS.DARK,
    baseAtk: 58,
    baseHp: 330,
    skillId: "voidbreath",
  },
  prismcat: {
    id: "prismcat",
    name: "プリズムキャット",
    rarity: RARITY.BEYOND,
    element: ELEMENTS.LIGHT,
    baseAtk: 88,
    baseHp: 560,
    skillId: "prismveil",
  },
  stormdrake: {
    id: "stormdrake",
    name: "ストームドレイク",
    rarity: RARITY.BEYOND,
    element: ELEMENTS.WIND,
    baseAtk: 95,
    baseHp: 500,
    skillId: "stormcall",
  },
  chronowl: {
    id: "chronowl",
    name: "クロノウル",
    rarity: RARITY.CENTURY,
    element: ELEMENTS.LIGHT,
    baseAtk: 140,
    baseHp: 820,
    skillId: "chronoshift",
  },
  relicshell: {
    id: "relicshell",
    name: "レリックシェル",
    rarity: RARITY.CENTURY,
    element: ELEMENTS.EARTH,
    baseAtk: 125,
    baseHp: 950,
    skillId: "relicaegis",
  },
  nebulafox: {
    id: "nebulafox",
    name: "ネビュラフォックス",
    rarity: RARITY.COSMIC,
    element: ELEMENTS.DARK,
    baseAtk: 230,
    baseHp: 1150,
    skillId: "nebulaflare",
  },
  cosmicdrake: {
    id: "cosmicdrake",
    name: "コズミックドレイク",
    rarity: RARITY.COSMIC,
    element: ELEMENTS.LIGHT,
    baseAtk: 245,
    baseHp: 1250,
    skillId: "cosmicbreath",
  },
  seraphdrake: {
    id: "seraphdrake",
    name: "セラフドレイク",
    rarity: RARITY.CELESTIAL,
    element: ELEMENTS.LIGHT,
    baseAtk: 400,
    baseHp: 2000,
    skillId: "genesisnova",
  },
  // ---- コモン追加 ----
  leafmouse: {
    id: "leafmouse",
    name: "リーフマウス",
    rarity: RARITY.COMMON,
    element: ELEMENTS.WIND,
    baseAtk: 5,
    baseHp: 48,
    skillId: "leafcut",
  },
  puffbird: {
    id: "puffbird",
    name: "パフバード",
    rarity: RARITY.COMMON,
    element: ELEMENTS.WIND,
    baseAtk: 6,
    baseHp: 42,
    skillId: "puffgust",
  },
  mudpup: {
    id: "mudpup",
    name: "マッドパップ",
    rarity: RARITY.COMMON,
    element: ELEMENTS.EARTH,
    baseAtk: 5,
    baseHp: 60,
    skillId: "mudsplash",
  },
  dewgecko: {
    id: "dewgecko",
    name: "デューゲッコー",
    rarity: RARITY.COMMON,
    element: ELEMENTS.WATER,
    baseAtk: 6,
    baseHp: 50,
    skillId: "dewheal",
  },
  honeybee: {
    id: "honeybee",
    name: "ハニービー",
    rarity: RARITY.COMMON,
    element: ELEMENTS.LIGHT,
    baseAtk: 7,
    baseHp: 38,
    skillId: "honeydrop",
  },
  peachcat: {
    id: "peachcat",
    name: "ピーチキャット",
    rarity: RARITY.COMMON,
    element: ELEMENTS.LIGHT,
    baseAtk: 5,
    baseHp: 52,
    skillId: "peachpurr",
  },
  coalmole: {
    id: "coalmole",
    name: "コールモール",
    rarity: RARITY.COMMON,
    element: ELEMENTS.DARK,
    baseAtk: 4,
    baseHp: 65,
    skillId: "coalguard",
  },
  // ---- レア追加 ----
  thornfox: {
    id: "thornfox",
    name: "ソーンフォックス",
    rarity: RARITY.RARE,
    element: ELEMENTS.EARTH,
    baseAtk: 9,
    baseHp: 65,
    skillId: "thornlash",
  },
  cinderbird: {
    id: "cinderbird",
    name: "シンダーバード",
    rarity: RARITY.RARE,
    element: ELEMENTS.FIRE,
    baseAtk: 11,
    baseHp: 50,
    skillId: "cinderpeck",
  },
  tideshell: {
    id: "tideshell",
    name: "タイドシェル",
    rarity: RARITY.RARE,
    element: ELEMENTS.WATER,
    baseAtk: 7,
    baseHp: 100,
    skillId: "tideguard",
  },
  boltmouse: {
    id: "boltmouse",
    name: "ボルトマウス",
    rarity: RARITY.RARE,
    element: ELEMENTS.WIND,
    baseAtk: 10,
    baseHp: 58,
    skillId: "boltdash",
  },
  moonblossom: {
    id: "moonblossom",
    name: "ムーンブロッサム",
    rarity: RARITY.RARE,
    element: ELEMENTS.LIGHT,
    baseAtk: 8,
    baseHp: 80,
    skillId: "moonbloom",
  },
  duskcat: {
    id: "duskcat",
    name: "ダスクキャット",
    rarity: RARITY.RARE,
    element: ELEMENTS.DARK,
    baseAtk: 10,
    baseHp: 62,
    skillId: "duskclaw",
  },
  // ---- ウルトラ追加 ----
  blazegecko: {
    id: "blazegecko",
    name: "ブレイズゲッコー",
    rarity: RARITY.ULTRA,
    element: ELEMENTS.FIRE,
    baseAtk: 14,
    baseHp: 105,
    skillId: "blazetail",
  },
  thunderbird: {
    id: "thunderbird",
    name: "サンダーバード",
    rarity: RARITY.ULTRA,
    element: ELEMENTS.WIND,
    baseAtk: 15,
    baseHp: 95,
    skillId: "thunderdive",
  },
  glacierturtle: {
    id: "glacierturtle",
    name: "グレイシャータートル",
    rarity: RARITY.ULTRA,
    element: ELEMENTS.WATER,
    baseAtk: 11,
    baseHp: 150,
    skillId: "glacierwall",
  },
  mistraven: {
    id: "mistraven",
    name: "ミストレイヴン",
    rarity: RARITY.ULTRA,
    element: ELEMENTS.DARK,
    baseAtk: 14,
    baseHp: 100,
    skillId: "mistveil",
  },
  terrawolf: {
    id: "terrawolf",
    name: "テラウルフ",
    rarity: RARITY.ULTRA,
    element: ELEMENTS.EARTH,
    baseAtk: 13,
    baseHp: 120,
    skillId: "terrafang",
  },
  // ---- レジェンド追加 ----
  frostdrake: {
    id: "frostdrake",
    name: "フロストドレイク",
    rarity: RARITY.LEGEND,
    element: ELEMENTS.WATER,
    baseAtk: 23,
    baseHp: 150,
    skillId: "blizzard",
  },
  solarcat: {
    id: "solarcat",
    name: "ソーラーキャット",
    rarity: RARITY.LEGEND,
    element: ELEMENTS.LIGHT,
    baseAtk: 21,
    baseHp: 165,
    skillId: "solarray",
  },
  thornshell: {
    id: "thornshell",
    name: "ソーンシェル",
    rarity: RARITY.LEGEND,
    element: ELEMENTS.EARTH,
    baseAtk: 17,
    baseHp: 210,
    skillId: "thornwall",
  },
  galewolf: {
    id: "galewolf",
    name: "ゲイルウルフ",
    rarity: RARITY.LEGEND,
    element: ELEMENTS.WIND,
    baseAtk: 24,
    baseHp: 145,
    skillId: "tempestfang",
  },
  // ---- イモータル追加 ----
  pyrebird: {
    id: "pyrebird",
    name: "パイアバード",
    rarity: RARITY.IMMORTAL,
    element: ELEMENTS.FIRE,
    baseAtk: 36,
    baseHp: 220,
    skillId: "pyrestorm",
  },
  lunarfox: {
    id: "lunarfox",
    name: "ルナフォックス",
    rarity: RARITY.IMMORTAL,
    element: ELEMENTS.DARK,
    baseAtk: 32,
    baseHp: 260,
    skillId: "lunarblessing",
  },
  titanmole: {
    id: "titanmole",
    name: "タイタンモール",
    rarity: RARITY.IMMORTAL,
    element: ELEMENTS.EARTH,
    baseAtk: 26,
    baseHp: 320,
    skillId: "titanguard",
  },
  tempestgecko: {
    id: "tempestgecko",
    name: "テンペストゲッコー",
    rarity: RARITY.IMMORTAL,
    element: ELEMENTS.WIND,
    baseAtk: 35,
    baseHp: 230,
    skillId: "tempestbolt",
  },
  // ---- アルカナ追加 ----
  mysticowl: {
    id: "mysticowl",
    name: "ミスティックアウル",
    rarity: RARITY.ARCANA,
    element: ELEMENTS.DARK,
    baseAtk: 50,
    baseHp: 400,
    skillId: "mysticeye",
  },
  runeturtle: {
    id: "runeturtle",
    name: "ルーンタートル",
    rarity: RARITY.ARCANA,
    element: ELEMENTS.EARTH,
    baseAtk: 45,
    baseHp: 450,
    skillId: "runebarrier",
  },
  celestcat: {
    id: "celestcat",
    name: "セレスキャット",
    rarity: RARITY.ARCANA,
    element: ELEMENTS.LIGHT,
    baseAtk: 60,
    baseHp: 340,
    skillId: "celestclaw",
  },
  // ---- ビヨンド追加 ----
  galaxybee: {
    id: "galaxybee",
    name: "ギャラクシービー",
    rarity: RARITY.BEYOND,
    element: ELEMENTS.LIGHT,
    baseAtk: 100,
    baseHp: 480,
    skillId: "galaxysting",
  },
  phantomwolf: {
    id: "phantomwolf",
    name: "ファントムウルフ",
    rarity: RARITY.BEYOND,
    element: ELEMENTS.DARK,
    baseAtk: 90,
    baseHp: 540,
    skillId: "phantomhowl",
  },
  // ---- センチュリー追加 ----
  eternabloom: {
    id: "eternabloom",
    name: "エターナブルーム",
    rarity: RARITY.CENTURY,
    element: ELEMENTS.LIGHT,
    baseAtk: 115,
    baseHp: 1000,
    skillId: "eternalbloom",
  },
};
// 内蔵種族 + 自動生成種族(content-pack)をマージ(id→種族オブジェクト)。
export const SPECIES = Object.freeze({
  ...BASE_SPECIES,
  ...Object.fromEntries(EXTRA_SPECIES.map((s) => [s.id, s])),
});

// ---- レア度の空き枠(rarityCaps の運用側) ----
// 種族数をレア度ごとに数える。全レア度のキーが必ず入る(0埋め)。
export function speciesCountByRarity(species = SPECIES) {
  const out = Object.fromEntries(RARITY_ORDER.map((r) => [r, 0]));
  for (const s of Object.values(species)) {
    if (out[s.rarity] !== undefined) out[s.rarity] += 1;
  }
  return out;
}

// 各レア度が「あと何体追加できるか」。上限に達していれば0(=満枠。凍結ではなく、
// コモン枠が伸びれば自動的に開く)。gen-content.js が生成先の抽選に使う。
export function rarityHeadroom(species = SPECIES, commonCap = RARITY_CAP_COMMON) {
  const counts = speciesCountByRarity(species);
  const caps = rarityCaps(commonCap);
  return Object.fromEntries(
    RARITY_ORDER.map((r) => [r, Math.max(0, caps[r] - counts[r])]),
  );
}

// 階段(単調減少)が守られているか。壊れている箇所を返す(空配列なら健全)。
// 既存種は削除できないため、崩れは「下位を増やして追い越させる」ことでのみ直る。
export function rarityStepViolations(species = SPECIES) {
  const counts = speciesCountByRarity(species);
  const bad = [];
  for (let i = 1; i < RARITY_ORDER.length; i++) {
    const lower = RARITY_ORDER[i - 1];
    const upper = RARITY_ORDER[i];
    if (counts[upper] >= counts[lower]) {
      bad.push({ upper, lower, upperCount: counts[upper], lowerCount: counts[lower] });
    }
  }
  return bad;
}

// レア度ごとの孵化テーブル(卵のレア度 → 出てくる種族の候補)。自動生成種族もレア度別に追加。
const BASE_HATCH_TABLE = {
  [RARITY.COMMON]: [
    "flamewolf", "aquafox", "terrashell", "leafmouse", "puffbird",
    "mudpup", "dewgecko", "honeybee", "peachcat", "coalmole",
  ],
  [RARITY.RARE]: [
    "shadowmouse", "pebblemole", "sparkbee", "thornfox", "cinderbird",
    "tideshell", "boltmouse", "moonblossom", "duskcat", "flamewolf", "aquafox",
  ],
  [RARITY.ULTRA]: [
    "galebird", "voltgecko", "frostwolf", "blazegecko", "thunderbird",
    "glacierturtle", "mistraven", "terrawolf", "shadowmouse",
  ],
  [RARITY.LEGEND]: [
    "emberdrake", "sunblossom", "nightraven", "frostdrake", "solarcat",
    "thornshell", "galewolf", "galebird",
  ],
  [RARITY.IMMORTAL]: [
    "abyssfox", "gaiaturtle", "pyrebird", "lunarfox", "titanmole",
    "tempestgecko", "emberdrake",
  ],
  [RARITY.ARCANA]: ["auradrake", "voiddrake", "mysticowl", "runeturtle", "celestcat", "abyssfox"],
  [RARITY.BEYOND]: ["prismcat", "stormdrake", "galaxybee", "phantomwolf", "auradrake", "voiddrake"],
  [RARITY.CENTURY]: ["chronowl", "relicshell", "eternabloom", "prismcat", "stormdrake"],
  [RARITY.COSMIC]: ["nebulafox", "cosmicdrake", "chronowl"],
  [RARITY.CELESTIAL]: ["seraphdrake"],
};
// 自動生成種族を、そのレア度の孵化プールに追加してマージ(卵から出現するように)。
export const HATCH_TABLE = Object.freeze(
  (() => {
    const merged = {};
    for (const r of RARITY_ORDER) merged[r] = [...(BASE_HATCH_TABLE[r] ?? [])];
    for (const s of EXTRA_SPECIES) {
      if (!merged[s.rarity]) merged[s.rarity] = [];
      if (!merged[s.rarity].includes(s.id)) merged[s.rarity].push(s.id);
    }
    return merged;
  })(),
);

// ---- 個体ランク ----
// 個体値の平均から S/A/B/C を判定する。配合の子は上限を超えられるので S を狙いやすい。
export const GRADES = [
  { rank: "S", min: 1.18, stars: 5, color: "#ffcf4a" },
  { rank: "A", min: 1.08, stars: 4, color: "#b57bff" },
  { rank: "B", min: 0.98, stars: 3, color: "#5aa9e6" },
  { rank: "C", min: 0, stars: 2, color: "#b9c2cf" },
];

export function gradeFromIv(iv) {
  const avg = (iv.atk + iv.hp) / 2;
  return GRADES.find((g) => avg >= g.min) ?? GRADES[GRADES.length - 1];
}

// ---- 今週のアップデート発表(2026-07-11) ----
// content-pack の season 印から「その週に増えたもの」を自動集計する。
// UI(起動時の📢ウィンドウ)が LATEST_SEASON の分だけを1枚で発表する。
//
// 2026-07-21 ユーザー指示「アップデートはOKが出ない限り実装されない。少なくとも
// リリースしてからのお知らせにして」:
//  ・RELEASE_SEASON より前の season は「初期収録コンテンツ」= お知らせに出さない
//  ・リリース後の週次生成は、ユーザーOKが出たビルドにだけ新しい season を含める
//    (パイプラインを勝手に回して出荷しない。CLAUDE.mdの週次運用ルール)
export const RELEASE_SEASON = "2026-W32"; // リリース週(8/5-6)。これ以降のseasonだけ告知
export const UPDATE_FEED_ALL = Object.freeze(
  (() => {
    const items = [];
    const push = (season, icon, text) => {
      if (season) items.push({ season, icon, text });
    };
    for (const s of EXTRA_SPECIES)
      push(s.season, "🐣", `新キャラ「${s.name}」(${RARITY_META[s.rarity]?.label ?? s.rarity})`);
    for (const e of EXTRA_EQUIPMENT)
      push(e.season, "⚔", `新装備「${e.name}」(${RARITY_META[e.rarity]?.label ?? e.rarity}・固有)`);
    for (const sk of Object.values(EXTRA_SKILLS))
      if (sk.poolStars) push(sk.season, "✦", `新スキル「${sk.name}」(★${sk.poolStars}・習得候補に追加)`);
    for (const p of Object.values(EXTRA_PERKS))
      push(p.season, "🔮", `新スフィア「${p.label}」(盤面の外周に出現)`);
    for (const j of EXTRA_JOBS)
      push(j.season, "🛡", `新ジョブ「${j.label}」(進化のランダム枠に追加)`);
    for (const r of EXTRA_TUNING.regions ?? [])
      push(r.season, "🗺", `新地域「${r.name}」(トーメントの先に+100面)`);
    if (EXTRA_TUNING.levelCapSeason)
      push(EXTRA_TUNING.levelCapSeason, "⬆", `レベル上限が ${LEVEL_CAP} に解放`);
    for (const s of EXTRA_EXPEDITION_SPOTS) push(s.season, "🧭", `新探索先「${s.name}」`);
    for (const b of EXTRA_DAILY_BOSSES) push(b.season, "👹", `新デイリーボス「${b.name}」`);
    return items.sort((a, b) => (a.season < b.season ? 1 : a.season > b.season ? -1 : 0));
  })(),
);
// プレイヤーに見せるのはリリース週以降のぶんだけ(それ以前は初期収録)
export const UPDATE_FEED = Object.freeze(UPDATE_FEED_ALL.filter((i) => i.season >= RELEASE_SEASON));
export const LATEST_SEASON = UPDATE_FEED[0]?.season ?? null;

// ---- 運営からのメール(パーティ窓のメールタブ 2026-07-11) ----
// 内蔵のウェルカムメール+content-packのEXTRA_MAILS(週次自動化やお知らせの差し込み口)。
// 新しい順。既読管理はUI側(localStorage)で行い、セーブデータには触れない。
export const GAME_MAILS = Object.freeze(
  [
    {
      id: "welcome",
      from: "運営チーム",
      // 日付は入れない(固定日付だと「1か月前に届いていた手紙」になる 2026-07-27)
      date: "",
      title: "TASMONへようこそ!",
      body:
        "はじめまして、運営チームです。\n\nこのゲームはゲーム内の「目安箱」に届いたみんなの声を反映しながらアップデートされていきます。\n\nアップデートの内容は隣の「お知らせ」タブでいつでも読み返せます。それでは、よい放置ライフを!",
    },
    // 運営方針の声明(2026-08-12 ユーザー指示)。目安箱駆動のアップデート運用(試用/
    // 投票/採否サイクル)の趣旨を、プレイヤーにも明文化して伝える
    {
      id: "ops-policy-2026-08",
      from: "運営チーム",
      date: "",
      title: "運営方針についてのお知らせ",
      body:
        "いつも遊んでくれてありがとうございます、運営チームです。\n\n" +
        "今後のアップデート方針を改めてお伝えします。\n\n" +
        "■ 不具合や分かりにくい表示は、気づき次第すぐに直します。\n" +
        "■ ゲームの仕組みやバランス(難易度・入手率など)は、目安箱に届いたみんなの声をもとに調整していきます。\n\n" +
        "卵のドロップ率は、今はかなり渋めに設計しています。この点についても、目安箱で意見をもらいながら今後調整していく予定です。\n\n" +
        "よかったら目安箱から遠慮なく声を届けてください。",
    },
    ...EXTRA_MAILS.filter((m) => m && m.id && m.title && m.body),
  ].sort((a, b) => {
    // 2026-08-12 発見: 旧比較関数は同じdate(空文字含む)同士でも常に-1を返す壊れた
    // 比較関数で、日付なしメールが複数あると並び順が不安定だった(Array.sortの安定性は
    // 「同値」と判定された要素にしか働かない)。3値比較にして宣言順を保つ
    const da = a.date ?? "";
    const db = b.date ?? "";
    if (da === db) return 0;
    return da < db ? 1 : -1;
  }),
);
