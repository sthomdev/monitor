// 装備システム。撃破ドロップで手に入り、モンスター1体につき EQUIP_SLOTS 個まで装備できる。
// レア度が高いほどオプション行が多く、数値にも幅がある(当たり外れ=厳選の種)。
// レジェンダリーは固有オプション(攻撃速度 or スキル威力)が1行確定で付く。
// 装備オブジェクトはモンスターの equipment 配列(装備中)か、state.items 配列(インベントリ)に直接入る。

import { RARITY_ORDER, rarityWeights } from "./data.js";
import { uniform, weightedPick } from "./rng.js";
import { EXTRA_EQUIPMENT } from "./content-pack.js";
import { trialListBlockReason } from "./trial.js";

// 撃破1回あたりの装備(宝箱)ドロップ率。0.05→0.03: 箱1個の重みを上げる。
// 2026-07-08「宝箱のドロップ数はもう少し絞って」→ 0.03→0.02。
// 2026-07-08 追加「もう少し上げていい・特にノーマル」→ 0.02→0.045。
// 2026-07-09「半減」で0.0225に下げたが「ドロップ率戻して」で 0.045 に復帰。
export const EQUIP_DROP_CHANCE = 0.045;
// 2026-08-09 Haru指示「ノーマルエリアの宝箱ドロップ率は1.5倍くらいに」。
// 全難易度一律で上げるとアルカナ累計期待値・合成レベルの並走(difficulty-guard)が
// 崩れることを実測で確認したため、ノーマル(難易度0)限定の乗率にして
// トーメント/ヘル/Lv100のペース目標(はるかに後の難易度で律速)へ触れないようにする
//
// 2026-08-11 Haru指示「一度ノーマルをクリアすると通常に戻るように。一生ノーマルを
// 周回するとおいしい設計にならないように」: あくまで序盤の立ち上がりブーストであって
// 恒久ファーム地点にしてはいけないので、state.js側で bossClearedD[0](ノーマル10-10
// 初撃破=完全クリアの実測)を見て、クリア後は難易度を戻ってもこの乗率が乗らないよう
// ゲートしている(定数はそのまま・適用条件だけ絞った)
export const NORMAL_CHEST_BONUS_MULT = 1.5;

// インベントリ(未装備品)の上限。満杯のときは新規ドロップしない。
export const INV_CAP = 40;

// 1体あたりの装備枠。レベルで解放される(TBH式の多スロットに寄せた段階解放)。
export const EQUIP_SLOTS = 6; // 最大枠(UIのグリッド数)
export const SLOT_UNLOCK_LEVELS = [1, 1, 1, 1, 1, 30]; // 各枠が解放されるレベル(実ゲートはPART_UNLOCK)

// 今のレベルで使える装備枠の数
export function equipCap(level) {
  let n = 0;
  for (const lv of SLOT_UNLOCK_LEVELS) if (level >= lv) n++;
  return n;
}

// 装備レベルによる数値倍率。Lv1=1.0、以降1レベルごとに +EQUIP_LV_RATE。
// 2026-07-08「同レアなら高Lvが必ず強く」対応の要は“基礎ステのランダム幅撤廃(決定的化)”。
// これで 値 = レア度倍率 × 装備レベル倍率 のみで決まり、同レア・同部位なら装備Lvが上=
// 基礎ステが必ず上になる(低Lvの方が数値が高い逆転が起きない)。
// 率自体は 0.015 のまま(0.02以上に上げると balance-sim で終盤がヌルくなるため据え置き)。
// 例: Lv30=1.435倍 / Lv50=1.735倍 / Lv100=2.485倍。
export const EQUIP_LV_RATE = 0.015;
export function equipLevelMult(lv) {
  return 1 + Math.max(0, (Math.round(lv ?? 1) - 1)) * EQUIP_LV_RATE;
}

// オプションの定義。base はロール範囲、target は効く先。
// unique: true はレジェンダリー固有枠でしか出ない。
// 2026-07-08リワーク: 装備の「基本ステ」は固定値(フラット加算)に、「特性」は%と
// 固定値の混在に。atkFlat/hpFlat が固定値ステ。percent:true が%特性。
export const STAT_META = Object.freeze({
  atkFlat: { label: "攻撃力", flat: "atk", base: [0.12, 0.22] }, // 固定値: 最終攻撃力に加算(baseは特性用の割合幅)
  hpFlat: { label: "最大HP", flat: "hp", base: [0.14, 0.26] }, // 固定値: 最終HPに加算
  atkPct: { label: "攻撃%", base: [0.05, 0.1], percent: true },
  hpPct: { label: "最大HP%", base: [0.06, 0.12], percent: true },
  defPct: { label: "防御", base: [0.015, 0.03], percent: true }, // 被ダメ軽減(パーティ合計は上限あり)
  critRate: { label: "クリティカル率", base: [0.005, 0.012], percent: true }, // 会心の発生率(合計は上限50%)
  critDmg: { label: "クリティカルダメージ", base: [0.04, 0.1], percent: true }, // 会心時の追加倍率(合計は上限+150%)
  cdr: { label: "クールタイム短縮", base: [0.008, 0.018], percent: true }, // スキルCD短縮(合計は上限50%)
  goldBonus: { label: "ゴールド", base: [0.04, 0.08], percent: true },
  expBonus: { label: "経験値", base: [0.04, 0.08], percent: true },
  dropBonus: { label: "卵ドロップ", base: [0.004, 0.008], percent: true },
  atkSpeed: { label: "攻撃速度", base: [0.08, 0.15], percent: true, unique: true },
  skillPower: { label: "スキル威力", base: [0.12, 0.25], percent: true, unique: true },
  // アクセ専用の基本ステ(2026-07-13 FB): 単体スキルが全体化(威力xx%で全敵ヒット)/宝箱ドロップ率UP
  skillAoe: { label: "スキル全体化(威力)", base: [0.3, 0.5], percent: true, charmOnly: true },
  chestBonus: { label: "宝箱ドロップ", base: [0.04, 0.08], percent: true, charmOnly: true },
  // ユニーク限定ステ(2026-07-13 FB「ユニークにはほかの装備にはつかない限定ステータス」)。
  // 値はレア度倍率を掛けない「最終値」レンジ(強力なので直指定でバランス管理)
  lifesteal: { label: "与ダメ吸収", base: [0.02, 0.05], percent: true, uniqueOnly: true },
  bossDmg: { label: "ボス特効", base: [0.1, 0.25], percent: true, uniqueOnly: true },
  // 細工v3限定ステ(2026-07-19): 通常の装備ロールからは出ない(プールに入れない)。
  // 属性攻撃力=有利属性への与ダメ+X% / 属性防御力=弱点を突かれた被ダメ-X%(上限30%)
  elemAtk: { label: "属性攻撃力", base: [0.01, 0.03], percent: true, enhanceOnly: true },
  elemDef: { label: "属性防御力", base: [0.01, 0.03], percent: true, enhanceOnly: true },
  // 「魂の器」(2026-07-21 FB「HP盛り×HP比シールドの抜け道は残したい。ただし運よく
  // オプションがかみ合った時だけ成立するように」): 細工で増えたHPのうち この割合を
  // 回復・バリアの基準HPにも算入する。既定では細工HPはサステインに乗らない
  // (=HPを盛るだけの無敵ループは不成立)が、この激レア行を引くと部分的に解禁される。
  // 合計は SUSTAIN_VESSEL_CAP(50%)で頭打ち=「非常に硬い」止まりで literal 無敵にはしない
  soulVessel: { label: "魂の器", base: [0.15, 0.3], percent: true, enhanceOnly: true },
});

// ユニーク装備だけが持つ限定ステのプール。設計図IDから決定的に1つ付く
export const UNIQUE_EXCLUSIVE_STATS = Object.freeze(["lifesteal", "bossDmg"]);

// 特性プール: 固定値(atkFlat/hpFlat)と%特性を混在させる(2026-07-08指示)。
// dropBonus(卵)/chestBonus(宝箱)はレアステータス(2026-07-13 FB): 通常特性からは
// 出ず、アクセサリーの基本ステ限定+アルカナ以上限定+低weight(下のCHARM_BASE_ROLL)
const NORMAL_POOL = ["atkFlat", "hpFlat", "atkPct", "hpPct", "defPct", "critRate", "critDmg", "cdr", "goldBonus", "expBonus"];
const UNIQUE_POOL = ["atkSpeed", "skillPower"];

// ---- フラット(固定値)ステの土台 ----
// そのLvの「代表的なモンスターの素の攻撃/HP」を近似した基準値。固定値装備は
// これ × 基礎割合 × レア度倍率 × 装備Lv倍率 で決まる。育て切った高レア個体には
// 相対的に控えめ(=装備は底上げ)になり、拾ったLv帯では強く効く。balance-sim で較正。
export const EQUIP_REF_ATK = 17;
export const EQUIP_REF_HP = 105;
export function equipRefStat(kind, lv) {
  const L = Math.max(1, Math.round(lv ?? 1));
  return kind === "hp"
    ? EQUIP_REF_HP * (1 + (L - 1) * 0.12)
    : EQUIP_REF_ATK * (1 + (L - 1) * 0.1);
}
// 固定値ステ(atkFlat/hpFlat)の実値。frac=基礎割合、rarity/lvで増える。
export function flatStatValue(stat, frac, rarity, lv) {
  const kind = STAT_META[stat].flat; // "atk" | "hp"
  return Math.max(1, Math.round(equipRefStat(kind, lv) * frac * VALUE_MULT[rarity] * equipLevelMult(lv)));
}

