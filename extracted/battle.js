import { AWAKENING, JOBS, jobMult, LIVE_TUNING, PACE_CALIBRATION, PERKS, PINNACLE_SOLID_MULT, RARITY_META, SKILLS, SPECIES, elementMult } from "./data.js";
import { T } from "./i18n.js";

// 極み「確実」の倍率(2026-07-11)。選んだ個体だけ+15%/+15%
function pinnacleMult(monster, key) {
  return monster?.pinnacle === "solid" ? (PINNACLE_SOLID_MULT[key] ?? 1) : 1;
}
import { equipStat, sustainBasisHpPct } from "./equipment.js";
import { plusMult } from "./breeding.js";

// モンスターの持つスキル定義(素の定義)を返す。atk/hpの種族パッシブ倍率はここから
// 引かれる(battle.js内のmonsterAtk/monsterHp、state.jsのdexバフ集計)ので、固有スキルの
// ガード系tier(passiveBoost)もここを通さないと進化ランクアップの効果が実戦に反映されない
export function skillOf(monster) {
  return evolvedSignature(monster, SKILLS[SPECIES[monster.speciesId].skillId]);
}

// 種族固有スキル(signature)の進化ランクアップ補正(2026-08-07 Haru指示「固有スキルは
// 進化ごとにランクが上がる設計」)。tiers配列(進化前/第1進化/第2進化の3要素)を持つ
// スキルだけが対象。進化段階の定義はstate.jsのevolveStage()と同じ(ジョブ階級から算出)だが、
// battle.js⇔state.jsの循環importを避けるためここに同じ最小ロジックを複製する
function signatureStage(monster) {
  const t = JOBS[monster?.job]?.tier;
  if (!t) return 0;
  return t >= 3 ? 2 : 1;
}

function evolvedSignature(monster, base) {
  if (!base?.signature || !Array.isArray(base.tiers)) return base;
  const tier = base.tiers[Math.min(signatureStage(monster), base.tiers.length - 1)];
  if (!tier) return base;
  const out = {
    ...base,
    name: tier.name,
    cooldown: tier.cooldown,
    active: { ...base.active, power: tier.power },
    desc: tier.desc,
  };
  // ガード系(shield/counter)は無敵化を避けるため active の数値を動かさない設計
  // (tiers生成時にpower/cooldownをtier0のまま複製済み)。その代わりパッシブだけ伸ばす
  if (tier.passiveBoost) {
    const key = base.passive?.atkMult != null ? "atkMult" : base.passive?.hpMult != null ? "hpMult" : null;
    if (key) out.passive = { ...base.passive, [key]: base.passive[key] + tier.passiveBoost };
  }
  return out;
}

// 覚醒補正を1スキルにかける(覚醒個体は「真・」スキルになり威力up・CD短縮)。
function awakenSkill(monster, base) {
  const lv = monster.awakening ?? 0;
  if (lv <= 0 || !base) return base;
  const boost = AWAKENING.skill[lv];
  // 6段の階級名は固定: 真(1〜2) / 極(3〜4) / 神(5〜6)。
  // bornStep連動にすると bornStep=1 で3段が「神・」を名乗ってしまう(2026-07-17修正)
  const prefix = lv >= 5 ? T("神・") : lv >= 3 ? T("極・") : T("真・");
  return {
    ...base,
    name: prefix + base.name,
    cooldown: Math.round(base.cooldown * boost.cooldown * 10) / 10,
    active: { ...base.active, power: base.active.power * boost.power },
    desc: `${base.desc} 【覚醒: 威力×${boost.power}・発動が速い】`,
  };
}

// セット中のスキル(最大2)を覚醒込みで返す。旧セーブは種族スキル1つにフォールバック。
export function equippedSkillsOf(monster) {
  const ids =
    Array.isArray(monster.equippedSkills) && monster.equippedSkills.length > 0
      ? monster.equippedSkills
      : [SPECIES[monster.speciesId].skillId];
  // 細工v3のスキル付与(超激レア出目): 装備の細工行から追加スキルを1つだけ拾う。
  // 覚醒ブーストは乗せない(素のスキル)+最弱級限定プール=番人ガードの対象
  const granted = (monster.equipment ?? [])
    .flatMap((it) => it.enhances ?? [])
    .map((e) => e?.skill)
    .filter((id) => id && SKILLS[id] && !ids.includes(id))
    .slice(0, 1);
  return [
    ...ids.map((id) => SKILLS[id]).filter(Boolean).map((sk) => awakenSkill(monster, evolvedSignature(monster, sk))),
    ...granted.map((id) => SKILLS[id]),
  ];
}

