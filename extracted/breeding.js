// 配合(交配)ロジック — ドラゴンクエストモンスターズ方式。
// 親2体の組み合わせから「生まれる種族」が決定的に決まり、基本は1段上のレア度へ進化する。
// DQMの興奮の核を移植(2026-07-07リワーク):
//   ・+値: 配合を重ねるほど子が強くなる世代の積み上げ(名前に「+n」が付く)
//   ・スキル継承: 両親が覚えたスキルを子が受け継ぐ(配合=ビルド構築)
//   ・特別レシピ網: レシピの子を親にする「レシピの連鎖」で最高峰へ登る道
// 親の消費やゴールドの支払いは state.js 側で行い、ここは純粋な計算に徹する。

import { RARITY_ORDER, SPECIES, skillStars } from "./data.js";

const RARITY_COST_MULT = {
  common: 1, rare: 2, ultra: 4, legend: 8, immortal: 16,
  arcana: 32, beyond: 64, century: 128, cosmic: 256, celestial: 512,
};

// 配合コスト(ゴールド)。親のレベルとレア度が高いほど高い。
// 基本係数90: ゴールドカーブに対して安すぎると配合が数分で回ってしまい、
// 厳選・収集の価値が薄れる(tools/balance-sim.jsの「配合(分)」で5〜30分を目安に調整)。
export function breedCost(a, b) {
  const rarityFactor =
    RARITY_COST_MULT[SPECIES[a.speciesId].rarity] +
    RARITY_COST_MULT[SPECIES[b.speciesId].rarity];
  return Math.round(90 * (a.level + b.level) * rarityFactor);
}

function rarityRank(monster) {
  return RARITY_ORDER.indexOf(SPECIES[monster.speciesId].rarity);
}

// ---- +値(プラス値): 配合世代の積み上げ ----
// 子の+値 = 両親の平均(切り捨て) + 1。DQMの「スライム+5」と同じ見せ方で、
// 名前の横に「+n」が付き、+1につき攻撃/HPが2%伸びる。
// 配合を重ねた血統ほど強い=「親を作るための配合」に意味が生まれる。
export const PLUS_CAP = 99;
export const PLUS_STAT_PER = 0.02; // +1あたりの攻撃/HP倍率
export function childPlus(a, b) {
  return Math.min(PLUS_CAP, Math.floor(((a.plus ?? 0) + (b.plus ?? 0)) / 2) + 1);
}

// +値によるステータス倍率(battle.jsのmonsterAtk/monsterMaxHpが使う)
export function plusMult(monster) {
  return 1 + PLUS_STAT_PER * (monster.plus ?? 0);
}

// ---- スキル継承: 両親から1つずつ、プレイヤーが選んで受け継ぐ(DQMの核) ----
// 自動でごっそり継承ではなく「親Aから何を・親Bから何を残すか」を選ぶのが配合の決断。
// 選択しなければ星の一番高いスキルが自動で選ばれる(1クリック配合も損しない)。

// 親1体ぶんの継承候補(覚えたスキルから、子が最初から持つ基本スキルを除く)
export function inheritChoices(parent, childSpeciesId) {
  const childBase = SPECIES[childSpeciesId].skillId;
  return [...new Set(parent.learnedSkills ?? [])].filter((id) => id !== childBase);
}

// 省略時の自動選択: 候補中で星が一番高いスキル(同星はID順で決定的)
export function defaultInheritPick(parent, childSpeciesId) {
  const choices = inheritChoices(parent, childSpeciesId);
  choices.sort((x, y) => skillStars(y) - skillStars(x) || (x < y ? -1 : 1));
  return choices[0] ?? null;
}

// 継承の確定(親A・親Bから各1つ)。picks=[親Aの選択, 親Bの選択](null=自動)。
// 候補にない指定は自動選択へフォールバック。両親が同じスキルなら1つにまとまる。
export function inheritSkills(a, b, childSpeciesId, picks = [null, null]) {
  const out = [];
  const pairs = [
    [a, picks?.[0] ?? null],
    [b, picks?.[1] ?? null],
  ];
  for (const [parent, pick] of pairs) {
    const choices = inheritChoices(parent, childSpeciesId);
    const id = pick && choices.includes(pick) ? pick : defaultInheritPick(parent, childSpeciesId);
    if (id && !out.includes(id)) out.push(id);
  }
  return out;
}