// 部位ごとの「基礎ステ」(必ず1行目に付く)。武器=攻撃、鎧/盾=防御、兜=HP…と
// 部位の役割がひと目でわかる(2026-07-06リワーク)。値はレア度倍率つき
// ※sub(旧サブ武器)はモンスターが手に持つ第2武器という設定に無理があったため
//   2026-07-07に「盾」へ変更。基礎ステもatkPct→defPctへ(鎧より控えめな値)
// 2026-07-08: 武器=攻撃・兜=HP の基礎ステは「固定値(フラット)」に変更(atkFlat/hpFlat)。
// range は固定値の基礎割合(equipRefStatに掛ける)。防御/速度/金は従来どおり%のまま。
export const BASE_STAT_BY_PART = Object.freeze({
  weapon: { stat: "atkFlat", range: [0.5, 0.5] },
  sub: { stat: "defPct", range: [0.015, 0.028] },
  armor: { stat: "defPct", range: [0.02, 0.04] },
  helm: { stat: "hpFlat", range: [0.5, 0.5] },
  boots: { stat: "atkSpeed", range: [0.012, 0.025] },
  charm: { stat: "goldBonus", range: [0.04, 0.08] }, // 指輪の値(charmKindなし旧品もこれ)
});

// アクセサリーの種別(2026-07-12 FB「ゴールド固定が萎える。種別分けを」)。
// 種別でメイン性能が固定: 指輪=ゴールド / イヤリング=会心率 / ネックレス=スキル威力。
// 値はVALUE_MULT×レベル倍率が掛かる前の基礎レンジ(指輪=従来の御守りと同値)。
export const CHARM_KINDS = Object.freeze({
  ring: { id: "ring", label: "指輪", icon: "💍", base: "リング", stat: "goldBonus", range: [0.04, 0.08] },
  earring: { id: "earring", label: "イヤリング", icon: "🧿", base: "イヤリング", stat: "critRate", range: [0.015, 0.03] },
  necklace: { id: "necklace", label: "ネックレス", icon: "📿", base: "ネックレス", stat: "skillPower", range: [0.05, 0.1] },
});
export const CHARM_KIND_ORDER = ["ring", "earring", "necklace"];

// アクセの基本ステはこのプールからランダム(2026-07-13 FB「固定が萎える→ランダムに」)。
// スキル全体化は「単体攻撃スキルが威力xx%で全体ヒット」になる浪漫枠。
export const CHARM_BASE_POOL = Object.freeze([
  { stat: "skillAoe", range: [0.3, 0.5] },
  { stat: "dropBonus", range: [0.006, 0.012] },
  { stat: "chestBonus", range: [0.04, 0.08] },
  { stat: "expBonus", range: [0.05, 0.1] },
  { stat: "critRate", range: [0.015, 0.03] },
  { stat: "critDmg", range: [0.1, 0.2] },
  { stat: "atkSpeed", range: [0.04, 0.08] },
  { stat: "skillPower", range: [0.05, 0.1] },
]);

// レア度ごとの「特性」行数(基礎ステとは別枠)と数値倍率。バランスシムでも参照する。
export const LINES = {
  common: 0, rare: 1, ultra: 2, legend: 2, immortal: 3,
  arcana: 3, beyond: 4, century: 4, cosmic: 5, celestial: 6,
};
export const VALUE_MULT = {
  common: 1, rare: 1.5, ultra: 2.1, legend: 3, immortal: 4.2,
  arcana: 6, beyond: 8.5, century: 12, cosmic: 17, celestial: 24,
};
// 固有特性(速度/スキル威力)が確定で付くレア度
const UNIQUE_TIERS = new Set(["legend", "immortal", "arcana", "beyond", "century", "cosmic", "celestial"]);

// 名前生成: レア度の接頭辞 + 先頭オプションに応じた武具名
const PREFIX = {
  common: "素朴な",
  rare: "鋭い",
  ultra: "輝く",
  legend: "黄金の",
  immortal: "不滅の",
  arcana: "秘められし",
  beyond: "次元の",
  century: "世紀の",
  cosmic: "銀河の",
  celestial: "天上の",
};
const BASE_NAME = {
  atkPct: "クロー",
  hpPct: "シェル",
  goldBonus: "コイン",
  expBonus: "ノート",
  dropBonus: "チャーム",
  atkSpeed: "ウィング",
  skillPower: "オーブ",
};

// ---- 武器・サブ武器のジョブ固有化(2026-07-12 FB) ----
// アタッカー=剣と斧 / タンク=槍と盾 / ヒーラー=杖とオーブ / バッファー=弓と矢。
// weapon/subのドロップはロールを抽選し、そのロールのタスモンだけが装備できる。
// role無しの旧装備は共用(誰でも装備可)のまま。
export const ROLE_WEAPONS = Object.freeze({
  nuke: { weapon: "ソード", sub: "アックス", wIcon: "🗡", sIcon: "🪓", label: "アタッカー" },
  guard: { weapon: "ランス", sub: "シールド", wIcon: "🔱", sIcon: "🛡", label: "タンク" },
  heal: { weapon: "スタッフ", sub: "オーブ", wIcon: "🪄", sIcon: "🔮", label: "ヒーラー" },
  buff: { weapon: "ボウ", sub: "アロー", wIcon: "🏹", sIcon: "🎯", label: "バッファー" },
});
export const ROLE_WEAPON_ORDER = ["nuke", "guard", "heal", "buff"];

// ジョブ専用装備はジョブに関係するステータスを持つ(2026-07-13 FB)。
// サブ武器の基礎ステはジョブに合わせた2種からランダム(2026-07-13 FB追記:
// アタッカー=攻撃系 / タンク=HP・防御 / 回復=スキル威力・HP / バッファー=CD短縮・ドロップ率)。
// 武器の基礎は全ロール共通で攻撃=直感のまま。
export const ROLE_SUB_POOL = Object.freeze({
  nuke: [
    { stat: "atkPct", range: [0.04, 0.08] },
    { stat: "critDmg", range: [0.08, 0.14] },
  ],
  guard: [
    { stat: "hpPct", range: [0.05, 0.1] },
    { stat: "defPct", range: [0.015, 0.028] },
  ],
  heal: [
    { stat: "skillPower", range: [0.08, 0.14] },
    { stat: "hpPct", range: [0.05, 0.1] },
  ],
  buff: [
    { stat: "cdr", range: [0.012, 0.024] },
    { stat: "goldBonus", range: [0.05, 0.1] }, // ドロップ率はレアステ化(2026-07-13 FB)
  ],
});
// 特性もロール寄りに(70%はこのプール、30%は全体プールで彩り)
export const ROLE_TRAIT_POOL = Object.freeze({
  nuke: ["atkFlat", "atkPct", "critRate", "critDmg"],
  guard: ["hpFlat", "hpPct", "defPct"],
  heal: ["cdr", "hpPct", "hpFlat"],
  buff: ["goldBonus", "expBonus", "cdr"],
});

// ---- 部位 ----
// 装備は6部位。各部位に1個だけ装備できる(同部位は付け替え=スワップ)。
export const PARTS = Object.freeze({
  weapon: { id: "weapon", label: "武器", icon: "⚔", base: "ブレード" },
  armor: { id: "armor", label: "鎧", icon: "🛡", base: "メイル" },
  helm: { id: "helm", label: "兜", icon: "🪖", base: "ヘルム" },
  boots: { id: "boots", label: "靴", icon: "🥾", base: "ブーツ" },
  sub: { id: "sub", label: "サブ武器", icon: "🔰", base: "シールド" },
  charm: { id: "charm", label: "アクセサリー", icon: "💍", base: "リング" },
});
export const PART_ORDER = ["weapon", "armor", "helm", "boots", "sub", "charm"];

// 部位ごとの装備スロット数。御守り(アクセサリー)だけ複数付けられる(2026-07-08指示: 2〜4→3枠)。
export const PART_SLOTS = Object.freeze({
  weapon: 1, armor: 1, helm: 1, boots: 1, sub: 1, charm: 3,
});

// 部位ごとの解放レベル。2026-07-10「装備できない期間が長すぎ」FB対応:
// 御守り(アクセサリー)以外は最初から装備できる。解放の楽しみは御守り3枠に集約。
export const PART_UNLOCK = Object.freeze({
  weapon: 1,
  armor: 1,
  helm: 1,
  boots: 1,
  sub: 1,
  charm: 30,
});

// 御守り(アクセサリー)3枠の段階解放レベル(2026-07-11 FB「Lv60で全部解放されるように」)
export const CHARM_SLOT_UNLOCK = Object.freeze([30, 45, 60]);

// アクセサリー3枠と種別(ring/earring/necklace)の対応(2026-07-13 FB修正で
// イヤリング/ネックレス/リングの表示順に確定)。枠は種別ごとに固定で、
// CHARM_SLOT_UNLOCK[このindex]がその種別枠の解放レベルになる。
// (2026-07-15 FB「イヤリングのところにリングを装備できる」バグ修正で
// 表示位置だけでなく実際の装備先もこの対応で固定する)
export const CHARM_SLOT_KINDS = Object.freeze(["earring", "necklace", "ring"]);
export function charmKindOf(item) {
  return item.charmKind && CHARM_KINDS[item.charmKind] ? item.charmKind : "ring";
}

// 旧セーブ(部位なしアイテム)の部位を先頭オプションから推定する
export function inferPart(item) {
  const map = {
    atkPct: "weapon",
    hpPct: "armor",
    expBonus: "helm",
    dropBonus: "boots",
    atkSpeed: "sub",
    skillPower: "sub",
    goldBonus: "charm",
  };
  return map[item.opts?.[0]?.stat] ?? "weapon";
}

let nextItemId = 1;

// 装備レベルは固定の段階制(2026-07-13 FB「最新装備が装備できない事象」対策):
// 中途半端なレベルの装備が出ない=拾ってすぐ装備できる。装備条件はタスモンLv>=装備Lv(従来)
export const EQUIP_LV_TIERS = Object.freeze([1, 5, 10, 15, 20, 30, 40, 50, 60, 65, 80]);
export function equipLvTier(lv) {
  const L = Math.max(1, Math.round(lv ?? 1));
  let t = EQUIP_LV_TIERS[0];
  for (const v of EQUIP_LV_TIERS) if (v <= L) t = v;
  return t;
}

// キューブ合成: 同じレア度の装備をこの個数あつめると1つ上のレア度に合成できる
export const CRAFT_COST = 9;