// 代表スキル(セット1枠目)。一覧表示・戦力計算の互換用。
export function effectiveSkill(monster) {
  return equippedSkillsOf(monster)[0];
}

// 覚醒によるステータス倍率を返す。
function awakenMult(monster, stat) {
  const lv = monster.awakening ?? 0;
  return lv > 0 ? AWAKENING.mult[lv][stat] : 1;
}

// ステージ40までは従来の伸び、以降は成長率を緩める区分指数カーブ。
// プレイヤー側の成長上限(ティア×レベル×個体値×覚醒×装備 ≒ 数千倍)は多項式的なので、
// ---- 敵・報酬カーブ(2026-07-13 恒久較正) ----
// 指数カーブ1本では実効ステージ1..400(10幕100面×4難易度)をカバーできない
// (旧: ステージ120までしか検証されておらず、121以降は数学的に進行不能だった)。
// そこで「マイルストーンごとの想定パーティ」(tools/balance-sim.js PROFILES)への
// アンカー表で定義し、区間内は等比補間する。今後のバランス調整はこの表を動かす。
// 進行目標(普通プレイ=最適解・激レアなし):
//  - ヘル解放(ナイトメア10-10=実効200)を倒す頃 ≈ Lv60
//  - 全クリ(トーメント10-10=実効400) ≈ Lv80+装備そろい
//  - Lv100 ≈ 1ヶ月(60以降はレベルアップ鈍化)
// 2026-07-13 装備想定の再設計: 「基本ほぼイモータル・終盤(トーメント)のみ一部
// アルカナ」を普通プレイの想定装備に(ビヨンド以上は攻略必須でない贅沢品)。
// アンカーは tools/balance-sim.js PROFILES の新装備想定パーティから逆算
// 2026-07-21 細工前提の高難度化: ヘル以降(実効201+)は想定パーティに細工投資
// (balance-model PROFILES の enh × ENH_ATK/ENH_HP — v5部位別プールから自動導出、
// フル投資で攻撃≈+20%/HP≈+37%)を織り込んだぶん、敵アンカーも同率で引き上げた:
//   敵HP×(1+enh×0.197)=プレイヤー攻撃の伸びを吸収(250:×1.12/300:×1.16/350+:×1.20)
//   敵ATK×(1+enh×0.370)=プレイヤーHPの伸びを吸収(250:×1.22/300:×1.30/350+:×1.37)
// 殺傷時間・被ダメ比は細工込みで従来の均衡に戻る=細工しない人にはヘル以降が硬く痛い
const HP_ANCHORS = [
  [1, 30], [5, 190], [10, 550], [30, 2300], [60, 8500], [100, 22000],
  [130, 29500], [160, 103000], [200, 139000], [250, 263000], [300, 337000],
  [350, 650000], [400, 761000],
];
const ATK_ANCHORS = [
  [1, 7], [10, 30], [30, 90], [60, 350], [100, 1100], [130, 2600], [160, 5200],
  [200, 6200], [250, 13400], [300, 14900], [350, 19900], [400, 20500],
];
const GOLD_ANCHORS = [
  [1, 5], [10, 16], [30, 60], [60, 220], [100, 700], [130, 1000], [160, 2600],
  [200, 4000], [250, 12000], [300, 17000], [350, 24000], [400, 28000],
];
const EXP_ANCHORS = [
  [1, 1], [10, 2], [30, 4], [60, 8], [100, 20], [130, 40], [160, 90],
  [200, 200], [250, 500], [300, 1000], [350, 2000], [400, 5000],
];