// ---- 特別レシピ(DQMの「隠し配合」) ----
// 特定の2種の組み合わせは、公式ルールより大きくジャンプした特別な種を生む。
// レシピの子を次のレシピの親に使う「連鎖」が最高峰セラフドレイクまで続く
// (例: 神秘のフクロウ×ルーンタートル→クロノウル→コズミックドレイク→セラフドレイク)。
// キーは種IDをソートして "+" で結合したもの。
export const RECIPES = Object.freeze({
  // 序盤〜中盤: 手に入りやすい2種から一段上の道
  "flamewolf+frostwolf": "galewolf", // 炎と氷のおおかみ → 疾風のおおかみ
  "honeybee+sparkbee": "galaxybee", // はち2種 → 銀河のはち(大ジャンプ)
  "duskcat+solarcat": "celestcat", // 夕暮れと太陽のねこ → 天上のねこ
  "moonblossom+sunblossom": "eternabloom", // 月と太陽の花 → 永遠の花
  "abyssfox+lunarfox": "nebulafox", // 深海と月のきつね → 星雲のきつね
  // アルカナへの4つの道(配合限定レア度の入口)
  "emberdrake+sunblossom": "auradrake", // 炎竜と太陽の花 → 光輝の竜
  "mistraven+nightraven": "voiddrake", // 闇鳥2種 → 虚空の竜
  "galebird+moonblossom": "mysticowl", // 風フクロウと月の花 → 神秘のフクロウ
  "gaiaturtle+glacierturtle": "runeturtle", // 大地と氷河のかめ → ルーン石のかめ
  // ビヨンドへの連鎖(レシピの子を親に)
  "celestcat+solarcat": "prismcat", // 天上のねこの血統 → 虹のねこ
  "galewolf+lunarfox": "phantomwolf", // 疾風のおおかみの血統 → 亡霊のおおかみ
  "emberdrake+frostdrake": "stormdrake", // 炎と氷の竜 → 嵐の竜
  // センチュリー〜天上への最終連鎖
  "mysticowl+runeturtle": "chronowl", // 神秘とルーン → 時のフクロウ
  "runeturtle+titanmole": "relicshell", // ルーンと巨神 → いにしえの石がめ
  "chronowl+relicshell": "cosmicdrake", // 時といにしえ → 銀河のドラゴン
  "auradrake+cosmicdrake": "seraphdrake", // 光輝と銀河の竜 → 熾天のドラゴン(最高峰)
});

// UI(レシピ手帳)用の一覧: [{key, parents:[idA,idB], child}]
export const RECIPE_LIST = Object.freeze(
  Object.entries(RECIPES).map(([key, child]) => ({
    key,
    parents: key.split("+"),
    child,
  })),
);

export function recipeKey(idA, idB) {
  return [idA, idB].sort().join("+");
}

// 組み合わせごとに固定の結果を選ぶための決定的ハッシュ。
function comboHash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

// 配合で生まれる種族(DQM式・決定的)。
// 1. 特別レシピに一致すればその種。
// 2. 通常: レア度は min(高い親+1, 低い親+2, 最上位) —
//    片方だけ高くても低い親が足を引っぱる(両方を育てて登る設計)。
//    属性はレア度が高い方の親の血を継ぎ、その属性の候補から組み合わせ固有の1種に決まる。
// 返り値: { speciesId, recipe }
export function breedResultSpecies(a, b) {
  const special = RECIPES[recipeKey(a.speciesId, b.speciesId)];
  if (special) return { speciesId: special, recipe: true };

  const rankA = rarityRank(a);
  const rankB = rarityRank(b);
  const targetRank = Math.min(
    Math.max(rankA, rankB) + 1,
    Math.min(rankA, rankB) + 2,
    RARITY_ORDER.length - 1,
  );
  const targetRarity = RARITY_ORDER[targetRank];
  // 支配側(血が濃い方) = レア度が高い方。同ランクならID順で固定(親の順番に依存させない)。
  const dominant =
    rankA !== rankB
      ? rankA > rankB
        ? SPECIES[a.speciesId]
        : SPECIES[b.speciesId]
      : a.speciesId < b.speciesId
        ? SPECIES[a.speciesId]
        : SPECIES[b.speciesId];

  let candidates = Object.values(SPECIES).filter(
    (s) => s.rarity === targetRarity && s.element === dominant.element,
  );
  if (candidates.length === 0) {
    candidates = Object.values(SPECIES).filter((s) => s.rarity === targetRarity);
  }
  candidates.sort((x, y) => (x.id < y.id ? -1 : 1));
  const pick =
    candidates[comboHash(recipeKey(a.speciesId, b.speciesId)) % candidates.length];
  return { speciesId: pick.id, recipe: false };
}

// 配合卵を作る(消費・支払いは呼び出し側)。
// 卵は「生まれる種族」を確定で持ち、孵化時に個体値継承・色違い・覚醒を解決する。
// 配合の成功率(子のレア度で決まる)。イモータル以降は失敗がありうる:
// 高レアの子が確実に量産できると収集・厳選の価値が崩れるため(合成と同じ思想)。
// 失敗すると子は1段下のレア度で生まれる(親とゴールドは消費・卵は必ずできる)
export const BREED_SUCCESS = Object.freeze({
  immortal: 0.5, arcana: 0.25, beyond: 0.1, century: 0.1, cosmic: 0.1, celestial: 0.05,
});