// ---- 装備レベル(10刻みの帯)と キューブのレベリング(2026-07-07) ----
// 装備はドロップ時の実効ステージ(1..120)をレベルとして持つ。合成は「同じレア度 かつ
// 同じ10レベル帯」でそろえる(帯=Lv1-10 / Lv11-20 / …)。結果も同じ帯の1つ上のレア度。
// 合成の「レベル帯」。2026-07-08「序盤は合成レベルの範囲を緩和しないと合成できない」対応で
// 序盤(Lv1-30)は1つの広い帯(band 0)にまとめ、素材9個を集めやすく&最初から解放。
// Lv31以降は従来どおり10刻み(band 3,4,5…)。
// 合成のレベル帯(2026-07-13 FB: 「合成はレベル1-10,10-20,15-30,20-40,30-50,
// 40-65,65-80にして」)。帯は重なりを持つ=拾った装備がどこかの帯で必ず活きる。
// band引数はこの配列のインデックス。
export const CRAFT_BANDS = Object.freeze([
  { min: 1, max: 10 },
  { min: 10, max: 20 },
  { min: 15, max: 30 },
  { min: 20, max: 40 },
  { min: 30, max: 50 },
  { min: 40, max: 65 },
  { min: 65, max: 80 },
]);
export function bandMinOf(band) {
  return CRAFT_BANDS[band]?.min ?? 1;
}
export function bandCeilOf(band) {
  return CRAFT_BANDS[band]?.max ?? 80;
}
// そのLvが入る一番高い帯(自動選択の既定などに使う)。帯は重なるため
// 「入れられる帯」は複数ありうる(判定は min<=lv で行う)
export function itemBand(lv) {
  const l = Math.max(1, Math.round(lv ?? 1));
  for (let i = CRAFT_BANDS.length - 1; i >= 0; i--) {
    if (l >= CRAFT_BANDS[i].min && l <= CRAFT_BANDS[i].max) return i;
  }
  return l > 80 ? CRAFT_BANDS.length - 1 : 0;
}
export function bandLabel(band) {
  const b = CRAFT_BANDS[band] ?? CRAFT_BANDS[0];
  return `Lv.${b.min}〜${b.max}`;
}

// キューブは合成するたびに経験値がたまってレベルが上がる。レア度が高い素材を合成するほど
// 経験値が多い。キューブレベルが上がると上位レア度の合成が解放される。
export const CUBE_EXP_BY_RARITY = Object.freeze({
  common: 4, rare: 10, ultra: 22, legend: 45, immortal: 90,
  arcana: 180, beyond: 340, century: 600, cosmic: 1000, celestial: 1800,
});
export const CUBE_LEVEL_MAX = 100; // キャラのレベルキャップと並走(2026-07-12 FB)
// 2026-07-29「合成レベルとキャラレベルが同じくらいになるように進捗」再較正:
// 旧線形(14+2L)は30日カーブだとキャラLv60時点で合成が100に到達し、並走が壊れていた。
// 新カーブは balance-model の箱ドロップ供給(perLevel×normalChestWeights×投入率0.6)への
// フィットで、キャラLv10/30/60/80 の時点で合成Lv8/29/59/78 と並走する。
// ・1-29: 2.72L(序盤はコモン合成1回=36EXPで数レベル上がる手ざわり)
// ・30-59: 72+53(L-29)(キャラの中盤鈍化と同じ勾配で重くなる)
// ・60-: 1435で頭打ち。カンスト(Lv100)時点では合成≈74で、
//   最後の26レベルはカンスト後の周回で追い越す(クリアまでは常に並走が優先)
// 並走の検査は tools/balance-model.js の evaluateBalance が毎コミット行う
//
// 2026-08-05 Haru実測FB「キャラLv42なのに合成Lv34。同じ速度になるよう緩和して」:
// evaluateBalance の想定(CUBE_FEED_RATE=0.6=宝箱価値の60%を合成へ投入)は理想値で、
// 実プレイは装備・売却に回る分だけ合成へ回る割合が低い(実測feedRate≈0.3で
// 旧カーブは Lv42時点で合成34相当=モデルの想定より重く感じる)。旧カーブの
// 数値をそのまま各帯15%引き下げ、実プレイの手ざわりを緩和した
//
// 2026-08-07 Haru指示「合成レベルが上がりづらすぎる。50レベルまではキャラレベルより
// 少し高いくらいになる設計でいい」: 8/5の15%引き下げでもまだ実測feedRate≈0.3では
// 追いつかなかった(Lv50時点で合成43相当)。1-59帯をさらに0.4倍(15%引き下げ後から
// 実質-60%)し、実測feedRate=0.3で Lv10/30/50/60=合成10/33/53/64(常に同値以上)になる
// よう再較正。60以降は今回の指示の範囲外(「50レベルまで」)なので1435のまま据え置き
// (ガード側の並走帯は tools/balance-model.js 側を [0.8L,1.4L] に合わせて更新済み)
//
// 2026-08-10 FB「合成レベルが上がりすぎ。キャラLv14なのに合成Lv22」: 8/9に導入した
// ノーマル帯の宝箱ブースト(NORMAL_CHEST_BONUS_MULT/NORMAL_AREA_RARE_BOX_MULT)が
// この較正の後に追加されたため未反映で、合成レベルの供給源(宝箱)が実質1.5倍以上に
// 増えたぶんだけこのカーブが軽すぎるままだった(balance-model.js側もこの2定数を
// 見ていなかったため、L=30/60/80の並走ガードは無警告のまま素通りしていた=モデルの穴)。
// 両方を修正: モデル側はノーマル帯のブーストを織り込むよう修正(evaluateBalance)、
// カーブ側は1-59帯を約1.5倍(1.09→1.65→1.95・28.8/21.2→56/34)に再較正し、
// 実測相当でLv14/30/42/60/80=合成17/37/51/74/100(常に「少し高いくらい」の比率≈1.2倍)になる
//
// 2026-08-12 Haru指示「合成レベルのバランスはキャラLvの0.8-1.0にできる?」: 8/10較正の
// 「少し高いくらい(≈1.2倍)」からさらに一段引き締め、常にキャラLv以下〜同値に留める
// 方針へ変更。1-59帯を1.2倍(1.95→2.34・56/34→67.2/40.8)、60以降は0.6倍
// (1435→861)に再較正。実測feedRate≈0.3でLv10/14/20/30/42/50/60/80/100=
// 合成9/11/17/30/42/48/57/80/92(比0.90/0.79/0.85/1.00/1.00/0.96/0.95/1.00/0.92倍)。
// Lv14だけ整数丸めで0.79倍(端数1レベルの丸め差)になるが、他は要求どおり0.8〜1.0倍に収まる。
// 60以降を軽く(0.6倍)したのは、旧カーブ(флат1435)だと終盤ほど供給が敵HP等の
// ステージスケールに追いつかず比率が下がり続けていた(Lv100で0.82倍)のを均すため
export function cubeExpToNext(level) {
  const L = Math.max(1, level);
  if (L < 30) return Math.round(2.34 * L);
  if (L < 60) return Math.round((56 + 34 * (L - 29)) * 1.2);
  return 861;
}
// そのレア度の「合成」に必要なキューブレベル(旧設計。現在はレア度制限は撤廃)。
export const CUBE_UNLOCK_LEVEL = Object.freeze({
  common: 1, rare: 1, ultra: 2, legend: 4, immortal: 7,
  arcana: 11, beyond: 16, century: 22, cosmic: 29, celestial: 37,
});

// 現行設計: レア度は全開放。代わりに「レベル帯」がキューブレベルで段階解放される。
// band 0(Lv1-10)は最初から。上の帯ほど高いキューブレベルが必要。
export function cubeLevelForBand(band) {
  const b = Math.max(0, band | 0);
  return Math.max(1, Math.round(1 + b * 2.4 + b * b * 0.35)); // 0→1,1→4,2→8,3→13,4→19...
}

// 装備1個をロールする(レア度はステージ依存の抽選)。装備レベル=ドロップ実効ステージ。
export function rollItem(stage, rng = Math.random) {
  return rollItemOfRarity(weightedPick(rarityWeights(stage), rng), rng, stage);
}

// 通常宝箱の中身: 基本はコモン/レア。ただしウルトラ以上も「超低確率の奇跡」として残す
// (木箱からコズミックが出る事件 = ハクスラ最高の瞬間)。
// 2026-07-09ユーザー指示:
//  - レア箱(=非コモン)のドロップ率を「もう少し下げる」→ コモンを1.6倍して木箱を主役に。
//  - 「ステージが高いほど高レア装備」→ 中位(ウルトラ/レジェンド/イモータル)の圧縮を
//    ゆるめ(0.12→0.35)、ステージ依存で伸びるウルトラ/レジェンドが箱にしっかり乗るように。
//  - アルカナ以降は従来どおり超低確率(0.12)に据え置き(奇跡の一撃は温存)。
export const NORMAL_CHEST_COMMON_SCALE = 1.6; // 木箱(コモン)を厚くしてレア箱率を下げる
// ウルトラ〜イモータルの圧縮(0.12→0.18)。ステージ依存で伸びるウルトラ/レジェンドが
// 高ステージほど箱に強く乗る(stage50で上位≈4%→stage120で≈14%と傾斜)。通常箱の
// 「ほぼコモン/レア」設計(序盤の上位<5%)は維持しつつ後半の傾斜を強める。
export const NORMAL_CHEST_MID_SCALE = 0.18;
// アルカナ: 奇跡の超低確率。2026-07-21 FB「トーメントクリアまでに累計2.5個」で
// 0.12→0.085(ランプ強化とセット。クリア後の周回は月24個級=攻略想定装備は合成と併せて成立)
export const NORMAL_CHEST_HIGH_SCALE = 0.085;
// ビヨンド以上は「1か月やって1個」のチェイス枠(2026-07-15 FB「ユニークやビヨンド以上の
// アイテムの排出量が多すぎる」)。アルカナとは分けて桁で絞る(旧: アルカナと同じ0.12で
// 実効400なら月17個も出ていた)。アルカナまでは攻略に要るので据え置き。
export const NORMAL_CHEST_LUXURY_SCALE = 0.0065;