// アンカー表の等比補間。400超(週次の新地域ぶん)は最終区間の伸び率で外挿する。
function anchorCurve(anchors, stage) {
  const s = Math.max(1, stage);
  let [s0, v0] = anchors[0];
  if (s <= s0) return v0;
  for (let i = 1; i < anchors.length; i++) {
    const [s1, v1] = anchors[i];
    if (s <= s1) {
      const g = Math.pow(v1 / v0, 1 / (s1 - s0));
      return v0 * Math.pow(g, s - s0);
    }
    [s0, v0] = anchors[i];
  }
  const [sa, va] = anchors[anchors.length - 2];
  const [sb, vb] = anchors[anchors.length - 1];
  const g = Math.pow(vb / va, 1 / (sb - sa));
  return vb * Math.pow(g, s - sb);
}

// 敵の最大HP。装備枠(Lv解放)+きざし+装備Lv倍率の期待成長を織り込んだアンカー表
export function enemyMaxHp(stage) {
  return Math.round(anchorCurve(HP_ANCHORS, stage));
}

// 撃破報酬
export function goldReward(stage) {
  // LIVE_TUNING.goldMult = 週次の自動バランス調整係数(data.jsで0.8〜1.25にクランプ済み)
  return Math.round(anchorCurve(GOLD_ANCHORS, stage) * LIVE_TUNING.goldMult);
}

export function expReward(stage) {
  // PACE_CALIBRATION.expMult = 難易度番人の較正ノブ(全クリ20日死守 2026-07-18)。
  // LIVE_TUNING(週次±25%)とは独立で、difficulty-guard --fix だけが書き換える
  return Math.max(
    1,
    Math.round(anchorCurve(EXP_ANCHORS, stage) * LIVE_TUNING.expMult * PACE_CALIBRATION.expMult),
  );
}

// レベルアップに必要な経験値(区分カーブ / 2026-07-08ユーザー指示)。
//  ・序盤(〜30): 緩い勾配(×1.12)でサクサク上がる=レベル上げやすい
//  ・中盤(30〜60): ×1.15 で徐々にペースダウン
//  ・後半(60〜): ×1.225 に勾配を上げ「60以降は上がりづらい」。Lv90〜100は
//    数十時間+オフラインの長期グラインド(≒1か月)になる終着点。
// 各区切りは前区間の終端値で連続させる(段差なし)。tools/balance-sim.js の「分/Lv」で検証。
// 2026-07-09「レベルが上がるのが速すぎ」→ 序盤〜中盤を約2倍スロー(base 24→40, 序盤勾配
// 1.12→1.13)。後半勾配は 1.225→1.198 に微減して終端(Lv100)を従来と同程度に保ち、
// balance-sim の「分/Lv<240」を割らないようにする(=前半を厚く・終端は据え置きの再配分)。
// 2026-07-12 再較正「Lv60到達≈1週間 / Lv100到達≈1ヶ月」:
// 必要経験値。**4段の勾配**で、段の切れ目=設計のマイルストーン
// (30=中盤入り / 60=ヘル解禁 / 80=全クリ相当 / 100=カンスト)に揃えてある。
// 2026-07-29 Haru指示「トーメント30日・ヘル到達13日・Lv100=40日」で全面再設計:
//   旧3段(1.13/1.255/1.105)は 6.1日/19.2日/37.7日 の形で、ヘル比(13/30=43%)に
//   どう勾配を振っても届かなかった(3段では形の自由度が足りない)。
//   新4段は balance-model の perLevel(レベルごとのEXP獲得率)への数値フィットで、
//   expMult較正後に ヘル13.2日 / 全クリ30.0日 / Lv100=40.1日 になる。
//   ・s1=1.19: 序盤も旧(0.2日でLv30)より歩みを感じる速さに(0.7日でLv30)
//   ・s2=1.202: ヘル前の壁はLv60直前の786分/Lvが最大(全体が1.5倍長い設計なので
//     旧の562分/20日と比率はほぼ同じ)
//   ・s3=1.09: 60-80は1レベル≈0.85日でクリアへ
//   ・s4=1.042: **クリア後は意図的に加速**(80→100を10日=1日2レベルの
//     ビクトリーラップ)。旧「60以降は鈍化し続ける」設計はこの指示で廃止
export function expToNext(level) {
  if (level < 30) return Math.round(40 * Math.pow(1.19, level - 1));
  const at30 = 40 * Math.pow(1.19, 29);
  if (level < 60) return Math.round(at30 * Math.pow(1.202, level - 30));
  const at60 = at30 * Math.pow(1.202, 30);
  if (level < 80) return Math.round(at60 * Math.pow(1.09, level - 60));
  const at80 = at60 * Math.pow(1.09, 20);
  return Math.round(at80 * Math.pow(1.042, level - 80));
}

