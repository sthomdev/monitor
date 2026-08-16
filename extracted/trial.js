// 試用期間システム(2026-07-22 Haru指示)。
//
// 週次サイクル(曜日は TRIAL_SCHEDULE が単一の真実):
//   日曜締切 … その週の目安箱の投稿はここまでが次回アップデートの検討対象
//   月曜決定 … 締切までの声からアップデート内容を決める(開発側の作業)
//   水曜実装 … 週次ビルドで「試用」として実装(TRIALSに登録して出荷)
//   試用1週間 … 水曜→翌火曜。目安箱で採用/不採用の投票を受け付ける
//   翌週の週次ビルド … 採用は本実装(status:"adopted")、不採用は削除
//     (status:"rejected"にして中身のデータも消す。所持済みの実体は
//      reapRejectedTrials が補償つきで回収する)
//
// マーケット保護: 試用中(=まだ採用が確定していない)のコンテンツ由来の
// 装備/タスモンは出品できない。不採用で消えるものが市場でお金に変わると
// 削除できなくなる(既存種は削除不可の恒久ルールに巻き込まれる)ため、
// 「採用が確定するまで市場に触れさせない」が絶対条件。
// タグ付けの決まり: 試用で追加した装備ブループリントは item.trialId、
// 試用で追加した種族は SPECIES[id].trialId に試用IDを入れて生成する。

// 曜日は 0=日曜 … 6=土曜(Date#getDay と同じ)
export const TRIAL_SCHEDULE = Object.freeze({
  deadlineDow: 0, // 締切: 日曜(その日の23:59まで)
  releaseDow: 3, // 実装: 水曜(週次ビルド)
  trialDays: 7, // 試用期間: 実装から1週間
});

// 試用サイクルの開始日 = 製品リリース日(2026-08-10)。
// これより前は「次の締切: 7/26(日)」のような**発売前の日付**が出てしまい、
// ストア審査ビルドとして意味不明になる(2026-07-26 FB「リリースしてからの実装なのに
// 次の締め切りが7/26で入ってる」)。リリース前は具体日付を出さず「リリース後に開始」と言う
export const TRIAL_CYCLE_START = new Date(2026, 7, 10).getTime(); // 2026-08-10 00:00 ローカル
export function trialCycleStarted(now = Date.now()) {
  return now >= TRIAL_CYCLE_START;
}

// 試用中/判定済みのコンテンツ一覧。週次ビルドがここを書き換える。
//   { id, name, desc, kind, startAt(epoch ms), marketSensitive, status }
//   status: "trial"(試用中) | "adopted"(採用=本実装) | "rejected"(不採用=削除済み)
// 採用が決まったら status を "adopted" にし、コンテンツ側の trialId タグを外す。
// 不採用は status を "rejected" にし、コンテンツのデータ定義も削除する
// (実体の回収は reapRejectedTrials)。エントリ自体は消さない=投票の記録と
// reap の対象判定に使うため、恒久に残す。
export const TRIALS = Object.freeze([
  // リリース後の最初の週次アップデートから運用開始。例:
  // { id: "w33-newspecies", name: "新種族「◯◯」", desc: "…", kind: "species",
  //   startAt: Date.UTC(2026, 7, 12), marketSensitive: true, status: "trial" },
]);

const DAY_MS = 24 * 60 * 60 * 1000;

export function trialOf(id, trials = TRIALS) {
  return trials.find((t) => t.id === id) ?? null;
}

// 試用中(投票受付中)の一覧。startAt〜startAt+trialDays のあいだが投票期間。
// 期間を過ぎても status が "trial" のままなら「集計中」(votingOpen=false)
export function activeTrials(now = Date.now(), trials = TRIALS) {
  return trials.filter((t) => t.status === "trial");
}

export function votingOpen(trial, now = Date.now()) {
  if (!trial || trial.status !== "trial") return false;
  return now >= trial.startAt && now < trial.startAt + TRIAL_SCHEDULE.trialDays * DAY_MS;
}

