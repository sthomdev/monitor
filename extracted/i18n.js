// 多言語化(2026-07-18)。3層構成:
//  ①applyDataLocale: データの表示名(種族/レア度/属性/スキル名等)を起動時にenへ一括差し替え
//    — 表示箇所は全部 data の .name/.label を読むので、呼び出し側の変更ゼロで全画面に効く
//  ②translateStaticDom: index.html の静的ラベル(窓タイトル/タスクバー)を辞書で置換
//  ③T(ja): 動的な文言の辞書引き(呼び出し側を段階的にT()化していく長期戦)
// 辞書に無い文字列は日本語のまま出る=未翻訳が実行時に見えるので漏れを潰しやすい。
import {
  SPECIES,
  RARITY_META,
  ELEMENT_META,
  SKILLS,
  JOBS,
  AWAKENING,
  DIFFICULTIES,
} from "./data.js";
import { EXTRA_SKILLS } from "./content-pack.js";
import { DICT_STATIC, RULES_EN, DICT_STATIC2, RULES_EN2 } from "./i18n-dict.js";
import { LANG_CODES, LOCALES, isSupportedLang } from "./i18n-locales.js";

// 対応言語(2026-07-29): ja/en + 優先7言語。詳細は i18n-locales.js
export let LANG = "ja";

export function setLang(lang) {
  LANG = isSupportedLang(lang) ? lang : "ja";
}

/**
 * 保存された設定が無いとき、どちらの言語で始めるかを決める(2026-07-28)。
 *
 * これまでは無条件に日本語で始めていた。ストアページで英語対応を宣言しているのに、
 * 英語圏のプレイヤーは**読めない画面から自力で🌐を探す**必要があり、
 * 審査担当者にも同じことが起きる。最初の1画面から読めるのが正しい。
 *
 * navigator.languages は「好きな順」に並んでいるので、**先に出てきたほうを採る**。
 * 「日本語が入っていれば日本語」にすると、日本語も読めるが英語を第一希望に
 * している人へ日本語を押しつけることになる。用意してあるのが2つだけでも、
 * 順序は本人の意思なので尊重する。どちらも無ければ、世界の多数派の英語にする。
 *
 * 2026-07-29: 対応が9言語になったので、BCP47の主要サブタグで引く表に変えた。
 * 中国語は簡体字だけ用意しているので zh-* は全部 zh に寄せる(繁体字話者にも
 * 日本語より読めるため。繁体字を足したらここを分ける)。
 *
 * @param {string[]} tags navigator.languages のような BCP47 の並び
 */
const LANG_BY_PRIMARY = Object.freeze({
  ja: "ja", en: "en", zh: "zh", ru: "ru", es: "es",
  pt: "pt", de: "de", fr: "fr", ko: "ko",
});
export function preferredLang(tags) {
  const list = (Array.isArray(tags) ? tags : [tags]).filter(Boolean).map(String);
  for (const tag of list) {
    const primary = tag.toLowerCase().split(/[-_]/)[0];
    const hit = LANG_BY_PRIMARY[primary];
    // 稼働言語だけを採る(2026-07-30 7言語休止: 休止中の言語のOSでも英語に落とす。
    // 登録簿のスイッチに追従するので、復活すればここも自動で9言語推定に戻る)
    if (hit && isSupportedLang(hit)) return hit;
  }
  return "en";
}

// id(英語の複合語)を表示名に: "flamewolf"→"Flamewolf", "glacierturtle"→"Glacierturtle"
const cap = (id) => id.charAt(0).toUpperCase() + id.slice(1);

