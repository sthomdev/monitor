const { app, BrowserWindow, screen, ipcMain, shell } = require("electron");
const path = require("path");

// 多重起動の防止(2026-08-12 Haru報告「窓を閉じても後ろのアプリが触れない/
// タスクバー一覧にTASMONが何個も増えていく」)。原因はrequestSingleInstanceLock
// が一度も呼ばれておらず、起動するたびに完全に独立したプロセス+ウィンドウが
// 増えていたこと。「閉じる」操作は今フォーカスしているそのプロセスだけを
// 終了させるので、他の古いインスタンスはバーの裏に残ったまま気付かれずに
// 溜まっていく(=多重起動そのものが「閉じても消えない」に見えていた実犯)。
// app.whenReady()より前、他の何より先にロックを取る必要がある(取れなければ
// 即座にこのプロセスを終了し、ウィンドウを一切作らない)
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  // app.quit()は非同期の要求でしかなく、この下のapp.whenReady().then(createWindow)を
  // 止める保証が無い(呼んだ直後もスクリプトは最後まで実行され続ける)。取れなかった
  // 側は即座にプロセスを終了させ、ウィンドウを作る余地そのものを断つ
  app.quit();
  process.exit(0);
}
app.on("second-instance", () => {
  // 2つ目の起動が来たら、新しいウィンドウを作らず既存のものを前面へ
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
});

// Steamオーバーレイ(Shift+Tab)対応(2026-08-12 Steam審査Caution「オーバーレイが
// 出ない」)。原因はElectronの既定アーキテクチャ: 実際に画面へPresentするのは
// メインプロセスとは別の「GPUプロセス」で、SteamのオーバーレイDLLはSteamが
// 起動を認識したプロセスへフックする。GPU描画が別プロセスに分かれていると、
// フック対象と実際にPresentする場所がズレてオーバーレイが描画されない
// (Electron製ゲームでSteamオーバーレイが出ない、として広く知られる原因)。
// `in-process-gpu` でGPU処理をメインプロセス内に統合し、`disable-gpu-sandbox`で
// そのプロセスへのフック(DLL注入)を妨げるサンドボックスを外す。この2つが
// Electron+Steamworks組み合わせでの定番の対処。app.whenReady()より前(=どの
// BrowserWindowが作られるより前)に設定する必要がある
// 注意: 実機(実際のSteamクライアント経由の起動)でしか検証できないため、
// 次のビルドでHaruに実機確認をお願いすること
app.commandLine.appendSwitch("in-process-gpu");
app.commandLine.appendSwitch("disable-gpu-sandbox");

// バーは画面いっぱいに広げる(TBHと同じ)。ウィンドウは バトル|英雄|その他… と横に並ぶ
const BAR_WIDTH = null; // null = workArea.width を使う
// バーは薄いHUD(ステージ/GP/タブ)のみ。バトルは正方形ウィンドウとして上に開く
const BAR_HEIGHT = 90; // 2026-07-08: バーを厚く(64→90)
// ウィンドウの高さ = ワークエリア全高(2026-08-01 友人テストFB「画面の拡大機能が
// 実装されてない」の実犯修正)。旧660px固定では表示サイズ115%ですら縦の
// fits() 検査に落ち、拡大候補が全部スキップ=拡大機能が事実上死んでいた。
// 実行中のリサイズは透明ウィンドウで失敗する(旧不具合)ので、**最初から全高**で
// 作り、ゲームの中身は従来どおり下端アンカー・空き部分はクリック透過に任せる
const EXPANDED_HEIGHT = null; // null = workArea.height

let mainWindow = null;