// えらんだ「きざし」の倍率の積(atk/hp)。
export function perkMult(monster, stat) {
  let m = 1;
  for (const p of monster.perks ?? []) {
    m *= PERKS[p.id]?.mult?.[stat] ?? 1;
  }
  return m;
}

// えらんだ「きざし」の加算ステータス合計(skillPower/atkSpeed/dropBonus/goldBonus)。
export function perkStat(monster, key) {
  let s = 0;
  for (const p of monster.perks ?? []) {
    s += PERKS[p.id]?.stat?.[key] ?? 0;
  }
  return s;
}

// レア度によるステータス上乗せ。種族値でもレア度は効くが、さらに明確な差をつける。
// 2026-07-17 FB「イモータルくらいで既にめっちゃ強い。激強になるのはアルカナ以上にして」:
// ★1〜5(コモン〜イモータル)は勾配を緩めて(0.06→0.045)地続きの強さに、
// ★6(アルカナ)からは崖(ジャンプ+0.24、以降+0.16/星)で「引けた時だけ無双」の格上感を強調。
//   旧: ★5=1.24 ★6=1.36 ★7=1.48 ★8=1.60 ★9=1.72 ★10=1.84
//   新: ★5=1.18 ★6=1.42 ★7=1.58 ★8=1.74 ★9=1.90 ★10=2.06
// アルカナ以上は卵も月0.5個級に希少化(WILD_EGG_HIGH_SCALE 0.15→0.08)とセット。
export function rarityStatMult(rarity) {
  const stars = RARITY_META[rarity]?.stars ?? 1;
  if (stars <= 5) return 1 + (stars - 1) * 0.045;
  return 1.42 + (stars - 6) * 0.16;
}

// ---- 図鑑バフ(2026-07-16 FB「図鑑を埋めた%に応じてバフ・1種ごとの個別バフ」) ----
// UI(ブラウザ)が dexTotals(state) から算出してここにセットする。
// balance-sim とテストはセットしない=係数1のまま。図鑑は「プレイヤー側の上振れ」
// (覚醒・ジョブと同じ扱い)なので、代表パーティの較正には含めない。
let dexBonus = { atk: 1, hp: 1 };
export function setDexCollectionBonus(atkMult, hpMult) {
  dexBonus = {
    atk: Number.isFinite(atkMult) && atkMult > 0 ? atkMult : 1,
    hp: Number.isFinite(hpMult) && hpMult > 0 ? hpMult : 1,
  };
}

// モンスターの攻撃力(種族値 × レベル補正 × 個体値 × レア度 × パッシブ × 覚醒倍率 × 装備% × きざし × +値 × 図鑑)
export function monsterAtk(monster) {
  const species = SPECIES[monster.speciesId];
  const atkMult = skillOf(monster).passive?.atkMult ?? 1;
  // 内在ステ(種族〜%特性まで) + 装備の固定値(atkFlat)。固定値は最終値に加算。
  const intrinsic =
    species.baseAtk *
    (1 + (monster.level - 1) * 0.1) *
    monster.iv.atk *
    rarityStatMult(species.rarity) *
    atkMult *
    awakenMult(monster, "atk") *
    jobMult(monster, "atk") * // 進化ジョブの倍率(2026-07-10)
    pinnacleMult(monster, "atk") * // 極み「確実」(2026-07-11)
    (1 + equipStat(monster, "atkPct")) *
    perkMult(monster, "atk") *
    plusMult(monster) *
    dexBonus.atk;
  return intrinsic + equipStat(monster, "atkFlat") * dexBonus.atk;
}