// ---- ①データの多言語化(ja以外・起動時に1回) ----
// 種族名(156)は id が英単語なので全言語で英字表記に統一する(固有名詞の扱い)。
// レア度/属性/ジョブ/スキル/難易度/覚醒は「遊びの語彙」なので言語ごとに訳す
// (訳が無い言語は英語のまま = 読めなくならない)。
export function applyDataLocale() {
  if (LANG === "ja") return;
  const loc = LOCALES[LANG]?.DATA ?? null; // en は null(英語が基準)
  const pick = (kind, key, en) => loc?.[kind]?.[key] || en;
  // ※dataの各テーブルはObject.freeze()済み(浅い凍結)。内側オブジェクトの
  //   .name/.label書き換えは可能だが、凍結配列(DIFFICULTIES)への代入は
  //   strict modeでthrowしてモジュールごと落ちる(2026-07-18実測)。
  //   → 書き換えは全てtryで包み、失敗した項目は日本語のまま残す(段階的degrade)
  const safe = (fn) => { try { fn(); } catch { /* frozen: 日本語のまま */ } };
  // 種族156種: idがそのまま英名(flamewolf等)なので機械変換で全カバー
  // 英語化と同時に「旧日本語名→英語名」を実行時辞書へ登録する(2026-07-22 全数監査)。
  // お知らせ等が日本語名を引用して組む文字列(「新キャラ『シャインキャット』」等)は、
  // ルールの再帰翻訳がこの対訳を引いて英語名に置き換わる。週次生成の新名前も自動カバー
  // idそのままだと不格好になる種族の英名上書き(例: shinecat2 → "Shinecat2"は安直)
  const SPECIES_EN = { shinecat2: "Mooncat" };
  for (const [id, sp] of Object.entries(SPECIES)) safe(() => { const en = SPECIES_EN[id] ?? cap(id); addRuntimeDict(sp.name, en); sp.name = en; });
  // レア度: カタカナ=英語なので対訳固定
  const RAR = {
    common: "Common", rare: "Rare", ultra: "Ultra", legend: "Legend",
    immortal: "Immortal", arcana: "Arcana", beyond: "Beyond",
    century: "Century", cosmic: "Cosmic", celestial: "Celestial",
  };
  for (const [k, m] of Object.entries(RARITY_META)) if (RAR[k]) safe(() => { m.label = pick("rarity", k, RAR[k]); });
  const ELEM = { fire: "Fire", water: "Water", wind: "Wind", earth: "Earth", light: "Light", dark: "Dark" };
  for (const [k, m] of Object.entries(ELEMENT_META)) if (ELEM[k]) safe(() => { m.label = pick("element", k, ELEM[k]); });
  // スキル名: idから英名。覚醒接頭辞(真/極/神)はbattle.js側の生成なのでT対象(下の辞書)
  for (const [id, sk] of Object.entries(SKILLS)) safe(() => { const n = pick("skill", id, cap(id)); addRuntimeDict(sk.name, n); sk.name = n; });
  // 生成スキルの入力テーブル(EXTRA_SKILLS)はdiversifySkillでコピーされるため
  // SKILLS側の書き換えが届かない。表示はSKILLS経由だが、カタカナ名がお知らせ等の
  // 合成文字列に引用されるので、こちらも対訳登録+英語化しておく
  for (const [id, sk] of Object.entries(EXTRA_SKILLS ?? {})) {
    safe(() => { const n = pick("skill", id, cap(id)); addRuntimeDict(sk.name, n); sk.name = n; });
  }
  // ジョブ名: nameかlabelを持つ方を変換(idは英語)
  for (const [id, j] of Object.entries(JOBS ?? {})) {
    const jn = pick("job", id, cap(id));
    safe(() => { if (typeof j?.name === "string") { addRuntimeDict(j.name, jn); j.name = jn; } });
    safe(() => { if (typeof j?.label === "string") { addRuntimeDict(j.label, jn); j.label = jn; } });
  }
  // 覚醒ラベル
  for (const k of Object.keys(AWAKENING.label ?? {})) {
    const roman = ["", "I", "II", "III", "IV", "V", "VI"][Number(k)] ?? k;
    safe(() => { AWAKENING.label[k] = pick("awakening", k, `Awakening ${roman}`); });
  }
  // 難易度(文字列配列 or {name}配列の両対応)
  const DIFF = { "ノーマル": "Normal", "ナイトメア": "Nightmare", "ヘル": "Hell", "トーメント": "Torment" };
  for (let i = 0; i < (DIFFICULTIES?.length ?? 0); i++) {
    safe(() => {
      const d = DIFFICULTIES[i];
      // 難易度は日本語をキーにして引く(DIFF のキーが日本語のため)
      const dn = (ja) => pick("difficulty", ja, DIFF[ja]);
      if (typeof d === "string" && DIFF[d]) DIFFICULTIES[i] = dn(d); // 凍結配列ならthrow→スキップ
      else if (d && typeof d.name === "string" && DIFF[d.name]) d.name = dn(d.name);
      else if (d && typeof d.label === "string" && DIFF[d.label]) d.label = dn(d.label);
    });
  }
}