// 配合の成功率を返す(1.0 = 確定)。UIの成功率表示と抽選の両方で使う
export function breedSuccessRate(a, b) {
  const target = SPECIES[breedResultSpecies(a, b).speciesId].rarity;
  return BREED_SUCCESS[target] ?? 1;
}

// ---- 覚醒配合(ジャンプアップ): 超低確率で通常より1段上のレア度の子が生まれる ----
// DQMの「まれに格上が生まれる」高揚を移植。親の覚醒・+値が高いほど確率が上がる。
// モンスターは収集レイヤー(装備のようにマーケットで金銭化されない)なので、
// 超低確率のジャンプは経済を壊さず「配合を回し続ける動機」になる。
export const JUMP_BASE = 0.02; // 基礎2%
export function breedJumpChance(a, b) {
  const awaken = (a.awakening ?? 0) + (b.awakening ?? 0);
  const plusAvg = (((a.plus ?? 0) + (b.plus ?? 0)) / 2) * 0.002; // +値でわずかに上乗せ
  return Math.min(0.2, JUMP_BASE + awaken * 0.03 + Math.min(0.06, plusAvg));
}

// 1段上のレア度・同属性の種を決定的に1つ返す(最上位なら null)。
export function jumpUpSpecies(speciesId) {
  const sp = SPECIES[speciesId];
  const rank = RARITY_ORDER.indexOf(sp.rarity);
  if (rank >= RARITY_ORDER.length - 1) return null; // 既に最上位
  const higher = RARITY_ORDER[rank + 1];
  let candidates = Object.values(SPECIES).filter(
    (s) => s.rarity === higher && s.element === sp.element,
  );
  if (candidates.length === 0) {
    candidates = Object.values(SPECIES).filter((s) => s.rarity === higher);
  }
  if (candidates.length === 0) return null;
  candidates.sort((x, y) => (x.id < y.id ? -1 : 1));
  return candidates[comboHash("jump:" + speciesId) % candidates.length].id;
}

// 失敗時: 同じ属性系統で1段下のレア度の種から決定的に選ぶ
function downgradeSpecies(speciesId, rng) {
  const sp = SPECIES[speciesId];
  const rank = RARITY_ORDER.indexOf(sp.rarity);
  const lower = RARITY_ORDER[Math.max(0, rank - 1)];
  let candidates = Object.values(SPECIES).filter(
    (s) => s.rarity === lower && s.element === sp.element,
  );
  if (candidates.length === 0) {
    candidates = Object.values(SPECIES).filter((s) => s.rarity === lower);
  }
  candidates.sort((x, y) => (x.id < y.id ? -1 : 1));
  return candidates[Math.floor(rng() * candidates.length)].id;
}

// inheritPicks: [親Aから継承するスキルID|null, 親Bから…](null=星最高の自動選択)
export function makeBredEgg(a, b, rng = Math.random, inheritPicks = [null, null]) {
  const result = breedResultSpecies(a, b);
  // イモータル以降の子は成功判定。失敗すると1段下の子になる(卵は必ずできる)
  const rate = BREED_SUCCESS[SPECIES[result.speciesId].rarity] ?? 1;
  const success = rng() < rate;
  let speciesId = success ? result.speciesId : downgradeSpecies(result.speciesId, rng);
  // 覚醒配合(ジャンプアップ): 成功時、超低確率で1段上のレア度へ跳ねる
  let jumped = false;
  if (success && rng() < breedJumpChance(a, b)) {
    const jump = jumpUpSpecies(speciesId);
    if (jump) {
      speciesId = jump;
      jumped = true;
    }
  }
  return {
    id: `egg_${Date.now()}_${Math.floor(rng() * 1e9)}`,
    rarity: SPECIES[speciesId].rarity, // 卵の見た目は子のレア度
    obtainedAt: Date.now(),
    bred: true,
    breedFailed: !success, // UIが「格落ち」を伝えるためのフラグ
    jumped, // 覚醒配合でジャンプアップした(UIが特別に祝う)
    resultSpecies: speciesId, // DQM式: 生まれる種は配合時に確定
    recipe: (result.recipe && success) || jumped, // ジャンプは特別扱い
    parentSpecies: [a.speciesId, b.speciesId],
    // 親の覚醒レベル。孵化時の覚醒抽選の確率を左右する。
    parentAwakenings: [a.awakening ?? 0, b.awakening ?? 0],
    // +値: 両親の平均+1(世代の積み上げ)。格落ちしても+値は受け継がれる
    plus: childPlus(a, b),
    // スキル継承: 両親から1つずつ(プレイヤー選択・未選択は星最高を自動)
    inheritSkills: inheritSkills(a, b, speciesId, inheritPicks),
    // 個体値の下限は親の平均。孵化時にここへボーナスが乗る。
    ivFloor: {
      atk: (a.iv.atk + b.iv.atk) / 2,
      hp: (a.iv.hp + b.iv.hp) / 2,
      def: ((a.iv.def ?? 1) + (b.iv.def ?? 1)) / 2,
    },
  };
}