// 検証モード(--tbm-dev)をパッケージ版でも受け付けるか(2026-08-04 Haru指示
// 「リリースまで検証したいから最終盤になるまでは残しておいていい」)。
// true の間は zNNN zip の exe でも従来どおり検証パネルが開く。
// **リリースビルドを作る前に必ず false にする**(DLC_STOREFRONT_ENABLED を true に
// 戻すのと同じタイミング。タスク#158)。false にすると、プレイヤーが自分で
// `TaskbarMonsters.exe --tbm-dev` と打っても何も起きなくなる(引数名は asar から
// 誰でも読めるので、隠すのではなく受け付けない、が唯一の防御)
// 2026-08-12 Haru指示「検証用コマンド削除」でfalseへ切り替え(最終盤)
// →同日、Haru指示「検証用に検証用コード復活させて」でtrueへ再切り替え。
// **本当のリリースビルド(Steamworksへアップロードする版)を作る前には
// 必ずfalseへ戻すこと**(タスク#158)。
// DLC_STORE_APPROVED(ui.js、旧DLC_STOREFRONT_ENABLED)は「個別のDLCが承認
// され次第」そのidを足す方式のため、この定数とは別タイミングで管理する
// (2026-08-12: 5件中プレミアムパス/蒼のガラスの2件が承認済みで復帰済み。
// 残り3件は審査継続中なので、その3件だけ未承認として引き続き隠す)
const DEV_ARG_ALLOWED_IN_PACKAGED = false;

function createWindow() {
  const { workArea } = screen.getPrimaryDisplay();

  // タスクバーのすぐ上に配置。高さは最初から EXPANDED_HEIGHT で固定し、
  // ウィンドウのない透明部分は setIgnoreMouseEvents でクリックを下へ通す。
  // (高さをその場で伸縮させる方式は、Windowsの透明ウィンドウで
  //  リサイズ失敗=バーしか出ない/黒い矩形が残る、という不具合があった)
  const width = BAR_WIDTH ?? workArea.width;
  const height = EXPANDED_HEIGHT ?? workArea.height;
  const win = new BrowserWindow({
    width,
    height,
    x: workArea.x + Math.floor((workArea.width - width) / 2),
    y: workArea.y + workArea.height - height,
    frame: false,
    transparent: true,
    backgroundColor: "#00000000", // Windowsで透明合成が黒く残るのを防ぐ(明示が必要)
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      // 放置ゲームの生命線: 他ウィンドウに完全に隠れてもタイマーを絞らせない
      // (Chromiumは隠れたページのsetIntervalを毎分1回まで節流し、戦闘が事実上止まる)
      backgroundThrottling: false,
      // 検証モードの引き渡し(2026-07-29 FB「Ctrl+Shift+Dしてもポータルに出ない」)。
      // --tbm-dev は**mainプロセスの引数**で、preload の process.argv には自動では
      // 乗らない(乗るかはChromiumのプロセス方式次第で、当てにできない)。
      // additionalArguments が「レンダラのargvに確実に足す」ための正規の口
      // リリース版では引数を受け付けない(スイッチはファイル冒頭の
      // DEV_ARG_ALLOWED_IN_PACKAGED。経緯と切り替え時期はそちらのコメント参照)
      additionalArguments:
        (!app.isPackaged || DEV_ARG_ALLOWED_IN_PACKAGED) &&
        (process.argv.includes("--tbm-dev") || process.env.TBM_DEV)
          ? ["--tbm-dev"]
          : [],
    },
  });

  win.loadFile(path.join(__dirname, "src", "index.html"));
  // 開発起動(npm start)時のみ: レンダラのconsole/クラッシュをメインのstdoutへ転送(診断用)
  if (!app.isPackaged) {
    win.webContents.on("console-message", (_e, level, message, line, sourceId) => {
      console.log(`[renderer:${level}] ${message} (${(sourceId || "").split("/").pop()}:${line})`);
    });
    win.webContents.on("render-process-gone", (_e, d) => console.log(`[render-gone] ${JSON.stringify(d)}`));
    win.webContents.on("did-fail-load", (_e, c, desc, url) => console.log(`[did-fail-load] ${c} ${desc} ${url}`));
    win.webContents.on("preload-error", (_e, p, err) => console.log(`[preload-error] ${p} ${err}`));
  }
  mainWindow = win;
  return win;
}