// ---- ③動的文言の辞書(日本語→英語)。段階的に拡充する ----
export const DICT_EN = {
  // 窓タイトル・静的ラベル(②でも使用)
  "バトル": "Battle", "詳細": "Details", "ボックス": "Box", "そうび倉庫": "Storage",
  "調合": "Compound", "交易船": "Trade Ship", "かくりつ": "Odds", "マップ": "Map",
  "図鑑": "Dex", "ステータス": "Status", "目安箱": "Suggestions", "卵": "Eggs",
  "倉庫": "Storage", "探索": "Expedition", "合成": "Craft", "地図": "Map",
  "タスモン": "Tasmon", "インベントリ": "Inventory", "スキル": "Skills", "スフィア盤": "Sphere Board",
  "ポータル": "Portal", "自動開封": "Auto-open", "戦力": "Power", "目安": "Target", "控え": "Reserve",
  // 調合タブ・ラベル
  "育てる": "Raise", "覚醒": "Awaken", "武具": "Forge", "ガチャ": "Gacha",
  "旅立つ子": "Departing", "育つ子(軸)": "Growing (Base)", "覚醒させる子": "To Awaken",
  "生まれる武具": "Resulting Gear", "託す子を選ぶ": "Pick one to send off",
  "軸の子を選ぶ": "Pick the base", "対象を選ぶ": "Pick a target", "宿す子を選ぶ": "Pick one to enshrine",
  "— 未選択 —": "— Empty —", "— 未定 —": "— TBD —", "左の子で決まる": "Depends on the left",
  "ボックスの子をクリック": "Click one in the Box",
  "⚠ この子は旅立つ(いなくなる)": "⚠ This one departs (gone for good)",
  "🌟 力を託す": "🌟 Pass On Power", "⚒ 武具に宿す": "⚒ Forge Into Gear",
  "重ねる子を選ぶ": "Pick ones to offer",
  // 汎用ボタン・共通
  "保存": "Save", "閉じる": "Close", "キャンセル": "Cancel", "外す": "Remove",
  "⚡ 最強装備": "⚡ Best Gear", "🧺 全部外す": "🧺 Unequip All", "🧺 装備一括解除": "🧺 Unequip All (Reserve)",
  "レア度": "Rarity", "新着": "New", "部位": "Slot", "すべて": "All", "つよさ": "Power",
  "整理(逃がす)": "Tidy (Release)", "選択中": "Equipped",
  // 交易船
  "🎒 インベ": "🎒 Inventory", "🏷 マーケット": "🏷 Market",
  "⚓ 出品する(Steam連携後に有効化)": "⚓ List on Market (after Steam link)",
  // ステータス系(見出し)
  // 総合戦闘力は"Power"(短)。"Total Power"だと詳細窓の情報列が伸びて立ち絵を潰す(2026-07-21)
  "総合戦闘力": "Power", "セットスキル": "Set Skills", "次のLvまで": "To next Lv:",
  // 覚醒スキル接頭辞(battle.jsが生成)
  "真・": "True ", "極・": "Ultra ", "神・": "Divine ",
};