// アルカナ以上のステージランプ(2026-07-21 FB「Lv65でアルカナ装備が3つも出てる。
// ドロップ率あってる? 設定の見直しを、二度と言われないように」→ 同日FB
// 「アルカナはトーメントクリアまでに累計2.5個。それより高いレアリティは
// もっと低く傾斜をかけて」):
// アルカナは「終盤(トーメント)の狙い枠」なのに、テーブル重みだけだとヘル帯でも
// 月30個級で漏れていた(実測: 実効200で月34個)。トーメント(実効301+)手前までは
// 桁で絞り、301→400で本来の率へ立ち上げる。ビヨンド以上にも同じランプを掛けて
// 「クリア前はさらに希少・クリア後の周回で解禁」の傾斜にする(全開後の月間率は
// 従来のまま=マーケット供給は変えない)。累計の帯は難易度番人が毎コミット検査
export const ARCANA_RAMP_START = 300; // ここまで×0.033
export const ARCANA_RAMP_FULL = 400; // ここから×1(全クリ後の周回=攻略想定装備)
export const ARCANA_RAMP_FLOOR = 0.033;
export function arcanaRampScale(stage) {
  if (stage <= ARCANA_RAMP_START) return ARCANA_RAMP_FLOOR;
  if (stage >= ARCANA_RAMP_FULL) return 1;
  return ARCANA_RAMP_FLOOR + (1 - ARCANA_RAMP_FLOOR) * ((stage - ARCANA_RAMP_START) / (ARCANA_RAMP_FULL - ARCANA_RAMP_START));
}

// 2026-08-09 Haru指示「ノーマルエリアのレア宝箱ドロップ率をさらに1.2倍に」。
// 「レア宝箱」=state.js側でitem.rarityが非コモンだった箱の見た目(kind:"rare")。
// かくりつ窓の表示もこの関数の正規化後の比率(非common÷合計)から引くため、
// 単純に非common側の重みをそのまま1.2倍しても、commonとの合計で正規化されて
// 実際の上昇率が目減りする(実測: stage20で重み×1.2→比率は約1.14倍にしかならない)。
// 「表示される確率そのものを1.2倍にする」ため、非common重みの合計と比率から
// 係数kを逆算し、正規化後の比率が厳密にrareBoxMult倍になるようにする。
// 第2引数はノーマル(難易度0)専用の呼び出し(state.js)だけが渡す
// (デフォルト1=既存呼び出し元のbalance-model.js/measure-production.mjsは無改修で不変)。
export const NORMAL_AREA_RARE_BOX_MULT = 1.2;
export function normalChestWeights(stage, rareBoxMult = 1) {
  const w = rarityWeights(stage);
  const mid = NORMAL_CHEST_MID_SCALE;
  const ramp = arcanaRampScale(stage);
  const s = NORMAL_CHEST_HIGH_SCALE * ramp;
  const lux = NORMAL_CHEST_LUXURY_SCALE * ramp; // ビヨンド以上も同じランプ(2026-07-21)
  const common = w.common * NORMAL_CHEST_COMMON_SCALE;
  const nc = {
    rare: w.rare,
    ultra: w.ultra * mid,
    legend: w.legend * mid,
    immortal: w.immortal * mid,
    arcana: w.arcana * s,
    beyond: w.beyond * lux,
    century: w.century * lux,
    cosmic: w.cosmic * lux,
  };
  if (rareBoxMult !== 1) {
    const ncSum = Object.values(nc).reduce((a, b) => a + b, 0);
    const share = ncSum / (common + ncSum); // 元の「レア宝箱」比率
    const k = (rareBoxMult * (1 - share)) / (1 - rareBoxMult * share); // 比率を厳密にrareBoxMult倍にする係数
    for (const key of Object.keys(nc)) nc[key] *= k;
  }
  return { common, ...nc };
}

// ステージ→「そのステージにいる頃の想定キャラレベル」(2026-07-13 FB
// 「ノーマル5,6幕でLv20台なのにLv50以上の装備が落ちる。想定レベルの範囲で落として」)。
// tools/balance-sim.js の PROFILES(恒久較正)と同じ対応表。区間内は線形補間。
// ドロップ装備のレベルはこの想定レベルを段階(EQUIP_LV_TIERS)に量子化して使う=
// 「拾ったのに20レベル先まで装備できない」を根絶する。
// 2026-07-17 FB「1-10の間が短くて合成レベル4なのにドロップ品がLv15になる」:
// 序盤のアンカーを寝かせた(stage10: 10→8 / stage30: 20→15)。これでLv1-10帯の装備は
// stage25前後まで出続け、合成帯1-10の滞在時間がキューブの成長と揃う。
// 想定キャラレベルより低いぶんには「拾ったのに装備できない」は起きない(装備条件は緩くなる方向)
const STAGE_LEVEL_ANCHORS = [
  [1, 1], [5, 5], [10, 8], [30, 15], [60, 30], [100, 40], [130, 46],
  [160, 53], [200, 60], [250, 68], [300, 73], [350, 77], [400, 80],
];
export function expectedLevelForStage(stage) {
  const s = Math.max(1, stage);
  let [s0, v0] = STAGE_LEVEL_ANCHORS[0];
  if (s <= s0) return v0;
  for (let i = 1; i < STAGE_LEVEL_ANCHORS.length; i++) {
    const [s1, v1] = STAGE_LEVEL_ANCHORS[i];
    if (s <= s1) return Math.round(v0 + ((v1 - v0) * (s - s0)) / (s1 - s0));
    [s0, v0] = STAGE_LEVEL_ANCHORS[i];
  }
  return Math.min(100, v0 + Math.round((s - s0) * 0.05)); // 400超(新地域)はゆるやかに
}

export function rollNormalChestItem(stage, rng = Math.random, rareBoxMult = 1, preferredRoles = null) {
  // 部位は"normal"バイアス: サブ武器/アクセは出にくい(2026-07-13 FB、TBH準拠)
  return rollItemOfRarity(
    weightedPick(normalChestWeights(stage, rareBoxMult), rng),
    rng,
    expectedLevelForStage(stage),
    "normal",
    preferredRoles,
  );
}

// ボス宝箱の中身: 主戦場はウルトラ〜イモータル(=攻略想定装備 2026-07-13設計:
// 普通プレイは「ほぼイモータル・終盤一部アルカナ」)。
// アルカナは終盤の狙い枠(20%圧縮)。ビヨンド以上は攻略必須でない贅沢品として
// さらに絞る(6%圧縮 — マーケットで価値が立つチェイス枠)。
export const BOSS_CHEST_HIGH_SCALE = 0.14; // 2026-07-21 累計2.5個較正(0.2→0.14)
// ボス箱のビヨンド以上も「1か月で1個」に合わせる(2026-07-15 FB)。通常箱と同じ桁。
export const BOSS_CHEST_LUXURY_SCALE = 0.0065;

export function bossChestWeights(stage) {
  const w = rarityWeights(stage + 40);
  // アルカナ以上のステージランプはボス箱にも同じ基準で効かせる(+40の上振れ込みの
  // テーブルステージで判定=ヘル帯のボス箱・探索から漏れない)
  const ramp = arcanaRampScale(stage + 40);
  const s = BOSS_CHEST_HIGH_SCALE * ramp;
  const lux = BOSS_CHEST_LUXURY_SCALE * ramp;
  return {
    ultra: w.ultra,
    legend: w.legend,
    immortal: w.immortal,
    arcana: w.arcana * s,
    beyond: w.beyond * lux,
    century: w.century * lux,
    cosmic: w.cosmic * lux,
  };
}

export function rollBossChestItem(stage, rng = Math.random, preferredRoles = null) {
  // ボス箱はレア度が+40相当で上振れ。装備レベルは想定キャラレベル(2026-07-13)。
  // 部位は"boss"バイアス: サブ武器/アクセが出やすい(通常箱では絞るぶんの主な入手源)
  return rollItemOfRarity(
    weightedPick(bossChestWeights(stage), rng),
    rng,
    expectedLevelForStage(stage),
    "boss",
    preferredRoles,
  );
}