// ---- 撮影モード(2026-07-22 広報用) ----
// TBM_SHOT_DIR が設定されていると、通常起動の代わりに 1920x1080 の撮影窓を開き、
// TBM_SHOT_SCENES(JSON)のシーンを順に実行して capturePage でPNGを保存し、終了する。
// ストア用スクショ/GIF素材を毎週の広報キットで機械的に再生成するための恒久装置。
//   シーン: { name, js, wait, frames?, fps? } — frames>1 なら連写(GIF素材)
//   TBM_SHOT_SAVE: 事前生成したショーケースセーブ(JSON)を localStorage に注入
async function runShotMode() {
  const fs = require("fs");
  const dir = process.env.TBM_SHOT_DIR;
  const scenes = JSON.parse(fs.readFileSync(process.env.TBM_SHOT_SCENES, "utf8"));
  const saveJson = process.env.TBM_SHOT_SAVE
    ? fs.readFileSync(process.env.TBM_SHOT_SAVE, "utf8")
    : null;
  fs.mkdirSync(dir, { recursive: true });

  const win = new BrowserWindow({
    width: 1920,
    height: 1080,
    useContentSize: true, // width/height を「中身」の寸法にする(枠ぶんで1080→1032に痩せる事故を防ぐ 2026-07-24)
    frame: false,
    transparent: false,
    backgroundColor: "#0d1020",
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
    },
  });
  const loaded = () => new Promise((r) => win.webContents.once("did-finish-load", r));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const js = (code) => win.webContents.executeJavaScript(code, true).catch((e) => console.log("[shot-js]", e.message));

  win.loadFile(path.join(__dirname, "src", "index.html"));
  await loaded();
  if (saveJson) {
    // 注入→旧ページのsetItemを封殺→reload。封殺しないと、旧ページの自動保存(5秒毎)や
    // アンロード時保存が注入直後に走り、古いセーブで上書きし返すレースが起きる(実測)
    await js(
      `localStorage.setItem("taskbar-idle-rpg-save", ${JSON.stringify(saveJson)});` +
      `localStorage.setItem = function(){};` +
      `location.reload();`,
    );
    await loaded();
  }
  await sleep(3000); // スプライトPNGの読み込み待ち
  // 撮影窓はデスクトップに置かれた見立て: 透明部分に壁紙風のグラデーションを敷く
  await js(`document.body.style.background = "linear-gradient(160deg,#1a2038 0%,#232a4a 45%,#2c3050 100%)";`);
  // ゲームUIは下端660pxに固定なので、1080pxの枠を活かすよう拡大して撮る
  // (660×1.6=1056 ≒ ほぼ全面。ドット絵なので拡大しても破綻しない)
  win.webContents.setZoomFactor(Number(process.env.TBM_SHOT_ZOOM ?? 1.6));
  await sleep(400);

  for (const scene of scenes) {
    console.log(`[shot] ${scene.name}`);
    if (scene.js) await js(scene.js);
    await sleep(scene.wait ?? 800);
    const frames = scene.frames ?? 1;
    const interval = 1000 / (scene.fps ?? 6);
    if (frames === 1) {
      const img = await win.webContents.capturePage();
      fs.writeFileSync(path.join(dir, `${scene.name}.png`), img.toPNG());
    } else {
      const fdir = path.join(dir, scene.name);
      fs.mkdirSync(fdir, { recursive: true });
      for (let f = 0; f < frames; f++) {
        const t0 = Date.now();
        const img = await win.webContents.capturePage();
        fs.writeFileSync(path.join(fdir, `f${String(f).padStart(3, "0")}.png`), img.toPNG());
        const spent = Date.now() - t0;
        if (spent < interval) await sleep(interval - spent);
      }
    }
  }
  console.log("[shot] done");
  app.quit();
}