// モンスターの最大HP(種族値 × レベル補正 × 個体値 × パッシブ × 覚醒倍率 × 装備% × きざし × +値)
// sustainBasis=true は「回復・バリアの基準HP」(2026-07-21 FB「HP%を掛け合わせて
// HPを盛るとHP比のシールドがえげつない量になりほぼ無敵」対策):
// 既定では細工由来のHP%を除く=HPを盛っても毎秒のサステイン絶対量は伸びないので、
// HPスケールでサステインが被ダメ(絶対値)を追い越す無敵ループが起きない。
// ただし激レアの細工行「魂の器」を引くと細工HPの一部(最大50%)が基準に算入され、
// 「HP盛り×HP比サステイン」ビルドが戦略として成立する(同日FB「抜け道は残したい。
// 実現が難しく、運よくオプションがかみ合った時だけ成立する形で」)。詳細は
// sustainBasisHpPct(equipment.js)と POWER_REGISTRY.enhance.soulVessel
export function monsterMaxHp(monster, { sustainBasis = false } = {}) {
  const species = SPECIES[monster.speciesId];
  const hpMult = skillOf(monster).passive?.hpMult ?? 1;
  const intrinsic =
    species.baseHp *
    (1 + (monster.level - 1) * 0.12) *
    monster.iv.hp *
    rarityStatMult(species.rarity) *
    hpMult *
    awakenMult(monster, "hp") *
    jobMult(monster, "hp") * // 進化ジョブの倍率(2026-07-10)
    pinnacleMult(monster, "hp") * // 極み「確実」(2026-07-11)
    (1 + (sustainBasis ? sustainBasisHpPct(monster) : equipStat(monster, "hpPct"))) *
    perkMult(monster, "hp") *
    plusMult(monster) *
    dexBonus.hp;
  return Math.round(intrinsic + equipStat(monster, "hpFlat") * dexBonus.hp);
}

// 敵の攻撃力。2026-07-09「目安未満でもイージーにクリアできる」対策で全面的に威圧を強化
// (base 3.5→6.6 ≈ ×1.9)。耐え/撃破比が中盤で2〜4程度まで下がり、目安を満たさない/属性を
// 無視した編成では押し切られる=目安が意味を持つ。序盤の緩和は「駆け出しの加護」で担保。
export function enemyAtk(stage) {
  return Math.round(anchorCurve(ATK_ANCHORS, stage));
}

// ステージ攻略の目安となるパーティ総合戦力(UIのpowerScore合計と同じ尺度)。
//
// 2026-07-13 再々設計: 「敵HP×係数」は原理的に破綻する(表示戦力は会心/2スキル/
// CDRを含まないため、敵HPとの比が序盤1.3→終盤0.08まで逓減する)。
// そこで各マイルストーンの「想定パーティの表示戦力」をアンカー表にした。
//
// 2026-07-15 再較正(FB「目安戦力の半分以下の戦力でクリアできる。何回も言ってる」):
// 旧アンカーは「想定パーティの戦力」そのもの=快適に回れる戦力だったため、
// 序盤〜ノーマル帯では半分でも普通に勝ててしまい、目安が意味を持っていなかった
// (実測: stage30の耐え/撃破比8.7 → 半分でも2.2で、詰みライン1.8を上回る)。
//
// 新定義: 目安 = 「生存限界の1.2倍」= ギリギリ勝てる線。
//   パーティを一律k倍すると DPS∝k・耐久∝k なので 耐え/撃破比 ∝ k²。
//   設計しきい値「比1.8未満=詰み」より、生存限界は k_min = √(1.8/比)。
//   目安 = 想定パーティの表示戦力 × k_min × 1.2 とすると、目安の半分では
//   比 = 1.8 × (1.2×0.5)² = 0.65 となり、全ステージで確実に詰む。
//   → 「目安の半分でクリアできる」は構造的に起こらない(tools/balance-sim.js が毎回検証)。
// 値は tools/balance-sim.js PROFILES(基本イモータル・終盤一部アルカナ想定)から算出。
// 2026-07-19 再定義: 目安 = 生存限界(サステイン上限込み)×REC_MARGIN。
// この表は tools/recalibrate-rec.js が自動生成する(手で書かない)。
// balance-simのガードが「定義とのズレ>10%」で赤になり、ズレたら同ツールで再較正する
const REC_POWER_ANCHORS = [
  [1, 7], [5, 26], [10, 53], [30, 152], [60, 482], [100, 1566],
  [130, 3691], [160, 8656], [200, 10287], [250, 22938], [300, 26576], [350, 36581],
  [400, 37578],
]; // guard:rec-anchors
// 目安の定義に使った係数(balance-sim.js のガードと共有する)。
// REC_SURVIVAL_RATIO = 詰みライン、REC_MARGIN = 生存限界に対する目安の余裕。
export const REC_SURVIVAL_RATIO = 1.8;
export const REC_MARGIN = 1.2;
export function recommendedPower(stage) {
  return Math.max(5, Math.round(anchorCurve(REC_POWER_ANCHORS, stage)));
}