// T("日本語", {key:val}): 現在言語の文字列を返す。{key}は置換。
// 訳の探索順は「その言語 → 英語 → 日本語のまま」(2026-07-29 多言語化)。
// 英語を挟むのは、未訳のとき日本語を出すより英語のほうが確実に読めるため
export function T(ja, vars) {
  let s = ja;
  if (LANG !== "ja") s = LOCALES[LANG]?.STATIC?.[ja] ?? MERGED[ja] ?? ja;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

// ---- ④自動翻訳レイヤー(2026-07-19) ----
// ui.js内の日本語は637種+テンプレート607箇所あり、全呼び出し側のT()化は
// リリースまでに間に合わない規模。代わりにMutationObserverでDOMのテキストノードを
// 直接英訳する(呼び出し側ゼロ変更)。辞書(完全一致)→ルール(正規表現)の順で照合し、
// どちらにも無ければ日本語のまま=壊れることがない。日本語表示時は何もしない。
const JP_RE = /[぀-ヿ一-鿿]/;
const MERGED = { ...DICT_EN, ...DICT_STATIC, ...DICT_STATIC2 };
const ALL_RULES = [...RULES_EN2, ...RULES_EN]; // 第2弾(具体的)を先に試す

// 多言語化(2026-07-29): 正規表現は言語共通。出力テンプレだけ言語ファイルで差し替える。
// 差し替え表は「正規表現のsource → 訳文テンプレ」。無いキーは英語テンプレのまま。
// 言語ごとに1回だけ組み立ててキャッシュする(ALL_RULESは1147件あるので毎回は重い)
const rulesCache = new Map();
function rulesFor(lang) {
  if (lang === "en" || lang === "ja") return ALL_RULES;
  if (rulesCache.has(lang)) return rulesCache.get(lang);
  const table = LOCALES[lang]?.RULES ?? {};
  const built = ALL_RULES.map(([re, tpl]) => {
    // 関数テンプレは機械翻訳できないので英語のまま(実測1件のみ)
    if (typeof tpl === "function") return [re, tpl];
    const t = table[re.source];
    return [re, typeof t === "string" && t ? t : tpl];
  });
  rulesCache.set(lang, built);
  return built;
}
// 完全一致の辞書も同じく「その言語 → 英語」の順で引く
function staticFor(lang, key) {
  if (lang === "ja") return undefined;
  return LOCALES[lang]?.STATIC?.[key] ?? MERGED[key];
}

// 実行時に対訳を足す(2026-07-22 全数監査)。applyDataLocaleがID由来で英語化した
// 名前(スキル/種族/ジョブ)の「旧日本語名→英語名」をここで登録する。
// お知らせ等が日本語名を引用して合成する文字列(例:「新スキル『ルミナテンポ』」)も、
// ルールの再帰翻訳がこの対訳を引けるようになる。週次生成の新名前も自動でカバー
export function addRuntimeDict(ja, en) {
  if (typeof ja === "string" && typeof en === "string" && ja && ja !== en) MERGED[ja] = en;
}

// 投機的呼び出し(候補を試すだけ)の深さ。>0 の間は未訳レポーターに数えない
let _spec = 0;

// 1つのテキストを現在の言語へ訳す(訳せなければ原文のまま返す)
export function translateText(s) {
  if (!s || !JP_RE.test(s)) return s;
  // 前後の空白は保ったまま中身だけ照合
  const m = s.match(/^(\s*)([\s\S]*?)(\s*)$/);
  const core = m[2];
  let out = staticFor(LANG, core);
  if (out === undefined) {
    for (const [re, tpl] of rulesFor(LANG)) {
      const mm = core.match(re);
      if (mm) {
        // テンプレートは文字列($N置換)または関数(2026-07-22 全数監査:
        // ステータス連鎖のような可変長の合成は正規表現+$Nでは表現できないため)。
        // 関数はマッチ配列と再帰翻訳器を受け取り、英語文字列を返す
        if (typeof tpl === "function") {
          out = tpl(mm, translateText);
          break;
        }
        // 捕捉部分も再帰的に翻訳する(「第1幕 そうげん」→"Act 1: Grassland" のような合成に効く)
        out = tpl.replace(/\$(\d)/g, (_, d) => {
          const cap = mm[Number(d)] ?? "";
          return JP_RE.test(cap) ? translateText(cap) : cap;
        });
        break;
      }
    }
  }
  if (out === undefined) {
    // 部分一致の最後の砦: 区切りごとに再帰で試す。
    // ・(U+30FB)自体もJP判定に入るため英語側では " / " に置き換える。
    // 「 / 」はスキル説明の「効果 / 常時ステ」形式、改行はメール等の段落境界
    // (段落は改行のまま保つ。2026-07-22 全数監査)
    for (const [sep, joiner] of [["\n", "\n"], [" ・ ", " / "], ["・", " / "], [" / ", " / "]]) {
      if (core.includes(sep)) {
        const parts = core.split(sep).map((p) => translateText(p));
        out = parts.join(joiner);
        break;
      }
    }
  }
  if (out === undefined) {
    // 部分一致の最後の砦②: 非日本語の前置/後置を剥がして中核だけ再帰翻訳
    // (2026-07-22 FB「9.13%(基本0.12%+ボーナス9.01%)」)。呼び出し側が
    // `pct + "(基本…)"` のように文字列連結すると、骨格単体では訳せるルールの
    // ^アンカーが外れて素通りする。個別対訳でなく連結という穴自体を塞ぐ:
    // 前後の非日本語部分を保ったまま、日本語を含む中核を再帰で訳し、
    // 中核が完全に英語化できた時だけ採用する
    // 中核の切り出し位置は「最初/最後の日本語文字」に加えて、その外側の括弧も候補に
    // する(「9.13%(基本…)」は "(基本…)" ごと切らないと ^\( アンカーのルールに届かない)。
    // 広い切り出しから順に試し、完全に英語化できた最初の結果を採用する
    const first = core.search(JP_RE);
    let last = -1;
    for (let k = core.length - 1; k >= 0; k--) if (JP_RE.test(core[k])) { last = k; break; }
    if (first > 0 || last < core.length - 1) {
      const OPEN = "([{「『【〈《";
      const CLOSE = ")]}」』】〉》";
      const starts = [first];
      for (let k = first - 1; k >= 0; k--) if (OPEN.includes(core[k])) starts.push(k);
      const ends = [last + 1];
      for (let k = last + 1; k < core.length; k++) if (CLOSE.includes(core[k])) ends.push(k + 1);
      starts.sort((a, b) => a - b); // 広い方(外側の括弧)から
      ends.sort((a, b) => b - a);
      // 「完全に訳せたか」の判定は言語で変える(2026-07-31)。中国語の正しい訳は
      // 漢字を共有するので JP_RE(漢字含む)だと**訳せているのに未訳と誤判定**され、
      // 採用されずに日本語のまま残る(実測: 「12.12%(基本…+ボーナス…)」)。
      // 中国語では日本語固有の**かな**だけを「まだ日本語」の証拠として使う
      // (scanUntranslated と同じ理屈)
      const stillJa = LANG === "zh" ? /[ぁ-んァ-ヶ]/ : JP_RE;
      // このループは「訳せるか試すだけ」の投機的呼び出し(失敗しても外側が別候補で
      // 成功しうる)なので、未訳レポーターには数えない(_specで抑制)
      _spec++;
      try {
        outer: for (const st of starts) {
          for (const en of ends) {
            const mid = core.slice(st, en);
            if (!mid || mid === core || !JP_RE.test(mid)) continue;
            const inner = translateText(mid);
            if (!stillJa.test(inner) && inner !== mid) { out = core.slice(0, st) + inner + core.slice(en); break outer; }
          }
        }
      } finally { _spec--; }
    }
  }
  if (out === undefined) {
    // 最後の砦③: データ名の埋め込み合成(「[8-5] ⚠巨壁」等)。地の文に日本語が無い
    // テンプレ(全部プレースホルダ)はデータ値の日本語を埋め込んでも骨格監査に映らない。
    // 文中の日本語の連続部分だけを個別に辞書引きし、**全部訳せた時だけ**採用する
    // (1つでも未対訳なら原文のまま返す=中途半端な英語を出さず、全数監査が検出する)
    let ok = true;
    const t = core.replace(/[぀-ヿ一-鿿][぀-ヿ一-鿿ー]*/g, (run) => {
      const tr = MERGED[run];
      if (tr === undefined) { ok = false; return run; }
      return tr;
    });
    if (ok && t !== core) out = t;
  }
  if (out === undefined) {
    // 未訳レポーター(2026-08-04 Steam審査FB「スフィア盤に日本語」):
    // 訳せず日本語のまま返した文字列を記録する。verify-langsが実機EN周回の最後に
    // 回収して赤にする=ツールチップ等「開いた瞬間だけのDOM」も網にかかる
    try {
      if (!_spec && LANG !== "ja") {
        (window.__i18nMisses = window.__i18nMisses ?? new Set()).add(core.slice(0, 120));
      }
    } catch {}
    return s;
  }
  return m[1] + out + m[3];
}

// translate="no" が付いた要素の中は訳さない(HTML標準の属性)。
// 言語ピッカーの「日本語」を英訳してしまうと、間違えて選んだ人が母語を見つけられない
function noTranslate(node) {
  const el = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
  return el?.closest?.('[translate="no"]') != null;
}
// 自分が書いた訳文のノード別記録(2026-07-31)。
// 「2回目は translateText が同値を返すので収束する」という前提は**中国語で崩れる**:
// 中国語の訳は漢字を共有するため日本語辞書に再ヒットし、訳がさらに別の訳へ化ける
// (実測27件: 調合→合成→制作…)。MutationObserver が自分の書き換えに発火し続けて
// レンダラが無限ループした(9言語実機検査でzhが30分ハングした実犯)。
// 対策: ノードごとに「最後に自分が書いた値」を覚え、その値のままなら触らない。
// アプリが新しい文字列を書けば値が変わるので、通常の翻訳は今までどおり動く
const lastWritten = new WeakMap();
function translateNode(node) {
  if (noTranslate(node)) return;
  const cur = node.nodeValue;
  if (lastWritten.get(node) === cur) return; // 自分のこだま(翻訳済み)には触らない
  const t = translateText(cur);
  if (t !== cur) {
    lastWritten.set(node, t);
    node.nodeValue = t;
  }
}
const ATTRS = ["title", "placeholder"];
const lastWrittenAttrs = new WeakMap();
function translateElAttrs(el) {
  if (noTranslate(el)) return;
  for (const a of ATTRS) {
    const v = el.getAttribute?.(a);
    if (v && JP_RE.test(v)) {
      let rec = lastWrittenAttrs.get(el);
      if (rec?.[a] === v) continue; // 自分のこだま
      const t = translateText(v);
      if (t !== v) {
        if (!rec) lastWrittenAttrs.set(el, (rec = {}));
        rec[a] = t;
        el.setAttribute(a, t);
      }
    }
  }
}
function translateTree(root) {
  if (root.nodeType === Node.TEXT_NODE) return void translateNode(root);
  if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) return;
  translateElAttrs(root);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  while (walker.nextNode()) {
    const n = walker.currentNode;
    if (n.nodeType === Node.TEXT_NODE) translateNode(n);
    else translateElAttrs(n);
  }
}