// 部位とレア度からオプション一式をロールする。
// 構造: opts[0] = 部位の基礎ステ(base:true)、opts[1..] = 特性(レア度で行数が増える)
export function rollOptsForPart(part, rarity, rng = Math.random, lv = 1, charmKind = null, role = null) {
  const mult = VALUE_MULT[rarity] * equipLevelMult(lv); // レア度倍率 × 装備レベル倍率
  const lvm = equipLevelMult(lv);
  // 基礎ステ: 部位で固定(武器=攻撃 / 鎧=防御 / 兜=HP / 靴=速度)。
  // アクセはプールからランダム(2026-07-13)。サブ武器はロール特化(2026-07-13 FB:
  // アックス=会心威力/シールド=防御/オーブ=スキル威力/アロー=攻撃速度)。
  // 「同レアなら高Lvが必ず強い」ため、基礎ステはランダム幅を撤廃し中央値で決定的にする。
  const subPool = part === "sub" ? ROLE_SUB_POOL[role] : null;
  // アクセ基本ステ: 卵/宝箱ドロップ率はレア枠(アルカナ以上のみ・当選weight半分 2026-07-13 FB)
  const pickCharmBase = () => {
    const RARE_BASES = ["dropBonus", "chestBonus"];
    const rareOk = RARITY_ORDER.indexOf(rarity) >= RARITY_ORDER.indexOf("arcana");
    const entries = [];
    for (const d of CHARM_BASE_POOL) {
      const isRare = RARE_BASES.includes(d.stat);
      if (isRare && !rareOk) continue;
      entries.push(d);
      if (!isRare) entries.push(d); // 通常ステはweight2、レアステはweight1
    }
    return entries[Math.floor(rng() * entries.length)];
  };
  const baseDef =
    part === "charm"
      ? pickCharmBase()
      : (subPool && subPool[Math.floor(rng() * subPool.length)]) ||
        BASE_STAT_BY_PART[part] ||
        BASE_STAT_BY_PART.weapon;
  void charmKind; // 種別は名前/アイコン用(基礎ステはランダム化により未使用)
  const baseMid = (baseDef.range[0] + baseDef.range[1]) / 2;
  // 基礎ステ: 固定値ステ(atkFlat/hpFlat)は flatStatValue、%ステは従来どおり。
  const baseValue = STAT_META[baseDef.stat].flat
    ? flatStatValue(baseDef.stat, baseMid, rarity, lv)
    : round3(baseMid * mult);
  const opts = [{ stat: baseDef.stat, value: baseValue, base: true }];

  // 1つの特性の値(固定値ステと%ステを共通に扱う)
  const rollTrait = (stat) => {
    const [lo, hi] = STAT_META[stat].base;
    if (STAT_META[stat].flat) return flatStatValue(stat, uniform(lo, hi, rng), rarity, lv);
    return round3(uniform(lo, hi, rng) * mult);
  };

  // 特性(基礎と重複しない・行数はレア度で増える)。
  // ジョブ専用装備(武器/サブ武器)は70%をロール特化プールから引く(2026-07-13 FB)
  const rolePool =
    role && (part === "weapon" || part === "sub") ? (ROLE_TRAIT_POOL[role] ?? null) : null;
  const pool = NORMAL_POOL.filter((s) => s !== baseDef.stat);
  let traits = LINES[rarity];
  // 上位レア度は固有特性(速度/スキル威力)が1枠確定(基礎ステと重複しない)
  if (UNIQUE_TIERS.has(rarity) && traits > 0) {
    const uniqPool = UNIQUE_POOL.filter((s) => s !== baseDef.stat);
    const stat = uniqPool[Math.floor(rng() * uniqPool.length)];
    const [lo, hi] = STAT_META[stat].base;
    opts.push({ stat, value: round3(uniform(lo, hi, rng) * lvm) });
    traits -= 1;
  }
  for (let i = 0; i < traits && pool.length > 0; i++) {
    // ロール特化プールが使えるときは70%でそちらから(未使用のものに限る)
    let stat = null;
    if (rolePool && rng() < 0.7) {
      const cands = rolePool.filter((st) => pool.includes(st));
      if (cands.length > 0) stat = cands[Math.floor(rng() * cands.length)];
    }
    if (!stat) stat = pool[Math.floor(rng() * pool.length)];
    pool.splice(pool.indexOf(stat), 1);
    opts.push({ stat, value: rollTrait(stat) });
  }
  return opts;
}

// レア度を指定して装備1個をロールする(合成の産物などに使う)。部位はランダム。
// lv = 装備レベル(ドロップ実効ステージ/合成時は素材の帯を引き継ぐ)。
// そのレベル帯で「使える見込みのある部位」だけドロップさせる(item17)。
// 序盤に かぶと/くつ/盾/おまもり など枠未解放の装備が出て腐るのを防ぐ。
// 解放レベルの少し手前(-5)から出始める。
export function partPoolForLevel(lv) {
  const pool = PART_ORDER.filter((p) => lv >= PART_UNLOCK[p] - 5);
  return pool.length ? pool : ["weapon", "armor"];
}

// 2026-07-09「低レベル帯でも剣・鎧以外も出す。ただし解放されている装備欄のものを多め」に。
// 全部位が出うるが、そのレベルで解放済み(手前含む)の部位を UNLOCKED_W、未解放を LOCKED_W の
// 重みにして、解放スロットのドロップを厚くする。
const UNLOCKED_PART_W = 1.0;
const LOCKED_PART_W = 0.18;
// サブ武器/アクセの部位バイアス(2026-07-13 FB「ジョブが4つだと欲しいキャラの装備が
// 落ちない → TBHと同じようにサブ武器とアクセは出にくいように」)。
// 2026-07-13 FB追記「サブとアクセの排出率をもっと少なく。アクセはボス箱限定に。
// メイン武器の排出率を上げて」:
// 通常箱: 武器×2.2 / サブ×0.12 / アクセ0(=ボス箱限定)。
// ボス箱: サブ×2・アクセ×2.5(唯一の入手源なので厚く)。合成/ガチャ/変換は等配分。
const PART_MODE_MULT = Object.freeze({
  normal: { weapon: 2.2, sub: 0.12, charm: 0 },
  boss: {}, // 2026-07-13 FB「ボス箱からのサブとアクセの排出量はあげなくていい×1」
  // 合成のレーン(2026-07-15 FB): アクセ合成からはアクセだけ、装備合成からはアクセ以外だけ。
  // 重み0の部位は weightedPick で絶対に選ばれないので、レーンをまたぐ結果が出ない。
  craftCharm: { weapon: 0, sub: 0, armor: 0, helm: 0, boots: 0 }, // = charm のみ
  craftGear: { charm: 0 }, // = アクセ以外
});
// 合成レーンごとの「結果に許される部位」。ユニーク装備の抽選にも同じ制約をかける。
const CRAFT_LANE_PART_OK = Object.freeze({
  craftCharm: (part) => part === "charm",
  craftGear: (part) => part !== "charm",
});
export function partWeightsForLevel(lv, mode = "craft") {
  const biases = PART_MODE_MULT[mode] ?? {};
  const w = {};
  for (const p of PART_ORDER) {
    w[p] = (lv >= PART_UNLOCK[p] - 5 ? UNLOCKED_PART_W : LOCKED_PART_W) * (biases[p] ?? 1);
  }
  return w;
}

// ---- 固有(ユニーク)装備 ----
// content-pack.js の EXTRA_EQUIPMENT に登録された「名前付き装備」。同レア帯の通常ドロップを
// 稀にこの名前付き装備へ置換する(ドロップ総数・レア度分布は変えない=同レアの当たり枠)。
// affixes は全て最高品質でロールされる(当たり確定)ので、その部位のベストインスロット候補。
// 値は通常装備と同じ式(レア度倍率×装備Lv倍率)でスケールするのでバランスは崩れない。
// ユニークが存在するレア度が出たとき、これで名前付きになる。
// 2026-07-15 FB「ユニークやビヨンド以上のアイテムの排出量が多すぎる。1か月やって1個
// 出るくらいのドロップ率に」: 0.06 では実効400で月42個も出ていた(レジェンド/イモータルは
// 通常箱の主力なので、そこに6%も乗ると大量に湧く)。月1個になる値へ2桁絞る。
// 2026-08-11 Haru指示「ユニークの排出量は2か月に1個に減らして」: 装備Lvティア帯
// ユニーク33件(アルカナ以上)を追加した後もレジェンド/イモータルの主力2件のぶんで
// 月0.85個(ほぼ変わらず)だったため、狙う0.5個/月(=2か月に1個)へさらに絞る
export const UNIQUE_DROP_CHANCE = 0.00082;

// ---- Steamマーケットへの出品ゲート(2026-07-15) ----
// 競合TBHは2026-06-08にSteamマーケットを緊急停止した。直接原因はBotが毎秒数千の
// 売買リクエストを叩いてSteam側を焼いたことだが、その土壌は「安い装備が無尽蔵に
// 売れたこと」にある(相場は高レア一式$2〜3まで崩壊した)。
//
// 実測: うちは1人あたり月8,690個の装備が手に入り、うち コモン/レア/ウルトラ が
// 7,956個 = 全体の92%。ここがBotの燃料そのもの。これを出品不可にするだけで
// Botの採算が消え、同時に相場の底抜けも防げる。
//   コモン 2,153 / レア 4,372 / ウルトラ 1,431  → 出品不可(Botの燃料)
//   レジェンド 512 / イモータル 187 / アルカナ 34 / ビヨンド 0.7 / センチュリー以上 0.3
//     → 出品可(合計734個/月 = 24個/日)
//
// 上限は設けない(TBHは最上位3段を出品不可にしたが、あれは危機対応の暫定措置)。
// センチュリー以上は月0.3個しか出ずBot・インフラのリスクがゼロで、かつ
// 「引いた1点ものが本物の資産になる」= 刻印(mintNo)を含むこのゲームの売りそのもの。
export const MARKET_MIN_RARITY = "legend";
export function marketMinRarityIndex() {
  return RARITY_ORDER.indexOf(MARKET_MIN_RARITY);
}
// その装備をSteamマーケットに出品できるか。理由つきで返す(UIがそのまま表示できる)。
export function marketListable(item) {
  if (!item) return { ok: false, reason: "その装備がない" };
  if (item.locked) return { ok: false, reason: "🔒 ロック中の装備は出品できない" };
  // 試用期間中のコンテンツは出品不可(2026-07-22 試用システム)。
  // 不採用で消え得るものが市場でお金に変わると削除不能になるため、採用確定まで封鎖
  const trialBlock = trialListBlockReason(item.trialId);
  if (trialBlock) return { ok: false, reason: trialBlock };
  const idx = RARITY_ORDER.indexOf(item.rarity);
  if (idx < marketMinRarityIndex()) {
    return {
      ok: false,
      reason: `${RARITY_LABEL_JA[item.rarity] ?? item.rarity}は出品できない(${RARITY_LABEL_JA[MARKET_MIN_RARITY]}以上のみ)`,
    };
  }
  return { ok: true };
}
// エラー文言用の和名(RARITY_META は data.js 側でUI寄りなので、ここでは最小限を持つ)
const RARITY_LABEL_JA = Object.freeze({
  common: "コモン", rare: "レア", ultra: "ウルトラ", legend: "レジェンド",
  immortal: "イモータル", arcana: "アルカナ", beyond: "ビヨンド",
  century: "センチュリー", cosmic: "コズミック", celestial: "セレスティアル",
});

const uniquesByRarity = (() => {
  const map = {};
  for (const bp of EXTRA_EQUIPMENT ?? []) {
    (map[bp.rarity] ??= []).push(bp);
  }
  return map;
})();