app.whenReady().then(() => {
  if (process.env.TBM_SHOT_DIR) {
    runShotMode();
    return;
  }
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// ---- Steam(DLCの所有判定) 2026-07-28 ----
// handle(非同期)で答える。sendSync にすると、このハンドラを登録していない
// 入口(撮影ツールなど別のmainプロセス)から preload が読まれたときに
// 起動ごと固まる。invoke なら向こうで reject されて先へ進める。
// Steamが無い環境では steam-bridge が全部 false を返すので、ここは何も分岐しない
const steamBridge = require("./steam-bridge.js");
ipcMain.handle("steam:owned-dlc", () => ({
  owned: steamBridge.ownedDlcMap(),
  status: steamBridge.status(),
}));

ipcMain.on("app:quit", () => app.quit());
// 既定ブラウザで外部URLを開く(https限定。交易船→Steamの導線 2026-07-17)
ipcMain.on("app:open-external", (_ev, url) => {
  if (typeof url === "string" && /^https:\/\//.test(url)) shell.openExternal(url);
});
ipcMain.on("app:minimize", () => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) win.minimize();
});

// 高さは常に EXPANDED_HEIGHT 固定になったため、パネル開閉のIPCは互換のため受けるだけ
ipcMain.on("panel:open", () => {});
ipcMain.on("panel:close", () => {});

// 透明部分のクリック素通し(2026-08-01 全面刷新)。
// 旧方式: レンダラがmousemoveで判定→IPCでignore切替。ignore中の検知は
// setIgnoreMouseEvents(true,{forward:true}) のイベント転送頼みだった。
// **このforwardはWindowsの透明窓で不安定**(DevTools接続でも壊れる既知問題)で、
// 一度ignoreに入ると復帰できず「画面の上半分で何も押せない/窓をドラッグで
// 上半分に持っていけない」の実犯だった(実マウス入力で再現・イベント到達0件を実測)。
// 新方式: レンダラはUI矩形を送るだけ。**メインがカーソル座標を直接ポーリング**して
// ヒットテストする=転送に一切依存しない。
let uiRects = []; // レンダラ報告のUI矩形(ウィンドウ内DIP座標)
let uiFullInteractive = false; // 全画面オーバーレイ表示中は全域を受ける
ipcMain.on("ui:rects", (_ev, payload) => {
  uiRects = Array.isArray(payload?.rects) ? payload.rects : [];
  uiFullInteractive = !!payload?.full;
});
let mouseIgnored = false;
setInterval(() => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const pt = screen.getCursorScreenPoint();
  const b = mainWindow.getBounds();
  const x = pt.x - b.x;
  const y = pt.y - b.y;
  const overUi =
    uiFullInteractive ||
    uiRects.some((r) => x >= r.l - 4 && x <= r.r + 4 && y >= r.t - 4 && y <= r.b + 4);
  const ignore = !overUi;
  if (ignore === mouseIgnored) return;
  mouseIgnored = ignore;
  // forward:true は使わない(2026-08-03 FB「戦闘画面がカク付く」対策)。
  // Windowsではforward指定が低レベルマウスフック(WH_MOUSE_LL級)を張り、マウスを
  // 動かすたびに処理が走って描画がカクつく既知問題がある。判定はメイン側の
  // このポーリングが担うので、透過中にレンダラへイベントを転送する必要はない
  if (ignore) mainWindow.setIgnoreMouseEvents(true);
  else mainWindow.setIgnoreMouseEvents(false);
}, 60);
// 互換: 旧IPCは受けるだけ(何もしない)
ipcMain.on("mouse:ignore", () => {});

// 常に最前面(2026-08-12 Haru指示「常にモニターの最前線に固定できる設定」)。
// ⚙メニューのトグルから呼ぶ。"screen-saver"レベルはWindowsのタスクバーより
// 上に固定され、他アプリを前面に持ってきても隠れない(実際のOSタスクバーと
// 同じ張り付き方)。既定はOFF(state.settings.alwaysOnTopがtrueの人だけ、
// レンダラの起動処理がこのIPCを呼んで復元する)
ipcMain.on("win:alwaystop", (_ev, on) => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.setAlwaysOnTop(!!on, "screen-saver");
});

app.on("window-all-closed", () => {
  app.quit();
});