// 日本語以外のとき: 既存DOMを一括翻訳し、以後の描画をMutationObserverで翻訳し続ける。
// 自分の書き換えで再度発火しても、2回目はtranslateTextが同値を返すので収束する
export function enableAutoTranslate() {
  if (LANG === "ja") return;
  translateTree(document.body);
  const obs = new MutationObserver((muts) => {
    for (const mu of muts) {
      if (mu.type === "characterData") translateNode(mu.target);
      else if (mu.type === "attributes") translateElAttrs(mu.target);
      else for (const n of mu.addedNodes) translateTree(n);
    }
  });
  obs.observe(document.body, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ATTRS,
  });
}

// 未翻訳の可視テキストを列挙する(開発用: 辞書の穴を潰すための検査)。
//
// 中国語のときだけ判定式が違う: JP_RE は漢字(一-鿿)を含むので、**正しく中国語に
// 訳した文まで「日本語が残っている」と誤検出する**(実測415件が全部これだった)。
// 中国語では日本語専用の**かな**だけを未翻訳の証拠として使う。
// 漢字だけの訳し漏れはこの検査では見えないので、そこは
// test/i18n-langs.test.mjs のカバレッジ検査(訳が全項目あるか)が受け持つ。
// 検査を2枚に分けて、それぞれが見える範囲を正直に担当させる形にしている。
export function scanUntranslated() {
  const leak = LANG === "zh" ? /[ぁ-んァ-ヶ]/ : JP_RE;
  const out = new Set();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  while (walker.nextNode()) {
    const n = walker.currentNode;
    if (noTranslate(n)) continue; // 言語ピッカーの言語名など、訳さないと決めたもの
    if (n.nodeType === Node.TEXT_NODE) {
      const t = (n.nodeValue ?? "").trim();
      if (t && leak.test(t)) out.add(t);
    } else {
      for (const a of ATTRS) {
        const v = n.getAttribute?.(a);
        if (v && leak.test(v)) out.add(`[${a}] ${v}`);
      }
    }
  }
  return [...out];
}

// ---- ②静的DOMの置換(日本語以外・起動時に1回)。index.htmlの固定ラベルが対象 ----
// 対象の判定はDICT_EN(=静的ラベルの一覧)、置換文はstaticForで言語ごとに引く。
// 「どれを訳すか」と「何に訳すか」を分けておくと、言語ファイルが未訳でも
// 英語に落ちるだけで、窓タイトルが日本語のまま残ることはない
export function translateStaticDom() {
  if (LANG === "ja") return;
  const to = (t) => staticFor(LANG, t) ?? DICT_EN[t];
  // テキストが辞書に完全一致する要素のテキストノードだけ差し替える(安全第一)
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const targets = [];
  while (walker.nextNode()) {
    const t = walker.currentNode.nodeValue?.trim();
    if (t && DICT_EN[t] && !noTranslate(walker.currentNode)) targets.push(walker.currentNode);
  }
  for (const node of targets) {
    const t = node.nodeValue.trim();
    node.nodeValue = node.nodeValue.replace(t, to(t));
  }
  // title属性も同様に
  for (const el of document.querySelectorAll("[title]")) {
    const t = el.getAttribute("title");
    if (t && DICT_EN[t] && !noTranslate(el)) el.setAttribute("title", to(t));
  }
}