// ステ1つを最高品質でロールした値(rollOptsForPart のロジックと同じスケール)。
function bestStatValue(stat, rarity, lv) {
  const meta = STAT_META[stat];
  const hi = meta.base[1];
  if (meta.flat) return flatStatValue(stat, hi, rarity, lv);
  if (meta.unique) return round3(hi * equipLevelMult(lv)); // 固有枠は装備Lv倍率のみ
  return round3(hi * VALUE_MULT[rarity] * equipLevelMult(lv));
}

// 設計図から実アイテムを組み立てる(部位の基礎ステ + 指定アフィックスを全て最高品質で)。
export function buildUniqueItem(bp, lv = 1, _rng = Math.random) {
  const part = bp.part;
  const baseDef = BASE_STAT_BY_PART[part] ?? BASE_STAT_BY_PART.weapon;
  const baseMid = (baseDef.range[0] + baseDef.range[1]) / 2;
  const baseValue = STAT_META[baseDef.stat].flat
    ? flatStatValue(baseDef.stat, baseMid, bp.rarity, lv)
    : round3(baseMid * VALUE_MULT[bp.rarity] * equipLevelMult(lv));
  const opts = [{ stat: baseDef.stat, value: baseValue, base: true }];
  const seen = new Set([baseDef.stat]);
  for (const stat of bp.affixes ?? []) {
    if (!STAT_META[stat] || seen.has(stat)) continue; // 未知/基礎ステと重複は飛ばす
    seen.add(stat);
    opts.push({ stat, value: bestStatValue(stat, bp.rarity, lv) });
  }
  // 共通装備は廃止(2026-07-13 FB): ユニークの武器/サブ武器も設計図IDから決定的にロールを持つ
  let hsh = 2166136261;
  for (let i = 0; i < bp.id.length; i++) {
    hsh ^= bp.id.charCodeAt(i);
    hsh = Math.imul(hsh, 16777619);
  }
  let uniqRole = bp.role ?? null;
  if (!uniqRole && (part === "weapon" || part === "sub")) {
    uniqRole = ROLE_WEAPON_ORDER[Math.abs(hsh) % ROLE_WEAPON_ORDER.length];
  }
  // ユニーク限定ステを1行(2026-07-13 FB)。ステと値は設計図IDから決定的=個体差なし
  {
    const exStat = UNIQUE_EXCLUSIVE_STATS[Math.abs(hsh >> 3) % UNIQUE_EXCLUSIVE_STATS.length];
    if (!seen.has(exStat)) {
      const [lo, hi] = STAT_META[exStat].base;
      const frac = (Math.abs(hsh >> 7) % 1000) / 1000;
      opts.push({ stat: exStat, value: round3(lo + (hi - lo) * frac), exclusive: true });
    }
  }
  return {
    id: `uniq_${bp.id}_${Date.now()}_${nextItemId++}`,
    uniqueId: bp.id,
    rarity: bp.rarity,
    part,
    role: uniqRole,
    lv: equipLvTier(lv),
    name: bp.name,
    opts,
    legendary: bp.legendary ?? null,
    season: bp.season ?? null, // 限定シーズン品の印(相場に効く)
    // 戦闘力に直結しない見た目だけの特殊オプション(2026-08-11 Haru指示)。
    // shiny/auraTier等。itemScoreの計算には一切含めない(stat行ではないため)
    special: bp.special ?? null,
    obtainedAt: Date.now(),
  };
}

// 覚醒Ⅵの子を「武具に宿す」ときの確定鍛造(2026-07-16)。
// rollUnique と違いドロップ率のゲートを通らない=必ずユニークを1つ組み立てる。
// そのレア度にユニークが1つも無ければ null(呼び出し側が通常品+魂でフォールバック)。
// ここが「56日かけた覚醒Ⅵが世界に1つの刻印つき武具になる」の入口なので、
// 通常ドロップの希少性(UNIQUE_DROP_CHANCE=0.0014)を絶対にバイパスさせない
// (この関数を宿し以外から呼ばないこと)。
export function forgeUniqueOfRarity(rarity, lv = 1, rng = Math.random) {
  const pool = uniquesByRarity[rarity];
  if (!pool || pool.length === 0) return null;
  const bp = pool[Math.floor(rng() * pool.length) % pool.length];
  return buildUniqueItem(bp, lv, rng);
}

// そのレア度にユニークがあり、抽選に当たれば1つ組み立てて返す。無ければ null。
// partOk を渡すと、その部位条件を満たすユニークだけが候補になる(合成のレーン用)。
export function rollUnique(rarity, lv = 1, rng = Math.random, partOk = null) {
  const all = uniquesByRarity[rarity];
  const pool = partOk ? (all ?? []).filter((bp) => partOk(bp.part)) : all;
  if (!pool || pool.length === 0) return null;
  if (rng() >= UNIQUE_DROP_CHANCE) return null;
  const bp = pool[Math.floor(rng() * pool.length) % pool.length];
  return buildUniqueItem(bp, lv, rng);
}

// 加護中の宝箱で、武器/サブ武器のロール抽選を手持ちキャラのジョブへ寄せる確率
// (2026-08-10 FB「加護中は自分の持ちキャラのジョブに関する装備が出やすいように」)
export const BLESSED_ROLE_BIAS = 0.7;

export function rollItemOfRarity(rarity, rng = Math.random, lv = 1, partMode = "craft", preferredRoles = null) {
  // 合成レーン指定時は、レーン外の部位のユニークを候補から外す(アクセ合成から
  // ユニークの武器が出てしまうとレーン分離が破れるため)
  const uniq = rollUnique(rarity, lv, rng, CRAFT_LANE_PART_OK[partMode] ?? null); // ユニークが無いレア度では rng を消費しない
  if (uniq) return uniq;
  const part = weightedPick(partWeightsForLevel(lv, partMode), rng);
  // アクセは種別(指輪/イヤリング/ネックレス)を抽選。種別でメイン性能と名前が決まる
  const charmKind = part === "charm" ? CHARM_KIND_ORDER[Math.floor(rng() * CHARM_KIND_ORDER.length)] : null;
  // 武器・サブ武器はジョブ固有(2026-07-12 FB): ロールを抽選し名前も専用武器名に。
  // preferredRolesがあれば(加護中)高確率でそちらへ寄せる
  const useBias = preferredRoles?.length && rng() < BLESSED_ROLE_BIAS;
  const rolePool = useBias ? preferredRoles : ROLE_WEAPON_ORDER;
  const role =
    part === "weapon" || part === "sub" ? rolePool[Math.floor(rng() * rolePool.length)] : null;
  const tierLv = equipLvTier(lv);
  return {
    id: `item_${Date.now()}_${nextItemId++}`,
    rarity,
    part,
    charmKind,
    role,
    lv: tierLv,
    name: `${PREFIX[rarity]}${itemBaseName(part, charmKind, role)}`,
    opts: rollOptsForPart(part, rarity, rng, tierLv, charmKind, role),
    obtainedAt: Date.now(),
  };
}

// 部位+種別+ロールから武具名の土台を返す
export function itemBaseName(part, charmKind = null, role = null) {
  if (charmKind && CHARM_KINDS[charmKind]) return CHARM_KINDS[charmKind].base;
  if (role && ROLE_WEAPONS[role] && (part === "weapon" || part === "sub")) return ROLE_WEAPONS[role][part];
  return PARTS[part].base;
}

function round3(v) {
  return Math.round(v * 1000) / 1000;
}

// 売値(GP)。レア度でざっくり決まる。
export function itemSellPrice(item) {
  return (
    {
      common: 25, rare: 120, ultra: 400, legend: 1200, immortal: 4000,
      arcana: 12000, beyond: 40000, century: 120000, cosmic: 400000, celestial: 1300000,
    }[item.rarity] ?? 0
  );
}

// 打ち直し(厳選): レア度はそのままオプションを引き直すときのコスト(GP)。
export function rerollCost(item) {
  return itemSellPrice(item) * 3;
}

// オプションを引き直す(id・レア度・部位・入手日時は保持)。
// 基礎ステも同じ部位の範囲で振り直す(部位と基礎ステの対応は崩れない)
export function rerollOpts(item, rng = Math.random) {
  item.part = item.part ?? inferPart(item);
  item.opts = rollOptsForPart(item.part, item.rarity, rng, item.lv ?? 1, item.charmKind ?? null, item.role ?? null);
  item.name = `${PREFIX[item.rarity]}${itemBaseName(item.part, item.charmKind ?? null, item.role ?? null)}`;
  return item;
}

// ---- 細工(2026-07-19 バッチ2 → 同日v3: 全ゴールド抽選のスロット制) ----
// TBH方式+ユーザー指示(2026-07-19深夜)「素材制度やめる。全部位に装飾/彫刻/碑文
// スロット。全てゴールドで抽選、完全ランダム。スキルや属性攻撃/属性防御も出る。
// 戦闘力に直結するものは確率を思いっきり下げて(アルカナ以上級)。イモータル以上のみ。
// レア度が上がるほどスロット数が増える。1回の抽選を思いっきり高くしてゴールドシンクに」
//
// 設計(2026-07-21 v5で部位別プールに再設計):
//   ・付くオプションの種類は部位カテゴリで決まる: (武器/サブ)=攻撃系 /
//     (鎧/兜/靴)=防御系 / (アクセ)=周回系(enhancePartCat / ENHANCE_PART_POOLS)
//   ・スロット種(装飾/碑文/彫刻)は値の倍率: 装飾×1 < 碑文×1.35 < 彫刻×1.75
//     (金額12M/20M/30M比例)。穴は装飾→碑文→彫刻の循環でレア度とともに増える
//   ・抽選は1回 ENHANCE_ROLL_COSTS[kind] ゴールド。結果はそのスロットを上書き
//   ・出目には等級がある: 基本→上級→属性→特級(≈0.4%)→スキル(≈0.1%)
//     属性以上が「戦闘力・攻略に直結する枠」= アルカナ級のレア体験
//   ・スキル付与は彫刻限定+最弱級/上限つきスキル限定(回復/バリアはサステイン
//     上限ガードの対象なので積んでも無敵にならない)。ガードは test/enhance.test.mjs
export const ENHANCE_MIN_RARITY = "legend"; // 2026-07-20 FB「レジェンド2つ枠からスタート」