// 被ダメージの属性補正(パーティ平均)。
// 敵の属性に弱いメンバーが多いほど痛く、耐性側で固めると硬い。
// 「不利な幕はすぐ死ぬ / 刺さる編成なら安定」という編成の歯ごたえを作る。
// 2026-07-13 FB「被ダメージにも属性の影響出して攻略の難易度を上げて」
// → 弱点1.45→1.7に強化・耐性0.65→0.7に緩和(耐性で固めても無敵にはしない)。
// 幕ごと属性固定とセット: 幕の頭で1回編成を合わせれば10面ずっと有効。
export const DEF_WEAK_MULT = 1.7;
export const DEF_RESIST_MULT = 0.7;

export function partyDefenseMult(state, atkElem) {
  if (!atkElem) return 1;
  const members = state.party.map((id) => state.monsters[id]).filter(Boolean);
  if (members.length === 0) return 1;
  let sum = 0;
  for (const mon of members) {
    const myElem = SPECIES[mon.speciesId].element;
    if (elementMult(atkElem, myElem) > 1) {
      // 細工v3の「属性防御力」(elemDef): 弱点を突かれたときの被ダメだけを軽減(上限30%)。
      // DEFENSE_REDUCTION_FLOOR(かばう×防具)とは別枠だが、効くのは弱点時のみ=無敵にならない
      sum += DEF_WEAK_MULT * (1 - Math.min(0.3, equipStat(mon, "elemDef"))); // 敵に刺されている
    } else if (elementMult(myElem, atkElem) > 1) sum += DEF_RESIST_MULT; // こちらが有利=耐える
    else sum += 1;
  }
  return sum / members.length;
}

// 難所の被ダメ倍率(2026-07-24 FB「属性防御か種族をそろえないと耐えきれない被ダメージに」)。
// 素の elemDef は「弱点を突かれたときだけ」効くので、闇の幕のように誰も耐性を取れない
// 属性では投資しても報われない=盛る意味が無かった。難所ではその上乗せぶんを
// パーティ平均の属性防御で削れるようにして、属性防御そのものを対策手段にする。
//   実効倍率 = 1 + (takenMult - 1) × (1 - min(HAZARD_ELEMDEF_CAP, 平均elemDef))
// 例: ヘルの嵐(2.4倍)に平均30%の属性防御 → 1 + 1.4×0.7 = 1.98倍まで軽くなる。
// 完全には消えない(=編成でも軽くする必要がある)ので、属性防御と編成の二択でなく
// 両方を組み合わせて越える設計になる。
export const HAZARD_ELEMDEF_CAP = 0.3;
export function hazardTakenMult(state, gimmick) {
  const base = gimmick?.takenMult ?? 1;
  if (base <= 1) return base;
  const members = state.party.map((id) => state.monsters[id]).filter(Boolean);
  if (members.length === 0) return base;
  const avg = members.reduce((sum, m) => sum + Math.min(HAZARD_ELEMDEF_CAP, equipStat(m, "elemDef")), 0) / members.length;
  return 1 + (base - 1) * (1 - Math.min(HAZARD_ELEMDEF_CAP, avg));
}

// 秒間撃破数の推定値。オフライン進行の計算に使う。
export function killsPerSec(monster, stage, attacksPerSec = 1) {
  return killsPerSecFromAtk(monsterAtk(monster), stage, attacksPerSec);
}

// 攻撃力(合計値など)から直接、秒間撃破数を求める。
export function killsPerSecFromAtk(atk, stage, attacksPerSec = 1) {
  return (atk * attacksPerSec) / enemyMaxHp(stage);
}
