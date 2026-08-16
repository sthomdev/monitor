// 乱数まわりのユーティリティ。
// すべての抽選関数は rng(0以上1未満を返す関数)を引数に取り、テストから固定シードを注入できるようにする。

// ウェイト付き抽選。weights は {key: weight} の形。
export function weightedPick(weights, rng = Math.random) {
  const entries = Object.entries(weights);
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let roll = rng() * total;
  for (const [key, w] of entries) {
    roll -= w;
    if (roll < 0) return key;
  }
  return entries[entries.length - 1][0];
}

// min以上max以下の一様乱数
export function uniform(min, max, rng = Math.random) {
  return min + (max - min) * rng();
}

// テスト用の決定的な疑似乱数生成器(mulberry32)
export function seededRng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