export const ENHANCE_KINDS = Object.freeze({
  carve: { label: "彫刻", icon: "⚔" },
  inscribe: { label: "碑文", icon: "📜" },
  adorn: { label: "装飾", icon: "💠" },
});

// 1回の抽選のゴールド代。ヘルの撃破報酬(≈4000G/6秒・実効12h/日≈36M/日)基準で
// 「1日に1〜2回、トーメント帯で数回」の重い買い物=ここが恒久ゴールドシンクの本体。
// 2026-07-21 FB「彫刻/碑文/装飾で金額を変えて、効果も金額に応じて上げる」:
// 彫刻(攻撃系)=最高額・碑文(防御系)=中間・装飾(周回系)=最安。プールのレンジも
// この額に比例して値の倍率も上がる(ENHANCE_KIND_MULT)
export const ENHANCE_ROLL_COSTS = Object.freeze({
  carve: 30_000_000,
  inscribe: 20_000_000,
  adorn: 12_000_000,
});
export const ENHANCE_ROLL_COST = ENHANCE_ROLL_COSTS.inscribe; // 互換(代表値=中間)

// レア度ごとのスロット構成。レジェンド未満は細工不可。
// 2026-07-20 FB「レジェンド2つ枠からスタート」: 2個→レア度ごとに+1(セレスティアル8個)
// 2026-07-21 FB「装飾からレアリティが増えるごとに穴が増えていく。最後彫刻」:
// 穴は 装飾→碑文→彫刻 の循環で開く(安い種別から開き、最高級の彫刻が締める)
const ENHANCE_SLOT_LADDER = Object.freeze({
  legend: ["adorn", "inscribe"],
  immortal: ["adorn", "inscribe", "carve"],
  arcana: ["adorn", "inscribe", "carve", "adorn"],
  beyond: ["adorn", "inscribe", "carve", "adorn", "inscribe"],
  century: ["adorn", "inscribe", "carve", "adorn", "inscribe", "carve"],
  cosmic: ["adorn", "inscribe", "carve", "adorn", "inscribe", "carve", "adorn"],
  celestial: ["adorn", "inscribe", "carve", "adorn", "inscribe", "carve", "adorn", "inscribe"],
});
export function enhanceSlotsOf(item) {
  return ENHANCE_SLOT_LADDER[item?.rarity] ?? [];
}
// 表示用: 同じ種別ごとにまとめた添字順(装飾グループ→碑文→彫刻が最後)。
// スロットの実体(item.enhances の添字)はラダー順のまま、見た目だけこの順で並べる
// 表示順は「料金の安い順」= 装飾(12M) → 碑文(20M) → 彫刻(30M)。
// アイコン上のマテリアは左下ぞろえで**下から**この順に積む(2026-07-22 FB)ので、
// CSS側で column-reverse にして下端が装飾になるようにしている
export const ENHANCE_KIND_ORDER = Object.freeze(["adorn", "inscribe", "carve"]);
export function enhanceSlotDisplayOrder(slots) {
  const rank = Object.fromEntries(ENHANCE_KIND_ORDER.map((k, i) => [k, i]));
  return slots.map((_, i) => i).sort((a, b) => (rank[slots[a]] ?? 9) - (rank[slots[b]] ?? 9) || a - b);
}

// 出目の等級(確率開示にも使う)。weightはプール内の重み
export const ENHANCE_GRADES = Object.freeze({
  basic: { label: "基本", color: "#cdd8ef" },
  advanced: { label: "上級", color: "#8ad8ff" },
  element: { label: "属性", color: "#c88aff" },
  mythic: { label: "特級", color: "#ffd67a" },
  skill: { label: "スキル", color: "#8af0c0" },
});

// 抽選プール(完全ランダム)。2026-07-21 FB「オプションは(武器・サブ武器)/(防具)/
// (アクセ)で付く種類が変わるように。装備と相性がよさそうなオプションが付くように」:
// プールは「スロット種」ではなく「部位カテゴリ」で決まる —
//   攻撃系(武器/サブ武器)=攻撃力/会心/属性攻撃/スキル威力/ボス特効/吸収
//   防御系(鎧/兜/靴)=HP/防御/属性防御
//   周回系(アクセ)=ゴールド/経験値/宝箱/CD短縮/卵ドロップ
// スロット種(装飾/碑文/彫刻)は「仕上がりの豪華さ」= 値の倍率(ENHANCE_KIND_MULT)。
// 同FB「装飾<碑文<彫刻の順番でオプション数値が高くなるように」金額(12M/20M/30M)比例。
// スキル付与行は最高級の彫刻でしか出ない(安い装飾でスキル釣りできない)
// 付与率は希少方針(特級≈0.4%/スキル≈0.1%)のまま。値の暴走は既存ガードが受ける:
// 吸収25%上限/軽減60%上限/属性防御30%上限/会心率50%/CDR50%(equipStat経由)
export function enhancePartCat(part) {
  if (part === "weapon" || part === "sub") return "offense";
  if (part === "charm") return "utility";
  return "defense"; // armor / helm / boots
}
export const ENHANCE_PART_CAT_LABEL = Object.freeze({
  offense: "攻撃系", defense: "防御系", utility: "周回系",
});
export const ENHANCE_PART_POOLS = Object.freeze({
  offense: [
    { grade: "basic", weight: 40, stat: "atkPct", range: [0.02, 0.06] },
    { grade: "basic", weight: 20, stat: "critDmg", range: [0.04, 0.11] },
    { grade: "element", weight: 40, stat: "elemAtk", range: [0.04, 0.11] },
    { grade: "advanced", weight: 9, stat: "critRate", range: [0.01, 0.03] },
    { grade: "advanced", weight: 4, stat: "atkSpeed", range: [0.015, 0.045] },
    { grade: "mythic", weight: 0.2, stat: "skillPower", range: [0.04, 0.1] },
    { grade: "mythic", weight: 0.15, stat: "bossDmg", range: [0.05, 0.11] },
    { grade: "mythic", weight: 0.05, stat: "lifesteal", range: [0.01, 0.028] },
    { grade: "skill", weight: 0.1, skill: "fang" },
    // 細工限定の激レア(2026-07-21 FB): 通常スキル行のさらに1/5の超激レア
    { grade: "skill", weight: 0.02, skill: "dragonraid" },
  ],
  defense: [
    { grade: "basic", weight: 40, stat: "hpPct", range: [0.025, 0.075] },
    { grade: "basic", weight: 20, stat: "defPct", range: [0.004, 0.015] },
    { grade: "element", weight: 40, stat: "elemDef", range: [0.04, 0.1] },
    { grade: "advanced", weight: 13, stat: "hpPct", range: [0.055, 0.11] },
    { grade: "mythic", weight: 0.4, stat: "defPct", range: [0.015, 0.033] },
    // 「魂の器」= HP盛り×HP比サステインのビルドを開く鍵(2026-07-21 FB「抜け道は
    // 戦略として残したい。ただし運よくかみ合った時だけ」)。防御系プール限定・特級。
    // 出現率≈0.44%/回(=約228回に1回)。これ+シールドスキル+HP盛りの3点が
    // そろって初めて成立する。weightがこのビルドの難易度ノブ(番人ガードとセット)
    { grade: "mythic", weight: 0.5, stat: "soulVessel", range: [0.15, 0.3] },
    { grade: "skill", weight: 0.1, skill: "hardshell" },
    { grade: "skill", weight: 0.02, skill: "adamantwall" },
  ],
  utility: [
    { grade: "basic", weight: 45, stat: "goldBonus", range: [0.03, 0.08] },
    { grade: "basic", weight: 30, stat: "expBonus", range: [0.03, 0.08] },
    { grade: "advanced", weight: 14, stat: "chestBonus", range: [0.03, 0.08] },
    { grade: "advanced", weight: 8, stat: "cdr", range: [0.008, 0.022] },
    // 卵ドロップはレアステータス方針(2026-07-13)のまま特級扱いで希少
    { grade: "mythic", weight: 0.4, stat: "dropBonus", range: [0.003, 0.009] },
    { grade: "mythic", weight: 0.4, stat: "atkSpeed", range: [0.012, 0.028] },
    { grade: "skill", weight: 0.1, skill: "aquaveil" },
    { grade: "skill", weight: 0.02, skill: "goldenstorm" },
  ],
});
// 種別の値倍率(2026-07-21 FB「装飾<碑文<彫刻の順番でオプション数値が高くなる」)。
// 金額 12M/20M/30M(ENHANCE_ROLL_COSTS)に比例した傾斜
export const ENHANCE_KIND_MULT = Object.freeze({ adorn: 1, inscribe: 1.35, carve: 1.75 });

// ロール品質ティア(2026-07-21 FB「基礎オプションでもレアリティ高く出ることがあって
// その場合は数値が高くなる」): どの等級のステ行にも品質が付き、値に倍率が乗る。
// スキル行には付かない。確率・倍率は確率開示の対象(UIのnoteに実値で出す)
// 2026-07-21 FB「率は上げなくていい、数値を上げて」: 重みはz63の希少配分に戻す
// (体感の主役はレンジ×2.5の引き上げ側)
export const ENHANCE_TIERS = Object.freeze({
  normal: { label: "", mult: 1, weight: 75 },
  fine: { label: "上質", mult: 1.3, weight: 20, color: "#8ad8ff" },
  master: { label: "傑作", mult: 1.6, weight: 4.2, color: "#ffd67a" },
  god: { label: "極", mult: 2.0, weight: 0.8, color: "#ff8ad8" },
});