// 試用の残り時間(表示用)。負なら集計中
export function trialRemainMs(trial, now = Date.now()) {
  return trial.startAt + TRIAL_SCHEDULE.trialDays * DAY_MS - now;
}

// 次の締切(日曜23:59:59)と次の実装日(水曜)。目安箱のスケジュール表示用
export function nextDeadline(now = Date.now()) {
  const d = new Date(now);
  d.setHours(23, 59, 59, 999);
  const diff = (TRIAL_SCHEDULE.deadlineDow - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + diff);
  return d.getTime();
}
export function nextRelease(now = Date.now()) {
  const d = new Date(now);
  d.setHours(12, 0, 0, 0); // 実装は水曜の日中(厳密な時刻は運用側の都合で前後する)
  let diff = (TRIAL_SCHEDULE.releaseDow - d.getDay() + 7) % 7;
  if (diff === 0 && d.getTime() <= now) diff = 7;
  d.setDate(d.getDate() + diff);
  return d.getTime();
}

// ---- マーケット保護 ----
// trialId つきのコンテンツが出品できるのは、その試用が「採用」になった後だけ。
// 不採用(rejected)や登録が見つからない trialId も安全側に倒して出品不可
// (未知のID=まだ配信されていない/巻き戻しされた試用の可能性)
export function trialListBlockReason(trialId, trials = TRIALS) {
  if (!trialId) return null;
  const t = trialOf(trialId, trials);
  if (t && t.status === "adopted") return null;
  if (t && t.status === "rejected") return "不採用になった試用コンテンツ(次の週次アップデートで回収される)";
  return "🧪 試用期間中は出品できない(採用が決まったら解禁)";
}

// ---- 不採用コンテンツの回収(補償つき) ----
// 週次ビルドで status が "rejected" になった試用の実体を、セーブから回収して
// ゴールドに変える。装備は所持/倉庫/装備中/積み荷の全経路、タスモンは
// タスモン(パーティ含む)から。補償は「気前よく」が原則(経済は緩める方向にしか
// 動かせない恒久ルール。試用に付き合ってくれた人が損をしたと感じたら二度と
// 試用に参加してくれない)。
export const TRIAL_REFUND_ITEM_GOLD = 200_000; // 装備1個あたりの補償
export const TRIAL_REFUND_MON_GOLD = 500_000; // タスモン1体あたりの補償

export function reapRejectedTrials(state, trials = TRIALS) {
  const rejected = new Set(trials.filter((t) => t.status === "rejected").map((t) => t.id));
  if (rejected.size === 0) return { items: 0, mons: 0, gold: 0 };
  let items = 0;
  let mons = 0;
  const isRej = (x) => x && x.trialId && rejected.has(x.trialId);

  // 装備: 持ち物/倉庫/交易船の積み荷
  for (const key of ["items", "storage", "tradeShip"]) {
    const arr = state[key] ?? [];
    const keep = arr.filter((it) => !isRej(it));
    items += arr.length - keep.length;
    state[key] = keep;
  }
  // 装備中(タスモンの equipment)
  for (const mon of Object.values(state.monsters ?? {})) {
    const eq = mon.equipment ?? [];
    const keep = eq.filter((it) => !isRej(it));
    items += eq.length - keep.length;
    mon.equipment = keep;
  }
  // タスモン: 種族が不採用(SPECIESの定義ごと消えるため、残すとセーブが壊れる)。
  // mon.trialId は孵化時に種族から写して保存してある(定義が消えた後でも判定できるように)
  for (const [id, mon] of Object.entries(state.monsters ?? {})) {
    if (!isRej(mon)) continue;
    // 装備は外して返す
    state.items.push(...(mon.equipment ?? []));
    delete state.monsters[id];
    state.party = (state.party ?? []).filter((x) => x !== id);
    mons += 1;
  }
  const gold = items * TRIAL_REFUND_ITEM_GOLD + mons * TRIAL_REFUND_MON_GOLD;
  state.gold = (state.gold ?? 0) + gold;
  return { items, mons, gold };
}