// (kind, 部位カテゴリ)の実効プール。スキル行は彫刻限定(2026-07-21 FB設計:
// 彫刻=最高級の締め枠。安い装飾/碑文でスキルを釣れると金額傾斜が壊れる)
export function enhancePoolFor(kindKey, cat = "offense") {
  const pool = ENHANCE_PART_POOLS[cat] ?? ENHANCE_PART_POOLS.offense;
  return kindKey === "carve" ? pool : pool.filter((e) => !e.skill);
}

// 1スロットぶんを抽選する(完全ランダム)。スキルの出目は {skill} 行になる。
// 値 = 素のレンジ × 種別倍率(装飾1/碑文1.35/彫刻1.75) × 品質ティア(〜2.0)
export function rollEnhanceLine(kindKey, cat = "offense", rng = Math.random) {
  const pool = enhancePoolFor(kindKey, cat);
  // weightedPick は {key: weight} からキーを返す形式なので、プールの添字をキーにする
  const entry = pool[Number(weightedPick(Object.fromEntries(pool.map((e, i) => [i, e.weight])), rng))];
  if (entry.skill) return { kind: kindKey, grade: "skill", skill: entry.skill };
  const [lo, hi] = entry.range;
  const base = (lo + (hi - lo) * rng()) * (ENHANCE_KIND_MULT[kindKey] ?? 1);
  const tier = weightedPick(
    Object.fromEntries(Object.entries(ENHANCE_TIERS).map(([k, t]) => [k, t.weight])), rng);
  const value = base * (ENHANCE_TIERS[tier]?.mult ?? 1);
  return { kind: kindKey, grade: entry.grade, stat: entry.stat, tier, value: Math.round(value * 10000) / 10000 };
}

// 等級ごとの合計出現率(%)。UIの確率開示に使う(コードの実値から動的生成)
export function enhanceGradeRates(kindKey, cat = "offense") {
  const pool = enhancePoolFor(kindKey, cat);
  const total = pool.reduce((s, e) => s + e.weight, 0);
  const by = {};
  for (const e of pool) by[e.grade] = (by[e.grade] ?? 0) + e.weight;
  return Object.fromEntries(Object.entries(by).map(([g, w]) => [g, (w / total) * 100]));
}

// モンスターの装備から特定ステータスの合計値を返す。
// 細工由来ステータスの合算上限(2026-07-21 FB「HP%がいくつも掛け合わさって、
// HP比のシールド持ちだとシールド量がえげつなくてほぼ無敵になる」):
// 回復/バリアの上限(HEAL 3.5%+SHIELD 1.25%/秒)は「自分の最大HPの%」基準なので、
// HPをn倍に盛ると被ダメの%換算が1/nになり、サステインが実被ダメを追い越して
// 恒久無敵になる(敵の攻撃は絶対値のため)。細工のHPアップは合計+100%で頭打ちにし、
// 番人の「HP盛りタンク」ガード(tools/balance-model.js)がこの上限値でも無敵ラインを
// 越えないことを毎コミット検査する。上限を上げたくなったらガードとセットで
export const ENHANCE_STAT_CAPS = Object.freeze({ hpPct: 1.0, soulVessel: 0.4 });

// 「魂の器」の合算上限(2026-07-21 FB「抜け道は残したいが、運よくオプションが
// かみ合った時だけ成立するように」)。細工HPのうち最大この割合までサステインの
// 基準HPに算入される(=「非常に硬い」で終わり、数学的な恒久無敵にはならない)。
// この値と soulVessel の出現率は難易度番人のガードとセットで動かすこと
// 0.4 = サステイン絶対量は最大でも素の1.4倍(番人の無敵ガードが通る最大値。
// 0.5にすると実効400で「弱パーティ+器」が無敵ラインに触れる — 実測で確認済み)
export const SUSTAIN_VESSEL_CAP = ENHANCE_STAT_CAPS.soulVessel;

// enhances=false で「細工行を除いた」合算(サステイン基準HPの算出用)
export function equipStat(monster, stat, { enhances = true } = {}) {
  const items = monster.equipment ?? [];
  // 2026-08-07: item.opts が無い壊れた装備エントリ(旧セーブの移行漏れ等)が1件でも
  // 混じると、ここが例外を投げてpowerScore()経由でrenderHud()が丸ごと落ちる。
  // renderHud()はミッション受け取りボタンのクリックハンドラの最後でsave()の直前に
  // 呼ばれるため、例外が起きるとsave()まで届かず「受け取ったのに進んだように見えない
  // (再読み込みで元に戻る)」という形で症状が出る。壊れた1件のせいで全体が壊れない
  // よう、opts配列が無い/壊れている装備は0点として無視する
  const opts = items.reduce(
    (sum, item) => sum + (item?.opts ?? []).reduce((s, o) => s + (o.stat === stat ? o.value : 0), 0),
    0,
  );
  if (!enhances) return opts;
  // 細工スロット(2026-07-19 v3)の強化行(スキル行はequippedSkillsOf側で拾う)。
  // 出目の等級とレンジで戦闘系の上振れを絞る(POWER_REGISTRY.enhance参照)
  let enh = items.reduce(
    (sum, item) => sum + (item.enhances ?? []).reduce((s, e) => s + (e?.stat === stat ? e.value : 0), 0),
    0,
  );
  const cap = ENHANCE_STAT_CAPS[stat];
  if (cap != null) enh = Math.min(cap, enh);
  return opts + enh;
}

// オプション1行の表示テキスト。固定値ステは「+N」、%ステは「+N%」。
export function describeOpt(opt) {
  const meta = STAT_META[opt.stat];
  if (meta.flat) return `${meta.label} +${Math.round(opt.value)}`;
  return `${meta.label} +${Math.round(opt.value * 1000) / 10}%`;
}

// オプションのロール品質(0=そのレア度の最低値, 1=最大値)。厳選の当たり外れを可視化する。
export function optQuality(item, opt) {
  const meta = STAT_META[opt.stat];
  if (!meta) return 0;
  // 基礎ステは部位固有のロール範囲を使う
  const range = opt.base ? (BASE_STAT_BY_PART[item.part]?.range ?? meta.base) : meta.base;
  if (meta.flat) {
    // 固定値ステ: 割合レンジの両端を実値に直して品質を測る
    const lo = flatStatValue(opt.stat, range[0], item.rarity, item.lv ?? 1);
    const hi = flatStatValue(opt.stat, range[1], item.rarity, item.lv ?? 1);
    if (hi <= lo) return 1;
    return Math.max(0, Math.min(1, (opt.value - lo) / (hi - lo)));
  }
  const mult = meta.unique && !opt.base ? 1 : VALUE_MULT[item.rarity] ?? 1;
  const lo = range[0] * mult;
  const hi = range[1] * mult;
  if (hi <= lo) return 1;
  return Math.max(0, Math.min(1, (opt.value - lo) / (hi - lo)));
}

// 回復・バリアの基準HPに使う hpPct(2026-07-21 FB)。
// 装備の素のHP%はそのまま乗り、細工由来のHP%は「魂の器」で解禁した割合だけ乗る。
//   器なし(既定) → 細工HPはサステインに一切乗らない = HPを盛るだけの無敵は不成立
//   器あり(激レア) → 細工HPの最大50%まで乗る = HP盛りビルドが「戦略」として成立
export function sustainBasisHpPct(monster) {
  const opts = equipStat(monster, "hpPct", { enhances: false });
  const enh = equipStat(monster, "hpPct") - opts; // 上限適用後の細工ぶん
  const credit = Math.min(SUSTAIN_VESSEL_CAP, equipStat(monster, "soulVessel"));
  return opts + enh * credit;
}

// 1オプションの「%換算」スコア寄与。固定値ステは基準ステに対する割合に直して
// %ステと同じ土俵で足せるようにする(ソート・相場の目安用)。
function optScorePct(item, opt) {
  const meta = STAT_META[opt.stat];
  if (meta?.flat) return opt.value / Math.max(1, equipRefStat(meta.flat, item.lv ?? 1));
  return opt.value;
}

// 装備スコア: 全オプションの合計%(相対的な強さの目安)。
export function itemScore(item) {
  return Math.round(item.opts.reduce((s, o) => s + optScorePct(item, o) * 100, 0) * 10) / 10;
}

// アイテム全体のロール品質(0..1)。各オプションのロール位置の平均。
export function itemQuality(item) {
  if (!item.opts?.length) return 0;
  return item.opts.reduce((s, o) => s + optQuality(item, o), 0) / item.opts.length;
}

// 若い刻印(mint No.)ほどプレミア。#1=+約74%、#10=+約44%、#100=+約9%と逓減。
export function mintPremium(mintNo) {
  if (typeof mintNo !== "number" || mintNo <= 0) return 1;
  return 1 + 0.8 / (1 + mintNo / 12);
}

// そうてい相場(将来のマーケット売買を見すえた査定額の表示用)。
// 店売り(itemSellPrice)を底値に、ロール品質が高いほど二乗で跳ねる:
// 相場 = 売値 × (3 + 9 × quality²) → なみロール3倍、完璧ロール12倍。
// さらに希少シグナルを掛ける: 固有(名前付き)×3・限定シーズン品×1.6・若い刻印ほどプレミア。
// 「同じレア度でも当たり/固有/限定/若い刻印は別物の値がつく」= 1点ものの資産価値を数字で見せる。
export function marketValueEstimate(item) {
  const q = itemQuality(item);
  let v = itemSellPrice(item) * (3 + 9 * q * q);
  if (item.uniqueId) v *= 3;
  if (item.season) v *= 1.6;
  // 魂が宿った武具(覚醒個体を宿した1点もの 2026-07-16): 覚醒段ごとに+15%、
  // 色違いの魂は+25%。覚醒Ⅵ=+90%(×1.9)が「56日の証」のプレミア
  if (item.soul) {
    v *= 1 + (item.soul.awakening ?? 0) * 0.15;
    if (item.soul.shiny) v *= 1.25;
  }
  v *= mintPremium(item.mintNo);
  return Math.round(v);
}
