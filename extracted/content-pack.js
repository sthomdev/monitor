// ============================================================================
// 自動生成コンテンツパック(週次/隔週アップデートの追記先)。
// data.js が SKILLS/SPECIES/HATCH_TABLE/PERKS/JOBS/DIFFICULTIES/スフィア盤/
// レベル上限/報酬係数に、equipment.js が固有装備プールにマージする。
// 追記は tools/weekly-content.js(週次) / tools/biweekly-update.js(隔週) が行う(手書き可)。
// 値は素の文字列ID(data.js/equipment.js を import しない=循環参照なし)。
// スプライトは src/assets/monsters/<id>.png を置けば自動で本画像に差し替わる。
// ============================================================================

export const EXTRA_SKILLS = {
  "emberimpact": {
    "id": "emberimpact",
    "name": "エンバーインパクト",
    "active": {
      "type": "nuke",
      "fx": "shot",
      "power": 4.3,
      "color": "#ff6a2a"
    },
    "cooldown": 5,
    "passive": {
      "atkMult": 1.09
    },
    "desc": "5秒ごと: 敵に 攻撃×4.3 / 攻撃 +9%"
  },
  "rockblast": {
    "id": "rockblast",
    "name": "ロックブラスト",
    "active": {
      "type": "nuke",
      "fx": "nova",
      "power": 4.3,
      "color": "#c08038"
    },
    "cooldown": 5,
    "passive": {
      "atkMult": 1.09
    },
    "desc": "5秒ごと: 敵に 攻撃×4.3 / 攻撃 +9%"
  },
  "rubyslimewall": {
    "id": "rubyslimewall",
    "name": "シンダーバリア",
    "active": {
      "type": "guard",
      "power": 0.35,
      "duration": 4,
      "color": "#ff6a2a"
    },
    "cooldown": 9,
    "passive": {
      "hpMult": 1.12
    },
    "desc": "9秒ごと: 4秒間 かばう(被ダメ -35%) / 最大HP +12%"
  },
  "bluefinstrike": {
    "id": "bluefinstrike",
    "name": "アクアブラスト",
    "active": {
      "type": "nuke",
      "fx": "slash",
      "power": 3.3,
      "color": "#5bc0eb"
    },
    "cooldown": 6,
    "passive": {
      "atkMult": 1.07
    },
    "desc": "6秒ごと: 敵に 攻撃×3.3 / 攻撃 +7%"
  },
  "cloudpuffrally": {
    "id": "cloudpuffrally",
    "name": "ストームラリー",
    "active": {
      "type": "buff",
      "power": 0.12,
      "duration": 5,
      "color": "#8ae08a"
    },
    "cooldown": 8,
    "passive": {
      "atkMult": 1.06
    },
    "desc": "8秒ごと: 5秒間 パーティ攻撃 +12% / 攻撃 +6%"
  },
  "barkbeetlewall": {
    "id": "barkbeetlewall",
    "name": "ロックウォール",
    "active": {
      "type": "guard",
      "power": 0.35,
      "duration": 4,
      "color": "#c08038"
    },
    "cooldown": 9,
    "passive": {
      "hpMult": 1.12
    },
    "desc": "9秒ごと: 4秒間 かばう(被ダメ -35%) / 最大HP +12%"
  },
  "shadeorbstrike": {
    "id": "shadeorbstrike",
    "name": "ヴォイドブラスト",
    "active": {
      "type": "nuke",
      "fx": "nova",
      "power": 3.3,
      "color": "#b57bff"
    },
    "cooldown": 6,
    "passive": {
      "atkMult": 1.07
    },
    "desc": "6秒ごと: 敵に 攻撃×3.3 / 攻撃 +7%"
  },
  "glowmothmend": {
    "id": "glowmothmend",
    "name": "シャインヒール",
    "active": {
      "type": "heal",
      "power": 0.11,
      "color": "#ffe066"
    },
    "cooldown": 7,
    "passive": {
      "hpMult": 1.1
    },
    "desc": "7秒ごと: パーティHPを 11% 回復 / 最大HP +10%"
  },
  "flamewispstrike": {
    "id": "flamewispstrike",
    "name": "パイロストライク",
    "active": {
      "type": "nuke",
      "fx": "slash",
      "power": 3.3,
      "color": "#ff6a2a"
    },
    "cooldown": 6,
    "passive": {
      "atkMult": 1.07
    },
    "desc": "6秒ごと: 敵に 攻撃×3.3 / 攻撃 +7%"
  },
  "dewdropmend": {
    "id": "dewdropmend",
    "name": "タイドリカバー",
    "active": {
      "type": "heal",
      "power": 0.11,
      "color": "#5bc0eb"
    },
    "cooldown": 7,
    "passive": {
      "hpMult": 1.1
    },
    "desc": "7秒ごと: パーティHPを 11% 回復 / 最大HP +10%"
  },
  "boneskullwall": {
    "id": "boneskullwall",
    "name": "ダスクシールド",
    "active": {
      "type": "guard",
      "power": 0.35,
      "duration": 4,
      "color": "#b57bff"
    },
    "cooldown": 9,
    "passive": {
      "hpMult": 1.12
    },
    "desc": "9秒ごと: 4秒間 かばう(被ダメ -35%) / 最大HP +12%"
  },
  "pondturtlewall": {
    "id": "pondturtlewall",
    "name": "タイドウォール",
    "active": {
      "type": "guard",
      "power": 0.35,
      "duration": 4,
      "color": "#5bc0eb"
    },
    "cooldown": 9,
    "passive": {
      "hpMult": 1.12
    },
    "desc": "9秒ごと: 4秒間 かばう(被ダメ -35%) / 最大HP +12%"
  },
  "nightbatstrike": {
    "id": "nightbatstrike",
    "name": "ヴォイドインパクト",
    "active": {
      "type": "nuke",
      "fx": "slash",
      "power": 3.3,
      "color": "#b57bff"
    },
    "cooldown": 6,
    "passive": {
      "atkMult": 1.07
    },
    "desc": "6秒ごと: 敵に 攻撃×3.3 / 攻撃 +7%"
  },
  "cinderdrakestrike": {
    "id": "cinderdrakestrike",
    "name": "エンバーブラスト",
    "active": {
      "type": "nuke",
      "fx": "shot",
      "power": 3.3,
      "color": "#ff6a2a"
    },
    "cooldown": 6,
    "passive": {
      "atkMult": 1.07
    },
    "desc": "6秒ごと: 敵に 攻撃×3.3 / 攻撃 +7%"
  },
  "sproutpotmend": {
    "id": "sproutpotmend",
    "name": "クレイリカバー",
    "active": {
      "type": "heal",
      "power": 0.11,
      "color": "#c08038"
    },
    "cooldown": 7,
    "passive": {
      "hpMult": 1.1
    },
    "desc": "7秒ごと: パーティHPを 11% 回復 / 最大HP +10%"
  },
  "paleflamerally": {
    "id": "paleflamerally",
    "name": "オーラブースト",
    "active": {
      "type": "buff",
      "power": 0.12,
      "duration": 5,
      "color": "#ffe066"
    },
    "cooldown": 8,
    "passive": {
      "atkMult": 1.06
    },
    "desc": "8秒ごと: 5秒間 パーティ攻撃 +12% / 攻撃 +6%"
  },
  "leafghoststrike": {
    "id": "leafghoststrike",
    "name": "スカイブラスト",
    "active": {
      "type": "nuke",
      "fx": "beam",
      "power": 3.3,
      "color": "#8ae08a"
    },
    "cooldown": 6,
    "passive": {
      "atkMult": 1.07
    },
    "desc": "6秒ごと: 敵に 攻撃×3.3 / 攻撃 +7%"
  },
  "rockgolemwall": {
    "id": "rockgolemwall",
    "name": "クレイバリア",
    "active": {
      "type": "guard",
      "power": 0.35,
      "duration": 4,
      "color": "#c08038"
    },
    "cooldown": 9,
    "passive": {
      "hpMult": 1.12
    },
    "desc": "9秒ごと: 4秒間 かばう(被ダメ -35%) / 最大HP +12%",
    "tiers": [
      {"name":"クレイバリア","power":0.1,"cooldown":8,"desc":"8秒ごと: 最大HP×10% のバリアを張る(先に被ダメを吸収) / 最大HP +12%"},
      {"name":"クレイバリア・改","power":0.1,"cooldown":8,"desc":"8秒ごと: 最大HP×10% のバリアを張る(先に被ダメを吸収) / 最大HP +12%","passiveBoost":0.03},
      {"name":"クレイバリア・皆伝","power":0.1,"cooldown":8,"desc":"8秒ごと: 最大HP×10% のバリアを張る(先に被ダメを吸収) / 最大HP +12%","passiveBoost":0.07},
    ],
    "signature": true
  },
  "whitepixiemend": {
    "id": "whitepixiemend",
    "name": "オーラヒール",
    "active": {
      "type": "heal",
      "power": 0.11,
      "color": "#ffe066"
    },
    "cooldown": 7,
    "passive": {
      "hpMult": 1.1
    },
    "desc": "7秒ごと: パーティHPを 11% 回復 / 最大HP +10%"
  },
  "salamanderstrike": {
    "id": "salamanderstrike",
    "name": "パイロストライク2",
    "active": {
      "type": "nuke",
      "fx": "beam",
      "power": 3.3,
      "color": "#ff6a2a"
    },
    "cooldown": 6,
    "passive": {
      "atkMult": 1.07
    },
    "desc": "6秒ごと: 敵に 攻撃×3.3 / 攻撃 +7%"
  },
  "aquafrogwall": {
    "id": "aquafrogwall",
    "name": "タイドバリア",
    "active": {
      "type": "guard",
      "power": 0.35,
      "duration": 4,
      "color": "#5bc0eb"
    },
    "cooldown": 9,
    "passive": {
      "hpMult": 1.12
    },
    "desc": "9秒ごと: 4秒間 かばう(被ダメ -35%) / 最大HP +12%"
  },
  "pinkslimemend": {
    "id": "pinkslimemend",
    "name": "シャインメンド",
    "active": {
      "type": "heal",
      "power": 0.11,
      "color": "#ffe066"
    },
    "cooldown": 7,
    "passive": {
      "hpMult": 1.1
    },
    "desc": "7秒ごと: パーティHPを 11% 回復 / 最大HP +10%",
    "tiers": [
      {"name":"シャインメンド","power":0.09,"cooldown":6,"desc":"6秒ごと: パーティHPを 9% 回復 / 最大HP +10%"},
      {"name":"シャインメンド・改","power":0.11,"cooldown":5,"desc":"5秒ごと: パーティHPを 11% 回復 / 最大HP +10%"},
      {"name":"シャインメンド・皆伝","power":0.13,"cooldown":5,"desc":"5秒ごと: パーティHPを 13% 回復 / 最大HP +10%"},
    ],
    "signature": true
  },
  "honeyslimerally": {
    "id": "honeyslimerally",
    "name": "ストーンチアー",
    "active": {
      "type": "buff",
      "power": 0.12,
      "duration": 5,
      "color": "#c08038"
    },
    "cooldown": 8,
    "passive": {
      "atkMult": 1.06
    },
    "desc": "8秒ごと: 5秒間 パーティ攻撃 +12% / 攻撃 +6%"
  },
  "bonedrakestrike": {
    "id": "bonedrakestrike",
    "name": "パイロブラスト",
    "active": {
      "type": "nuke",
      "fx": "beam",
      "power": 4.3,
      "color": "#ff6a2a"
    },
    "cooldown": 5,
    "passive": {
      "atkMult": 1.09
    },
    "desc": "5秒ごと: 敵に 攻撃×4.3 / 攻撃 +9%"
  },
  "mistwhalewall": {
    "id": "mistwhalewall",
    "name": "フロストシールド",
    "active": {
      "type": "guard",
      "power": 0.37,
      "duration": 4,
      "color": "#5bc0eb"
    },
    "cooldown": 8,
    "passive": {
      "hpMult": 1.14
    },
    "desc": "8秒ごと: 4秒間 かばう(被ダメ -37%) / 最大HP +14%"
  },
  "sylphdrakerally": {
    "id": "sylphdrakerally",
    "name": "スカイチアー",
    "active": {
      "type": "buff",
      "power": 0.14,
      "duration": 5,
      "color": "#8ae08a"
    },
    "cooldown": 7,
    "passive": {
      "atkMult": 1.07
    },
    "desc": "7秒ごと: 5秒間 パーティ攻撃 +14% / 攻撃 +7%",
    "tiers": [
      {"name":"スカイチアー","power":0.18,"cooldown":9,"desc":"9秒ごと: 5秒間 パーティ攻撃 +18% / 攻撃 +7%"},
      {"name":"スカイチアー・改","power":0.21,"cooldown":8,"desc":"8秒ごと: 5秒間 パーティ攻撃 +21% / 攻撃 +7%"},
      {"name":"スカイチアー・皆伝","power":0.24,"cooldown":8,"desc":"8秒ごと: 5秒間 パーティ攻撃 +24% / 攻撃 +7%"},
    ],
    "signature": true
  },
  "shinepotmend": {
    "id": "shinepotmend",
    "name": "オーラリジェネ",
    "active": {
      "type": "heal",
      "power": 0.13,
      "color": "#ffe066"
    },
    "cooldown": 6,
    "passive": {
      "hpMult": 1.12
    },
    "desc": "6秒ごと: パーティHPを 13% 回復 / 最大HP +12%"
  },
  "duskwyvernstrike": {
    "id": "duskwyvernstrike",
    "name": "ダスクインパクト",
    "active": {
      "type": "nuke",
      "fx": "slash",
      "power": 4.3,
      "color": "#b57bff"
    },
    "cooldown": 5,
    "passive": {
      "atkMult": 1.09
    },
    "desc": "5秒ごと: 敵に 攻撃×4.3 / 攻撃 +9%"
  },
  "coilserpentstrike": {
    "id": "coilserpentstrike",
    "name": "タイドブラスト",
    "active": {
      "type": "nuke",
      "fx": "beam",
      "power": 4.3,
      "color": "#5bc0eb"
    },
    "cooldown": 5,
    "passive": {
      "atkMult": 1.09
    },
    "desc": "5秒ごと: 敵に 攻撃×4.3 / 攻撃 +9%"
  },
  "ribbonbatrally": {
    "id": "ribbonbatrally",
    "name": "ヴォイドラリー",
    "active": {
      "type": "buff",
      "power": 0.14,
      "duration": 5,
      "color": "#b57bff"
    },
    "cooldown": 7,
    "passive": {
      "atkMult": 1.07
    },
    "desc": "7秒ごと: 5秒間 パーティ攻撃 +14% / 攻撃 +7%"
  },
  "emberfoxrally": {
    "id": "emberfoxrally",
    "name": "シンダーエンチャント",
    "active": {
      "type": "buff",
      "power": 0.14,
      "duration": 5,
      "color": "#ff6a2a"
    },
    "cooldown": 7,
    "passive": {
      "atkMult": 1.07
    },
    "desc": "7秒ごと: 5秒間 パーティ攻撃 +14% / 攻撃 +7%"
  },
  "soulflamestrike": {
    "id": "soulflamestrike",
    "name": "ダスクスラッシュ",
    "active": {
      "type": "nuke",
      "fx": "nova",
      "power": 4.3,
      "color": "#b57bff"
    },
    "cooldown": 5,
    "passive": {
      "atkMult": 1.09
    },
    "desc": "5秒ごと: 敵に 攻撃×4.3 / 攻撃 +9%"
  },
  "leafbeetlewall": {
    "id": "leafbeetlewall",
    "name": "ストーンガード",
    "active": {
      "type": "guard",
      "power": 0.37,
      "duration": 4,
      "color": "#c08038"
    },
    "cooldown": 8,
    "passive": {
      "hpMult": 1.14
    },
    "desc": "8秒ごと: 4秒間 かばう(被ダメ -37%) / 最大HP +14%"
  },
  "archermousestrike": {
    "id": "archermousestrike",
    "name": "ゲイルスラッシュ",
    "active": {
      "type": "nuke",
      "fx": "shot",
      "power": 4.3,
      "color": "#8ae08a"
    },
    "cooldown": 5,
    "passive": {
      "atkMult": 1.09
    },
    "desc": "5秒ごと: 敵に 攻撃×4.3 / 攻撃 +9%"
  },
  "skyponymend": {
    "id": "skyponymend",
    "name": "ストームリジェネ",
    "active": {
      "type": "heal",
      "power": 0.13,
      "color": "#8ae08a"
    },
    "cooldown": 6,
    "passive": {
      "hpMult": 1.12
    },
    "desc": "6秒ごと: パーティHPを 13% 回復 / 最大HP +12%"
  },
  "kingshroomrally": {
    "id": "kingshroomrally",
    "name": "ストーンチアー2",
    "active": {
      "type": "buff",
      "power": 0.14,
      "duration": 5,
      "color": "#c08038"
    },
    "cooldown": 7,
    "passive": {
      "atkMult": 1.07
    },
    "desc": "7秒ごと: 5秒間 パーティ攻撃 +14% / 攻撃 +7%"
  },
  "whitegolemwall": {
    "id": "whitegolemwall",
    "name": "ルミナシールド",
    "active": {
      "type": "guard",
      "power": 0.37,
      "duration": 4,
      "color": "#ffe066"
    },
    "cooldown": 8,
    "passive": {
      "hpMult": 1.14
    },
    "desc": "8秒ごと: 4秒間 かばう(被ダメ -37%) / 最大HP +14%"
  },
  "bubblefrogmend": {
    "id": "bubblefrogmend",
    "name": "タイドメンド",
    "active": {
      "type": "heal",
      "power": 0.13,
      "color": "#5bc0eb"
    },
    "cooldown": 6,
    "passive": {
      "hpMult": 1.12
    },
    "desc": "6秒ごと: パーティHPを 13% 回復 / 最大HP +12%"
  },
  "knightcatwall": {
    "id": "knightcatwall",
    "name": "ソルシールド",
    "active": {
      "type": "guard",
      "power": 0.37,
      "duration": 4,
      "color": "#ffe066"
    },
    "cooldown": 8,
    "passive": {
      "hpMult": 1.14
    },
    "desc": "8秒ごと: 4秒間 かばう(被ダメ -37%) / 最大HP +14%",
    "tiers": [
      {"name":"ソルシールド","power":0.37,"cooldown":8,"desc":"8秒ごと: 4秒間 かばう(被ダメ -37%) / 最大HP +14%"},
      {"name":"ソルシールド・改","power":0.37,"cooldown":8,"desc":"8秒ごと: 4秒間 かばう(被ダメ -37%) / 最大HP +14%","passiveBoost":0.03},
      {"name":"ソルシールド・皆伝","power":0.37,"cooldown":8,"desc":"8秒ごと: 4秒間 かばう(被ダメ -37%) / 最大HP +14%","passiveBoost":0.07},
    ],
    "signature": true
  },
  "redimpstrike": {
    "id": "redimpstrike",
    "name": "シンダースラッシュ",
    "active": {
      "type": "nuke",
      "fx": "shot",
      "power": 4.3,
      "color": "#ff6a2a"
    },
    "cooldown": 5,
    "passive": {
      "atkMult": 1.09
    },
    "desc": "5秒ごと: 敵に 攻撃×4.3 / 攻撃 +9%"
  },
  "graywardenwall": {
    "id": "graywardenwall",
    "name": "ノクトウォール",
    "active": {
      "type": "guard",
      "power": 0.37,
      "duration": 4,
      "color": "#b57bff"
    },
    "cooldown": 8,
    "passive": {
      "hpMult": 1.14
    },
    "desc": "8秒ごと: 4秒間 かばう(被ダメ -37%) / 最大HP +14%"
  },
  "blazebonestrike": {
    "id": "blazebonestrike",
    "name": "エンバーインパクト2",
    "active": {
      "type": "nuke",
      "fx": "slash",
      "power": 5.4,
      "color": "#ff6a2a"
    },
    "cooldown": 6,
    "passive": {
      "atkMult": 1.11
    },
    "desc": "6秒ごと: 敵に 攻撃×5.4 / 攻撃 +11%"
  },
  "treantwall": {
    "id": "treantwall",
    "name": "ストーンシールド",
    "active": {
      "type": "guard",
      "power": 0.4,
      "duration": 4,
      "color": "#c08038"
    },
    "cooldown": 9,
    "passive": {
      "hpMult": 1.16
    },
    "desc": "9秒ごと: 4秒間 かばう(被ダメ -40%) / 最大HP +16%"
  },
  "gusthawkstrike": {
    "id": "gusthawkstrike",
    "name": "ゼファーインパクト",
    "active": {
      "type": "nuke",
      "fx": "beam",
      "power": 5.4,
      "color": "#8ae08a"
    },
    "cooldown": 6,
    "passive": {
      "atkMult": 1.11
    },
    "desc": "6秒ごと: 敵に 攻撃×5.4 / 攻撃 +11%"
  },
  "blossompotmend": {
    "id": "blossompotmend",
    "name": "ストーンリジェネ",
    "active": {
      "type": "heal",
      "power": 0.16,
      "color": "#c08038"
    },
    "cooldown": 7,
    "passive": {
      "hpMult": 1.14
    },
    "desc": "7秒ごと: パーティHPを 16% 回復 / 最大HP +14%"
  },
  "voidcatstrike": {
    "id": "voidcatstrike",
    "name": "ヴォイドストライク",
    "active": {
      "type": "nuke",
      "fx": "slash",
      "power": 5.4,
      "color": "#b57bff"
    },
    "cooldown": 6,
    "passive": {
      "atkMult": 1.11
    },
    "desc": "6秒ごと: 敵に 攻撃×5.4 / 攻撃 +11%"
  },
  "magmafoxstrike": {
    "id": "magmafoxstrike",
    "name": "シンダースラッシュ2",
    "active": {
      "type": "nuke",
      "fx": "beam",
      "power": 5.4,
      "color": "#ff6a2a"
    },
    "cooldown": 6,
    "passive": {
      "atkMult": 1.11
    },
    "desc": "6秒ごと: 敵に 攻撃×5.4 / 攻撃 +11%"
  },
  "blueflarerally": {
    "id": "blueflarerally",
    "name": "ミストエンチャント",
    "active": {
      "type": "buff",
      "power": 0.16,
      "duration": 5,
      "color": "#5bc0eb"
    },
    "cooldown": 8,
    "passive": {
      "atkMult": 1.09
    },
    "desc": "8秒ごと: 5秒間 パーティ攻撃 +16% / 攻撃 +9%"
  },
  "coralottermend": {
    "id": "coralottermend",
    "name": "フロストヒール",
    "active": {
      "type": "heal",
      "power": 0.16,
      "color": "#5bc0eb"
    },
    "cooldown": 7,
    "passive": {
      "hpMult": 1.14
    },
    "desc": "7秒ごと: パーティHPを 16% 回復 / 最大HP +14%"
  },
  "gargoylewall": {
    "id": "gargoylewall",
    "name": "テラシールド",
    "active": {
      "type": "guard",
      "power": 0.4,
      "duration": 4,
      "color": "#c08038"
    },
    "cooldown": 9,
    "passive": {
      "hpMult": 1.16
    },
    "desc": "9秒ごと: 4秒間 かばう(被ダメ -40%) / 最大HP +16%",
    "tiers": [
      {"name":"テラシールド","power":0.4,"cooldown":9,"desc":"9秒ごと: 4秒間 かばう(被ダメ -40%) / 最大HP +16%"},
      {"name":"テラシールド・改","power":0.4,"cooldown":9,"desc":"9秒ごと: 4秒間 かばう(被ダメ -40%) / 最大HP +16%","passiveBoost":0.03},
      {"name":"テラシールド・皆伝","power":0.4,"cooldown":9,"desc":"9秒ごと: 4秒間 かばう(被ダメ -40%) / 最大HP +16%","passiveBoost":0.07},
    ],
    "signature": true
  },
  "pinkfairymend": {
    "id": "pinkfairymend",
    "name": "オーラメンド",
    "active": {
      "type": "heal",
      "power": 0.16,
      "color": "#ffe066"
    },
    "cooldown": 7,
    "passive": {
      "hpMult": 1.14
    },
    "desc": "7秒ごと: パーティHPを 16% 回復 / 最大HP +14%"
  },
  "magmagolemwall": {
    "id": "magmagolemwall",
    "name": "シンダーシールド",
    "active": {
      "type": "guard",
      "power": 0.4,
      "duration": 4,
      "color": "#ff6a2a"
    },
    "cooldown": 9,
    "passive": {
      "hpMult": 1.16
    },
    "desc": "9秒ごと: 4秒間 かばう(被ダメ -40%) / 最大HP +16%"
  },
  "shieldmousewall": {
    "id": "shieldmousewall",
    "name": "シャインシールド",
    "active": {
      "type": "guard",
      "power": 0.4,
      "duration": 4,
      "color": "#ffe066"
    },
    "cooldown": 9,
    "passive": {
      "hpMult": 1.16
    },
    "desc": "9秒ごと: 4秒間 かばう(被ダメ -40%) / 最大HP +16%"
  },
  "lavaserpentstrike": {
    "id": "lavaserpentstrike",
    "name": "シンダースラッシュ3",
    "active": {
      "type": "nuke",
      "fx": "shot",
      "power": 5.4,
      "color": "#ff6a2a"
    },
    "cooldown": 6,
    "passive": {
      "atkMult": 1.11
    },
    "desc": "6秒ごと: 敵に 攻撃×5.4 / 攻撃 +11%"
  },
  "fountainfrogmend": {
    "id": "fountainfrogmend",
    "name": "タイドヒール",
    "active": {
      "type": "heal",
      "power": 0.16,
      "color": "#5bc0eb"
    },
    "cooldown": 7,
    "passive": {
      "hpMult": 1.14
    },
    "desc": "7秒ごと: パーティHPを 16% 回復 / 最大HP +14%"
  },
  "shadowknightstrike": {
    "id": "shadowknightstrike",
    "name": "ダスクインパクト2",
    "active": {
      "type": "nuke",
      "fx": "nova",
      "power": 5.4,
      "color": "#b57bff"
    },
    "cooldown": 6,
    "passive": {
      "atkMult": 1.11
    },
    "desc": "6秒ごと: 敵に 攻撃×5.4 / 攻撃 +11%"
  },
  "drakelordstrike": {
    "id": "drakelordstrike",
    "name": "ブレイズストライク",
    "active": {
      "type": "nuke",
      "fx": "slash",
      "power": 6.4,
      "color": "#ff6a2a"
    },
    "cooldown": 5,
    "passive": {
      "atkMult": 1.13
    },
    "desc": "5秒ごと: 敵に 攻撃×6.4 / 攻撃 +13%",
    "tiers": [
      {"name":"ブレイズストライク","power":4.2,"cooldown":5,"desc":"5秒ごと: 敵全体に 攻撃×4.2 の一斉攻撃 / 攻撃 +13%"},
      {"name":"ブレイズストライク・改","power":5.3,"cooldown":5,"desc":"5秒ごと: 敵全体に 攻撃×5.3 の一斉攻撃 / 攻撃 +13%"},
      {"name":"ブレイズストライク・皆伝","power":6.5,"cooldown":4,"desc":"4秒ごと: 敵全体に 攻撃×6.5 の一斉攻撃 / 攻撃 +13%"},
    ],
    "signature": true
  },
  "sirenmend": {
    "id": "sirenmend",
    "name": "アクアヒール",
    "active": {
      "type": "heal",
      "power": 0.18,
      "color": "#5bc0eb"
    },
    "cooldown": 6,
    "passive": {
      "hpMult": 1.16
    },
    "desc": "6秒ごと: パーティHPを 18% 回復 / 最大HP +16%"
  },
  "griffonstrike": {
    "id": "griffonstrike",
    "name": "ゼファーブラスト",
    "active": {
      "type": "nuke",
      "fx": "shot",
      "power": 6.4,
      "color": "#8ae08a"
    },
    "cooldown": 5,
    "passive": {
      "atkMult": 1.13
    },
    "desc": "5秒ごと: 敵に 攻撃×6.4 / 攻撃 +13%"
  },
  "jadeogrewall": {
    "id": "jadeogrewall",
    "name": "クレイバリア2",
    "active": {
      "type": "guard",
      "power": 0.42,
      "duration": 4,
      "color": "#c08038"
    },
    "cooldown": 8,
    "passive": {
      "hpMult": 1.18
    },
    "desc": "8秒ごと: 4秒間 かばう(被ダメ -42%) / 最大HP +18%"
  },
  "darkknightstrike": {
    "id": "darkknightstrike",
    "name": "ノクトインパクト",
    "active": {
      "type": "nuke",
      "fx": "slash",
      "power": 6.4,
      "color": "#b57bff"
    },
    "cooldown": 5,
    "passive": {
      "atkMult": 1.13
    },
    "desc": "5秒ごと: 敵に 攻撃×6.4 / 攻撃 +13%"
  },
  "haloangelmend": {
    "id": "haloangelmend",
    "name": "シャインリジェネ",
    "active": {
      "type": "heal",
      "power": 0.18,
      "color": "#ffe066"
    },
    "cooldown": 6,
    "passive": {
      "hpMult": 1.16
    },
    "desc": "6秒ごと: パーティHPを 18% 回復 / 最大HP +16%",
    "tiers": [
      {"name":"シャインリジェネ","power":0.18,"cooldown":6,"desc":"6秒ごと: パーティHPを 18% 回復 / 最大HP +16%"},
      {"name":"シャインリジェネ・改","power":0.22,"cooldown":5,"desc":"5秒ごと: パーティHPを 22% 回復 / 最大HP +16%"},
      {"name":"シャインリジェネ・皆伝","power":0.26,"cooldown":5,"desc":"5秒ごと: パーティHPを 26% 回復 / 最大HP +16%"},
    ],
    "signature": true
  },
  "flameogrewall": {
    "id": "flameogrewall",
    "name": "エンバーバリア",
    "active": {
      "type": "guard",
      "power": 0.42,
      "duration": 4,
      "color": "#ff6a2a"
    },
    "cooldown": 8,
    "passive": {
      "hpMult": 1.18
    },
    "desc": "8秒ごと: 4秒間 かばう(被ダメ -42%) / 最大HP +18%"
  },
  "worldsproutmend": {
    "id": "worldsproutmend",
    "name": "ストーンリカバー",
    "active": {
      "type": "heal",
      "power": 0.18,
      "color": "#c08038"
    },
    "cooldown": 6,
    "passive": {
      "hpMult": 1.16
    },
    "desc": "6秒ごと: パーティHPを 18% 回復 / 最大HP +16%"
  },
  "stormpaladinwall": {
    "id": "stormpaladinwall",
    "name": "ゼファーバリア",
    "active": {
      "type": "guard",
      "power": 0.42,
      "duration": 4,
      "color": "#8ae08a"
    },
    "cooldown": 8,
    "passive": {
      "hpMult": 1.18
    },
    "desc": "8秒ごと: 4秒間 かばう(被ダメ -42%) / 最大HP +18%"
  },
  "dryadqueenrally": {
    "id": "dryadqueenrally",
    "name": "ストーンブースト",
    "active": {
      "type": "buff",
      "power": 0.18,
      "duration": 5,
      "color": "#c08038"
    },
    "cooldown": 7,
    "passive": {
      "atkMult": 1.1
    },
    "desc": "7秒ごと: 5秒間 パーティ攻撃 +18% / 攻撃 +10%"
  },
  "darkbehemothwall": {
    "id": "darkbehemothwall",
    "name": "ダスクシールド2",
    "active": {
      "type": "guard",
      "power": 0.42,
      "duration": 4,
      "color": "#b57bff"
    },
    "cooldown": 8,
    "passive": {
      "hpMult": 1.18
    },
    "desc": "8秒ごと: 4秒間 かばう(被ダメ -42%) / 最大HP +18%"
  },
  "heromousestrike": {
    "id": "heromousestrike",
    "name": "ソルストライク",
    "active": {
      "type": "nuke",
      "fx": "shot",
      "power": 6.4,
      "color": "#ffe066"
    },
    "cooldown": 5,
    "passive": {
      "atkMult": 1.13
    },
    "desc": "5秒ごと: 敵に 攻撃×6.4 / 攻撃 +13%"
  },
  "phoenixmend": {
    "id": "phoenixmend",
    "name": "シンダーリジェネ",
    "active": {
      "type": "heal",
      "power": 0.2,
      "color": "#ff6a2a"
    },
    "cooldown": 7,
    "passive": {
      "hpMult": 1.18
    },
    "desc": "7秒ごと: パーティHPを 20% 回復 / 最大HP +18%",
    "tiers": [
      {"name":"シンダーリジェネ","power":0.32,"cooldown":8,"desc":"8秒ごと: 8秒かけて パーティHPを合計 32% 回復(リジェネ) / 最大HP +18%"},
      {"name":"シンダーリジェネ・改","power":0.38,"cooldown":7,"desc":"7秒ごと: 8秒かけて パーティHPを合計 38% 回復(リジェネ) / 最大HP +18%"},
      {"name":"シンダーリジェネ・皆伝","power":0.46,"cooldown":6,"desc":"6秒ごと: 8秒かけて パーティHPを合計 46% 回復(リジェネ) / 最大HP +18%"},
    ],
    "signature": true
  },
  "tidalqueenstrike": {
    "id": "tidalqueenstrike",
    "name": "フロストブラスト",
    "active": {
      "type": "nuke",
      "fx": "slash",
      "power": 7.5,
      "color": "#5bc0eb"
    },
    "cooldown": 6,
    "passive": {
      "atkMult": 1.15
    },
    "desc": "6秒ごと: 敵に 攻撃×7.5 / 攻撃 +15%"
  },
  "royalgriffonwall": {
    "id": "royalgriffonwall",
    "name": "スカイバリア",
    "active": {
      "type": "guard",
      "power": 0.44,
      "duration": 5,
      "color": "#8ae08a"
    },
    "cooldown": 9,
    "passive": {
      "hpMult": 1.2
    },
    "desc": "9秒ごと: 5秒間 かばう(被ダメ -44%) / 最大HP +20%"
  },
  "luminfairymend": {
    "id": "luminfairymend",
    "name": "ルミナメンド",
    "active": {
      "type": "heal",
      "power": 0.2,
      "color": "#ffe066"
    },
    "cooldown": 7,
    "passive": {
      "hpMult": 1.18
    },
    "desc": "7秒ごと: パーティHPを 20% 回復 / 最大HP +18%"
  },
  "infernoknightstrike": {
    "id": "infernoknightstrike",
    "name": "シンダーストライク",
    "active": {
      "type": "nuke",
      "fx": "beam",
      "power": 7.5,
      "color": "#ff6a2a"
    },
    "cooldown": 6,
    "passive": {
      "atkMult": 1.15
    },
    "desc": "6秒ごと: 敵に 攻撃×7.5 / 攻撃 +15%"
  },
  "abyssaltoadwall": {
    "id": "abyssaltoadwall",
    "name": "フロストバリア",
    "active": {
      "type": "guard",
      "power": 0.44,
      "duration": 5,
      "color": "#5bc0eb"
    },
    "cooldown": 9,
    "passive": {
      "hpMult": 1.2
    },
    "desc": "9秒ごと: 5秒間 かばう(被ダメ -44%) / 最大HP +20%"
  },
  "bonemonarchstrike": {
    "id": "bonemonarchstrike",
    "name": "シャドウスラッシュ",
    "active": {
      "type": "nuke",
      "fx": "shot",
      "power": 7.5,
      "color": "#b57bff"
    },
    "cooldown": 6,
    "passive": {
      "atkMult": 1.15
    },
    "desc": "6秒ごと: 敵に 攻撃×7.5 / 攻撃 +15%"
  },
  "voidbehemothwall": {
    "id": "voidbehemothwall",
    "name": "ダスクバリア",
    "active": {
      "type": "guard",
      "power": 0.44,
      "duration": 5,
      "color": "#b57bff"
    },
    "cooldown": 9,
    "passive": {
      "hpMult": 1.2
    },
    "desc": "9秒ごと: 5秒間 かばう(被ダメ -44%) / 最大HP +20%"
  },
  "valkyriestrike": {
    "id": "valkyriestrike",
    "name": "シャインインパクト",
    "active": {
      "type": "nuke",
      "fx": "nova",
      "power": 7.5,
      "color": "#ffe066"
    },
    "cooldown": 6,
    "passive": {
      "atkMult": 1.15
    },
    "desc": "6秒ごと: 敵に 攻撃×7.5 / 攻撃 +15%",
    "tiers": [
      {"name":"シャインインパクト","power":4.9,"cooldown":6,"desc":"6秒ごと: 敵全体に 攻撃×4.9 の一斉攻撃 / 攻撃 +15%"},
      {"name":"シャインインパクト・改","power":6.1,"cooldown":5,"desc":"5秒ごと: 敵全体に 攻撃×6.1 の一斉攻撃 / 攻撃 +15%"},
      {"name":"シャインインパクト・皆伝","power":7.6,"cooldown":5,"desc":"5秒ごと: 敵全体に 攻撃×7.6 の一斉攻撃 / 攻撃 +15%"},
    ],
    "signature": true
  },
  "generalmouserally": {
    "id": "generalmouserally",
    "name": "ストーンラリー",
    "active": {
      "type": "buff",
      "power": 0.2,
      "duration": 5,
      "color": "#c08038"
    },
    "cooldown": 8,
    "passive": {
      "atkMult": 1.12
    },
    "desc": "8秒ごと: 5秒間 パーティ攻撃 +20% / 攻撃 +12%"
  },
  "crystaldragonstrike": {
    "id": "crystaldragonstrike",
    "name": "オーラインパクト",
    "active": {
      "type": "nuke",
      "fx": "beam",
      "power": 8.5,
      "color": "#ffe066"
    },
    "cooldown": 5,
    "passive": {
      "atkMult": 1.17
    },
    "desc": "5秒ごと: 敵に 攻撃×8.5 / 攻撃 +17%",
    "tiers": [
      {"name":"オーラインパクト","power":15.4,"cooldown":6,"desc":"6秒ごと: 8秒かけて合計 攻撃×15.4 の継続ダメージ / 攻撃 +17%"},
      {"name":"オーラインパクト・改","power":19.3,"cooldown":5,"desc":"5秒ごと: 8秒かけて合計 攻撃×19.3 の継続ダメージ / 攻撃 +17%"},
      {"name":"オーラインパクト・皆伝","power":23.9,"cooldown":5,"desc":"5秒ごと: 8秒かけて合計 攻撃×23.9 の継続ダメージ / 攻撃 +17%"},
    ],
    "signature": true
  },
  "abysswitchstrike": {
    "id": "abysswitchstrike",
    "name": "タイドスラッシュ",
    "active": {
      "type": "nuke",
      "fx": "shot",
      "power": 8.5,
      "color": "#5bc0eb"
    },
    "cooldown": 5,
    "passive": {
      "atkMult": 1.17
    },
    "desc": "5秒ごと: 敵に 攻撃×8.5 / 攻撃 +17%",
    "tiers": [
      {"name":"タイドスラッシュ","power":12.8,"cooldown":5,"desc":"5秒ごと: 8秒かけて合計 攻撃×12.8 の継続ダメージ / 攻撃 +17%"},
      {"name":"タイドスラッシュ・改","power":16,"cooldown":5,"desc":"5秒ごと: 8秒かけて合計 攻撃×16 の継続ダメージ / 攻撃 +17%"},
      {"name":"タイドスラッシュ・皆伝","power":19.8,"cooldown":4,"desc":"4秒ごと: 8秒かけて合計 攻撃×19.8 の継続ダメージ / 攻撃 +17%"},
    ],
    "signature": true
  },
  "gaiaflorarally": {
    "id": "gaiaflorarally",
    "name": "ストーンチアー3",
    "active": {
      "type": "buff",
      "power": 0.22,
      "duration": 5,
      "color": "#c08038"
    },
    "cooldown": 7,
    "passive": {
      "atkMult": 1.13
    },
    "desc": "7秒ごと: 5秒間 パーティ攻撃 +22% / 攻撃 +13%",
    "tiers": [
      {"name":"ストーンチアー3","power":0.13,"cooldown":7,"desc":"7秒ごと: 5秒間 パーティ会心率 +13% / 攻撃 +13%"},
      {"name":"ストーンチアー3・改","power":0.15,"cooldown":6,"desc":"6秒ごと: 5秒間 パーティ会心率 +15% / 攻撃 +13%"},
      {"name":"ストーンチアー3・皆伝","power":0.18,"cooldown":6,"desc":"6秒ごと: 5秒間 パーティ会心率 +18% / 攻撃 +13%"},
    ],
    "signature": true
  },
  "nightwraithstrike": {
    "id": "nightwraithstrike",
    "name": "シャドウストライク",
    "active": {
      "type": "nuke",
      "fx": "nova",
      "power": 8.5,
      "color": "#b57bff"
    },
    "cooldown": 5,
    "passive": {
      "atkMult": 1.17
    },
    "desc": "5秒ごと: 敵に 攻撃×8.5 / 攻撃 +17%",
    "tiers": [
      {"name":"シャドウストライク","power":10.2,"cooldown":4,"desc":"4秒ごと: 8秒かけて合計 攻撃×10.2 の継続ダメージ / 攻撃 +17%"},
      {"name":"シャドウストライク・改","power":12.8,"cooldown":4,"desc":"4秒ごと: 8秒かけて合計 攻撃×12.8 の継続ダメージ / 攻撃 +17%"},
      {"name":"シャドウストライク・皆伝","power":15.8,"cooldown":3,"desc":"3秒ごと: 8秒かけて合計 攻撃×15.8 の継続ダメージ / 攻撃 +17%"},
    ],
    "signature": true
  },
  "dawnseraphmend": {
    "id": "dawnseraphmend",
    "name": "ルミナリカバー",
    "active": {
      "type": "heal",
      "power": 0.22,
      "color": "#ffe066"
    },
    "cooldown": 6,
    "passive": {
      "hpMult": 1.2
    },
    "desc": "6秒ごと: パーティHPを 22% 回復 / 最大HP +20%",
    "tiers": [
      {"name":"ルミナリカバー","power":0.31,"cooldown":6,"desc":"6秒ごと: 8秒かけて パーティHPを合計 31% 回復(リジェネ) / 最大HP +20%"},
      {"name":"ルミナリカバー・改","power":0.37,"cooldown":5,"desc":"5秒ごと: 8秒かけて パーティHPを合計 37% 回復(リジェネ) / 最大HP +20%"},
      {"name":"ルミナリカバー・皆伝","power":0.45,"cooldown":5,"desc":"5秒ごと: 8秒かけて パーティHPを合計 45% 回復(リジェネ) / 最大HP +20%"},
    ],
    "signature": true
  },
  "glacialsylphrally": {
    "id": "glacialsylphrally",
    "name": "タイドブースト",
    "active": {
      "type": "buff",
      "power": 0.22,
      "duration": 5,
      "color": "#5bc0eb"
    },
    "cooldown": 7,
    "passive": {
      "atkMult": 1.13
    },
    "desc": "7秒ごと: 5秒間 パーティ攻撃 +22% / 攻撃 +13%",
    "tiers": [
      {"name":"タイドブースト","power":0.22,"cooldown":7,"desc":"7秒ごと: 5秒間 パーティ攻撃 +22% / 攻撃 +13%"},
      {"name":"タイドブースト・改","power":0.25,"cooldown":6,"desc":"6秒ごと: 5秒間 パーティ攻撃 +25% / 攻撃 +13%"},
      {"name":"タイドブースト・皆伝","power":0.3,"cooldown":6,"desc":"6秒ごと: 5秒間 パーティ攻撃 +30% / 攻撃 +13%"},
    ],
    "signature": true
  },
  "goldlionstrike": {
    "id": "goldlionstrike",
    "name": "オーラブラスト",
    "active": {
      "type": "nuke",
      "fx": "beam",
      "power": 9.6,
      "color": "#ffe066"
    },
    "cooldown": 6,
    "passive": {
      "atkMult": 1.19
    },
    "desc": "6秒ごと: 敵に 攻撃×9.6 / 攻撃 +19%",
    "tiers": [
      {"name":"オーラブラスト","power":9.6,"cooldown":6,"desc":"6秒ごと: 敵に 攻撃×9.6 / 攻撃 +19%"},
      {"name":"オーラブラスト・改","power":12,"cooldown":5,"desc":"5秒ごと: 敵に 攻撃×12 / 攻撃 +19%"},
      {"name":"オーラブラスト・皆伝","power":14.9,"cooldown":5,"desc":"5秒ごと: 敵に 攻撃×14.9 / 攻撃 +19%"},
    ],
    "signature": true
  },
  "marineoraclemend": {
    "id": "marineoraclemend",
    "name": "ミストリカバー",
    "active": {
      "type": "heal",
      "power": 0.24,
      "color": "#5bc0eb"
    },
    "cooldown": 7,
    "passive": {
      "hpMult": 1.22
    },
    "desc": "7秒ごと: パーティHPを 24% 回復 / 最大HP +22%",
    "tiers": [
      {"name":"ミストリカバー","power":0.39,"cooldown":8,"desc":"8秒ごと: 8秒かけて パーティHPを合計 39% 回復(リジェネ) / 最大HP +22%"},
      {"name":"ミストリカバー・改","power":0.47,"cooldown":7,"desc":"7秒ごと: 8秒かけて パーティHPを合計 47% 回復(リジェネ) / 最大HP +22%"},
      {"name":"ミストリカバー・皆伝","power":0.57,"cooldown":6,"desc":"6秒ごと: 8秒かけて パーティHPを合計 57% 回復(リジェネ) / 最大HP +22%"},
    ],
    "signature": true
  },
  "gaiaseraphwall": {
    "id": "gaiaseraphwall",
    "name": "ロックガード",
    "active": {
      "type": "guard",
      "power": 0.48,
      "duration": 5,
      "color": "#c08038"
    },
    "cooldown": 9,
    "passive": {
      "hpMult": 1.24
    },
    "desc": "9秒ごと: 5秒間 かばう(被ダメ -48%) / 最大HP +24%",
    "tiers": [
      {"name":"ロックガード","power":0.38,"cooldown":9,"desc":"9秒ごと: 5秒間 かばう(被ダメ -38%)+攻撃してきた敵に 攻撃×1.2 の反撃 / 最大HP +24%"},
      {"name":"ロックガード・改","power":0.38,"cooldown":9,"desc":"9秒ごと: 5秒間 かばう(被ダメ -38%)+攻撃してきた敵に 攻撃×1.2 の反撃 / 最大HP +24%","passiveBoost":0.03},
      {"name":"ロックガード・皆伝","power":0.38,"cooldown":9,"desc":"9秒ごと: 5秒間 かばう(被ダメ -38%)+攻撃してきた敵に 攻撃×1.2 の反撃 / 最大HP +24%","passiveBoost":0.07},
    ],
    "signature": true
  },
  "starseraphstrike": {
    "id": "starseraphstrike",
    "name": "ソルストライク2",
    "active": {
      "type": "nuke",
      "fx": "beam",
      "power": 9.6,
      "color": "#ffe066"
    },
    "cooldown": 6,
    "passive": {
      "atkMult": 1.19
    },
    "desc": "6秒ごと: 敵に 攻撃×9.6 / 攻撃 +19%",
    "tiers": [
      {"name":"ソルストライク2","power":14.4,"cooldown":6,"desc":"6秒ごと: 8秒かけて合計 攻撃×14.4 の継続ダメージ / 攻撃 +19%"},
      {"name":"ソルストライク2・改","power":18,"cooldown":5,"desc":"5秒ごと: 8秒かけて合計 攻撃×18 の継続ダメージ / 攻撃 +19%"},
      {"name":"ソルストライク2・皆伝","power":22.3,"cooldown":5,"desc":"5秒ごと: 8秒かけて合計 攻撃×22.3 の継続ダメージ / 攻撃 +19%"},
    ],
    "signature": true
  },
  "divinewingrally": {
    "id": "divinewingrally",
    "name": "ゼファーブースト",
    "active": {
      "type": "buff",
      "power": 0.24,
      "duration": 5,
      "color": "#8ae08a"
    },
    "cooldown": 8,
    "passive": {
      "atkMult": 1.15
    },
    "desc": "8秒ごと: 5秒間 パーティ攻撃 +24% / 攻撃 +15%",
    "tiers": [
      {"name":"ゼファーブースト","power":0.24,"cooldown":8,"desc":"8秒ごと: 5秒間 パーティ攻撃 +24% / 攻撃 +15%"},
      {"name":"ゼファーブースト・改","power":0.28,"cooldown":7,"desc":"7秒ごと: 5秒間 パーティ攻撃 +28% / 攻撃 +15%"},
      {"name":"ゼファーブースト・皆伝","power":0.32,"cooldown":7,"desc":"7秒ごと: 5秒間 パーティ攻撃 +32% / 攻撃 +15%"},
    ],
    "signature": true
  },
  "twilightmusemend": {
    "id": "twilightmusemend",
    "name": "ノクトヒール",
    "active": {
      "type": "heal",
      "power": 0.24,
      "color": "#b57bff"
    },
    "cooldown": 7,
    "passive": {
      "hpMult": 1.22
    },
    "desc": "7秒ごと: パーティHPを 24% 回復 / 最大HP +22%",
    "tiers": [
      {"name":"ノクトヒール","power":0.24,"cooldown":7,"desc":"7秒ごと: パーティHPを 24% 回復 / 最大HP +22%"},
      {"name":"ノクトヒール・改","power":0.29,"cooldown":6,"desc":"6秒ごと: パーティHPを 29% 回復 / 最大HP +22%"},
      {"name":"ノクトヒール・皆伝","power":0.35,"cooldown":6,"desc":"6秒ごと: パーティHPを 35% 回復 / 最大HP +22%"},
    ],
    "signature": true
  },
  "sunmonarchstrike": {
    "id": "sunmonarchstrike",
    "name": "エンバーストライク",
    "active": {
      "type": "nuke",
      "fx": "slash",
      "power": 9.6,
      "color": "#ff6a2a"
    },
    "cooldown": 6,
    "passive": {
      "atkMult": 1.19
    },
    "desc": "6秒ごと: 敵に 攻撃×9.6 / 攻撃 +19%",
    "tiers": [
      {"name":"エンバーストライク","power":11.2,"cooldown":7,"desc":"7秒ごと: 敵に 攻撃×11.2 / 攻撃 +19%"},
      {"name":"エンバーストライク・改","power":14,"cooldown":6,"desc":"6秒ごと: 敵に 攻撃×14 / 攻撃 +19%"},
      {"name":"エンバーストライク・皆伝","power":17.4,"cooldown":6,"desc":"6秒ごと: 敵に 攻撃×17.4 / 攻撃 +19%"},
    ],
    "signature": true
  },
  "jadetitanwall": {
    "id": "jadetitanwall",
    "name": "クレイウォール",
    "active": {
      "type": "guard",
      "power": 0.48,
      "duration": 5,
      "color": "#c08038"
    },
    "cooldown": 9,
    "passive": {
      "hpMult": 1.24
    },
    "desc": "9秒ごと: 5秒間 かばう(被ダメ -48%) / 最大HP +24%",
    "tiers": [
      {"name":"クレイウォール","power":0.48,"cooldown":9,"desc":"9秒ごと: 5秒間 かばう(被ダメ -48%) / 最大HP +24%"},
      {"name":"クレイウォール・改","power":0.48,"cooldown":9,"desc":"9秒ごと: 5秒間 かばう(被ダメ -48%) / 最大HP +24%","passiveBoost":0.03},
      {"name":"クレイウォール・皆伝","power":0.48,"cooldown":9,"desc":"9秒ごと: 5秒間 かばう(被ダメ -48%) / 最大HP +24%","passiveBoost":0.07},
    ],
    "signature": true
  },
  "auroradancermend": {
    "id": "auroradancermend",
    "name": "ストームリカバー",
    "active": {
      "type": "heal",
      "power": 0.24,
      "color": "#8ae08a"
    },
    "cooldown": 7,
    "passive": {
      "hpMult": 1.22
    },
    "desc": "7秒ごと: パーティHPを 24% 回復 / 最大HP +22%",
    "tiers": [
      {"name":"ストームリカバー","power":0.34,"cooldown":7,"desc":"7秒ごと: 8秒かけて パーティHPを合計 34% 回復(リジェネ) / 最大HP +22%"},
      {"name":"ストームリカバー・改","power":0.41,"cooldown":6,"desc":"6秒ごと: 8秒かけて パーティHPを合計 41% 回復(リジェネ) / 最大HP +22%"},
      {"name":"ストームリカバー・皆伝","power":0.49,"cooldown":6,"desc":"6秒ごと: 8秒かけて パーティHPを合計 49% 回復(リジェネ) / 最大HP +22%"},
    ],
    "signature": true
  },
  "frostlichstrike": {
    "id": "frostlichstrike",
    "name": "タイドブラスト2",
    "active": {
      "type": "nuke",
      "fx": "slash",
      "power": 10.6,
      "color": "#5bc0eb"
    },
    "cooldown": 5,
    "passive": {
      "atkMult": 1.21
    },
    "desc": "5秒ごと: 敵に 攻撃×10.6 / 攻撃 +21%",
    "tiers": [
      {"name":"タイドブラスト2","power":10.1,"cooldown":5,"desc":"5秒ごと: 敵に 攻撃×10.1(HP35%未満の敵には ×23.2 のトドメ) / 攻撃 +21%"},
      {"name":"タイドブラスト2・改","power":12.6,"cooldown":5,"desc":"5秒ごと: 敵に 攻撃×12.6(HP35%未満の敵には ×29 のトドメ) / 攻撃 +21%"},
      {"name":"タイドブラスト2・皆伝","power":15.7,"cooldown":4,"desc":"4秒ごと: 敵に 攻撃×15.7(HP35%未満の敵には ×36.1 のトドメ) / 攻撃 +21%"},
    ],
    "signature": true
  },
  "thronemonarchwall": {
    "id": "thronemonarchwall",
    "name": "ヴォイドウォール",
    "active": {
      "type": "guard",
      "power": 0.51,
      "duration": 5,
      "color": "#b57bff"
    },
    "cooldown": 8,
    "passive": {
      "hpMult": 1.26
    },
    "desc": "8秒ごと: 5秒間 かばう(被ダメ -51%) / 最大HP +26%",
    "tiers": [
      {"name":"ヴォイドウォール","power":0.51,"cooldown":8,"desc":"8秒ごと: 5秒間 かばう(被ダメ -51%) / 最大HP +26%"},
      {"name":"ヴォイドウォール・改","power":0.51,"cooldown":8,"desc":"8秒ごと: 5秒間 かばう(被ダメ -51%) / 最大HP +26%","passiveBoost":0.03},
      {"name":"ヴォイドウォール・皆伝","power":0.51,"cooldown":8,"desc":"8秒ごと: 5秒間 かばう(被ダメ -51%) / 最大HP +26%","passiveBoost":0.07},
    ],
    "signature": true
  },
  "astralsagemend": {
    "id": "astralsagemend",
    "name": "オーラリカバー",
    "active": {
      "type": "heal",
      "power": 0.29,
      "color": "#ffe066"
    },
    "cooldown": 7,
    "passive": {
      "hpMult": 1.26
    },
    "desc": "7秒ごと: パーティHPを 29% 回復 / 最大HP +26%",
    "tiers": [
      {"name":"オーラリカバー","power":0.29,"cooldown":7,"desc":"7秒ごと: パーティHPを 29% 回復 / 最大HP +26%"},
      {"name":"オーラリカバー・改","power":0.35,"cooldown":6,"desc":"6秒ごと: パーティHPを 35% 回復 / 最大HP +26%"},
      {"name":"オーラリカバー・皆伝","power":0.42,"cooldown":6,"desc":"6秒ごと: パーティHPを 42% 回復 / 最大HP +26%"},
    ],
    "signature": true
  },
  "nebulaqueenrally": {
    "id": "nebulaqueenrally",
    "name": "ヴォイドブースト",
    "active": {
      "type": "buff",
      "power": 0.28,
      "duration": 5,
      "color": "#b57bff"
    },
    "cooldown": 8,
    "passive": {
      "atkMult": 1.18
    },
    "desc": "8秒ごと: 5秒間 パーティ攻撃 +28% / 攻撃 +18%",
    "tiers": [
      {"name":"ヴォイドブースト","power":0.17,"cooldown":8,"desc":"8秒ごと: 5秒間 パーティ会心率 +17% / 攻撃 +18%"},
      {"name":"ヴォイドブースト・改","power":0.2,"cooldown":7,"desc":"7秒ごと: 5秒間 パーティ会心率 +20% / 攻撃 +18%"},
      {"name":"ヴォイドブースト・皆伝","power":0.23,"cooldown":7,"desc":"7秒ごと: 5秒間 パーティ会心率 +23% / 攻撃 +18%"},
    ],
    "signature": true
  },
  "cosmicasurastrike": {
    "id": "cosmicasurastrike",
    "name": "ヴォイドインパクト2",
    "active": {
      "type": "nuke",
      "fx": "beam",
      "power": 11.7,
      "color": "#b57bff"
    },
    "cooldown": 6,
    "passive": {
      "atkMult": 1.23
    },
    "desc": "6秒ごと: 敵に 攻撃×11.7 / 攻撃 +23%",
    "tiers": [
      {"name":"ヴォイドインパクト2","power":11.7,"cooldown":6,"desc":"6秒ごと: 敵に 攻撃×11.7 / 攻撃 +23%"},
      {"name":"ヴォイドインパクト2・改","power":14.6,"cooldown":5,"desc":"5秒ごと: 敵に 攻撃×14.6 / 攻撃 +23%"},
      {"name":"ヴォイドインパクト2・皆伝","power":18.1,"cooldown":5,"desc":"5秒ごと: 敵に 攻撃×18.1 / 攻撃 +23%"},
    ],
    "signature": true
  },
  "orbitguardianwall": {
    "id": "orbitguardianwall",
    "name": "アクアガード",
    "active": {
      "type": "guard",
      "power": 0.53,
      "duration": 5,
      "color": "#5bc0eb"
    },
    "cooldown": 9,
    "passive": {
      "hpMult": 1.28
    },
    "desc": "9秒ごと: 5秒間 かばう(被ダメ -53%) / 最大HP +28%",
    "tiers": [
      {"name":"アクアガード","power":0.53,"cooldown":9,"desc":"9秒ごと: 5秒間 かばう(被ダメ -53%) / 最大HP +28%"},
      {"name":"アクアガード・改","power":0.53,"cooldown":9,"desc":"9秒ごと: 5秒間 かばう(被ダメ -53%) / 最大HP +28%","passiveBoost":0.03},
      {"name":"アクアガード・皆伝","power":0.53,"cooldown":9,"desc":"9秒ごと: 5秒間 かばう(被ダメ -53%) / 最大HP +28%","passiveBoost":0.07},
    ],
    "signature": true
  },
  "shinemend": {
    "id": "shinemend",
    "name": "シャインメンド",
    "active": {
      "type": "heal",
      "power": 0.22,
      "color": "#ffe066"
    },
    "cooldown": 6,
    "passive": {
      "hpMult": 1.2
    },
    "desc": "6秒ごと: パーティHPを 22% 回復 / 最大HP +20%",
    "tiers": [
      {"name":"シャインメンド","power":0.22,"cooldown":6,"desc":"6秒ごと: パーティHPを 22% 回復 / 最大HP +20%"},
      {"name":"シャインメンド・改","power":0.26,"cooldown":5,"desc":"5秒ごと: パーティHPを 26% 回復 / 最大HP +20%"},
      {"name":"シャインメンド・皆伝","power":0.32,"cooldown":5,"desc":"5秒ごと: パーティHPを 32% 回復 / 最大HP +20%"},
    ],
    "signature": true
  },
  "wlightfell": {
    "id": "wlightfell",
    "name": "ルミナフィニッシュ",
    "active": {
      "type": "nuke",
      "kind": "execute",
      "fx": "slash",
      "power": 5.1,
      "execTh": 0.35,
      "execMult": 2.2,
      "color": "#ffe066"
    },
    "cooldown": 5,
    "desc": "5秒ごと: 敵に 攻撃×5.1(HP35%未満に×2.2)",
    "poolStars": 4,
    "season": "2026-W29"
  },
  "shinemend2": {
    "id": "shinemend2",
    "name": "シャインメンド",
    "active": {
      "type": "heal",
      "power": 0.22,
      "color": "#ffe066"
    },
    "cooldown": 6,
    "passive": {
      "hpMult": 1.2
    },
    "desc": "6秒ごと: パーティHPを 22% 回復 / 最大HP +20%",
    "tiers": [
      {"name":"シャインメンド","power":0.36,"cooldown":7,"desc":"7秒ごと: 8秒かけて パーティHPを合計 36% 回復(リジェネ) / 最大HP +20%"},
      {"name":"シャインメンド・改","power":0.43,"cooldown":6,"desc":"6秒ごと: 8秒かけて パーティHPを合計 43% 回復(リジェネ) / 最大HP +20%"},
      {"name":"シャインメンド・皆伝","power":0.52,"cooldown":6,"desc":"6秒ごと: 8秒かけて パーティHPを合計 52% 回復(リジェネ) / 最大HP +20%"},
    ],
    "signature": true
  },
  "wlightfell2": {
    "id": "wlightfell2",
    "name": "ルミナ断2",
    "active": {
      "type": "nuke",
      "kind": "execute",
      "fx": "slash",
      "power": 5.1,
      "execTh": 0.35,
      "execMult": 2.2,
      "color": "#ffe066"
    },
    "cooldown": 5,
    "desc": "5秒ごと: 敵に 攻撃×5.1(HP35%未満に×2.2)",
    "poolStars": 4,
    "season": "2026-W29"
  },
  "wlighttempo": {
    "id": "wlighttempo",
    "name": "ルミナテンポ",
    "active": {
      "type": "buff",
      "kind": "haste",
      "power": 0.36,
      "duration": 5,
      "color": "#ffe066"
    },
    "cooldown": 7,
    "desc": "7秒ごと: 5秒間 パーティの攻撃速度+36%",
    "poolStars": 7,
    "season": "2026-W30"
  }
};

export const EXTRA_SPECIES = [
  {
    "id": "emberbee",
    "name": "エンバービー",
    "rarity": "rare",
    "element": "fire",
    "baseAtk": 11,
    "baseHp": 81,
    "skillId": "emberimpact",
    "spriteFallback": "blazegecko",
    "generated": true
  },
  {
    "id": "rockmouse",
    "name": "ロックマウス",
    "rarity": "rare",
    "element": "earth",
    "baseAtk": 11,
    "baseHp": 82,
    "skillId": "rockblast",
    "spriteFallback": "thornfox",
    "generated": true
  },
  {
    "id": "rubyslime",
    "name": "ルビースライム",
    "rarity": "common",
    "element": "fire",
    "baseAtk": 4,
    "baseHp": 71,
    "skillId": "rubyslimewall",
    "spriteFallback": "flamewolf",
    "generated": true
  },
  {
    "id": "bluefin",
    "name": "ブルーフィン",
    "rarity": "common",
    "element": "water",
    "baseAtk": 7,
    "baseHp": 47,
    "skillId": "bluefinstrike",
    "spriteFallback": "aquafox",
    "generated": true
  },
  {
    "id": "cloudpuff",
    "name": "クラウドパフ",
    "rarity": "common",
    "element": "wind",
    "baseAtk": 6,
    "baseHp": 53,
    "skillId": "cloudpuffrally",
    "spriteFallback": "galebird",
    "generated": true
  },
  {
    "id": "barkbeetle",
    "name": "バークビートル",
    "rarity": "common",
    "element": "earth",
    "baseAtk": 4,
    "baseHp": 69,
    "skillId": "barkbeetlewall",
    "spriteFallback": "terrashell",
    "generated": true
  },
  {
    "id": "shadeorb",
    "name": "シェイドオーブ",
    "rarity": "common",
    "element": "dark",
    "baseAtk": 7,
    "baseHp": 45,
    "skillId": "shadeorbstrike",
    "spriteFallback": "nightraven",
    "generated": true
  },
  {
    "id": "glowmoth",
    "name": "グロウモス",
    "rarity": "common",
    "element": "light",
    "baseAtk": 5,
    "baseHp": 62,
    "skillId": "glowmothmend",
    "spriteFallback": "solarcat",
    "generated": true
  },
  {
    "id": "flamewisp",
    "name": "フレイムウィスプ",
    "rarity": "common",
    "element": "fire",
    "baseAtk": 7,
    "baseHp": 49,
    "skillId": "flamewispstrike",
    "spriteFallback": "flamewolf",
    "generated": true
  },
  {
    "id": "dewdrop",
    "name": "デュードロップ",
    "rarity": "common",
    "element": "water",
    "baseAtk": 5,
    "baseHp": 58,
    "skillId": "dewdropmend",
    "spriteFallback": "aquafox",
    "generated": true
  },
  {
    "id": "boneskull",
    "name": "ボーンスカル",
    "rarity": "common",
    "element": "dark",
    "baseAtk": 4,
    "baseHp": 71,
    "skillId": "boneskullwall",
    "spriteFallback": "nightraven",
    "generated": true
  },
  {
    "id": "pondturtle",
    "name": "ポンドタートル",
    "rarity": "common",
    "element": "water",
    "baseAtk": 4,
    "baseHp": 72,
    "skillId": "pondturtlewall",
    "spriteFallback": "aquafox",
    "generated": true
  },
  {
    "id": "nightbat",
    "name": "ナイトバット",
    "rarity": "common",
    "element": "dark",
    "baseAtk": 7,
    "baseHp": 48,
    "skillId": "nightbatstrike",
    "spriteFallback": "nightraven",
    "generated": true
  },
  {
    "id": "cinderdrake",
    "name": "シンダードレイク",
    "rarity": "common",
    "element": "fire",
    "baseAtk": 7,
    "baseHp": 49,
    "skillId": "cinderdrakestrike",
    "spriteFallback": "flamewolf",
    "generated": true
  },
  {
    "id": "sproutpot",
    "name": "スプラウトポット",
    "rarity": "common",
    "element": "earth",
    "baseAtk": 5,
    "baseHp": 59,
    "skillId": "sproutpotmend",
    "spriteFallback": "terrashell",
    "generated": true
  },
  {
    "id": "paleflame",
    "name": "ペールフレイム",
    "rarity": "common",
    "element": "light",
    "baseAtk": 5,
    "baseHp": 55,
    "skillId": "paleflamerally",
    "spriteFallback": "solarcat",
    "generated": true
  },
  {
    "id": "leafghost",
    "name": "リーフゴースト",
    "rarity": "common",
    "element": "wind",
    "baseAtk": 7,
    "baseHp": 46,
    "skillId": "leafghoststrike",
    "spriteFallback": "galebird",
    "generated": true
  },
  {
    "id": "rockgolem",
    "name": "ロックゴーレム",
    "rarity": "common",
    "element": "earth",
    "baseAtk": 4,
    "baseHp": 70,
    "skillId": "rockgolemwall",
    "spriteFallback": "terrashell",
    "generated": true
  },
  {
    "id": "whitepixie",
    "name": "ホワイトピクシー",
    "rarity": "common",
    "element": "light",
    "baseAtk": 5,
    "baseHp": 61,
    "skillId": "whitepixiemend",
    "spriteFallback": "solarcat",
    "generated": true
  },
  {
    "id": "salamander",
    "name": "サラマンドラ",
    "rarity": "common",
    "element": "fire",
    "baseAtk": 7,
    "baseHp": 48,
    "skillId": "salamanderstrike",
    "spriteFallback": "flamewolf",
    "generated": true
  },
  {
    "id": "aquafrog",
    "name": "アクアフロッグ",
    "rarity": "common",
    "element": "water",
    "baseAtk": 4,
    "baseHp": 74,
    "skillId": "aquafrogwall",
    "spriteFallback": "aquafox",
    "generated": true
  },
  {
    "id": "pinkslime",
    "name": "ピンクスライム",
    "rarity": "common",
    "element": "light",
    "baseAtk": 5,
    "baseHp": 57,
    "skillId": "pinkslimemend",
    "spriteFallback": "solarcat",
    "generated": true
  },
  {
    "id": "honeyslime",
    "name": "ハニースライム",
    "rarity": "common",
    "element": "earth",
    "baseAtk": 6,
    "baseHp": 55,
    "skillId": "honeyslimerally",
    "spriteFallback": "terrashell",
    "generated": true
  },
  {
    "id": "bonedrake",
    "name": "ボーンドレイク",
    "rarity": "rare",
    "element": "fire",
    "baseAtk": 10,
    "baseHp": 80,
    "skillId": "bonedrakestrike",
    "spriteFallback": "flamewolf",
    "generated": true
  },
  {
    "id": "mistwhale",
    "name": "ミストホエール",
    "rarity": "rare",
    "element": "water",
    "baseAtk": 6,
    "baseHp": 129,
    "skillId": "mistwhalewall",
    "spriteFallback": "aquafox",
    "generated": true
  },
  {
    "id": "sylphdrake",
    "name": "シルフドレイク",
    "rarity": "rare",
    "element": "wind",
    "baseAtk": 8,
    "baseHp": 94,
    "skillId": "sylphdrakerally",
    "spriteFallback": "galebird",
    "generated": true
  },
  {
    "id": "shinepot",
    "name": "シャインポット",
    "rarity": "rare",
    "element": "light",
    "baseAtk": 7,
    "baseHp": 99,
    "skillId": "shinepotmend",
    "spriteFallback": "solarcat",
    "generated": true
  },
  {
    "id": "duskwyvern",
    "name": "ダスクワイバーン",
    "rarity": "rare",
    "element": "dark",
    "baseAtk": 10,
    "baseHp": 76,
    "skillId": "duskwyvernstrike",
    "spriteFallback": "nightraven",
    "generated": true
  },
  {
    "id": "coilserpent",
    "name": "コイルサーペント",
    "rarity": "rare",
    "element": "water",
    "baseAtk": 10,
    "baseHp": 82,
    "skillId": "coilserpentstrike",
    "spriteFallback": "aquafox",
    "generated": true
  },
  {
    "id": "ribbonbat",
    "name": "リボンバット",
    "rarity": "rare",
    "element": "dark",
    "baseAtk": 8,
    "baseHp": 88,
    "skillId": "ribbonbatrally",
    "spriteFallback": "nightraven",
    "generated": true
  },
  {
    "id": "emberfox",
    "name": "エンバーフォックス",
    "rarity": "rare",
    "element": "fire",
    "baseAtk": 9,
    "baseHp": 93,
    "skillId": "emberfoxrally",
    "spriteFallback": "flamewolf",
    "generated": true
  },
  {
    "id": "soulflame",
    "name": "ソウルフレイム",
    "rarity": "rare",
    "element": "dark",
    "baseAtk": 10,
    "baseHp": 78,
    "skillId": "soulflamestrike",
    "spriteFallback": "nightraven",
    "generated": true
  },
  {
    "id": "leafbeetle",
    "name": "リーフビートル",
    "rarity": "rare",
    "element": "earth",
    "baseAtk": 6,
    "baseHp": 122,
    "skillId": "leafbeetlewall",
    "spriteFallback": "terrashell",
    "generated": true
  },
  {
    "id": "archermouse",
    "name": "アーチャーマウス",
    "rarity": "rare",
    "element": "wind",
    "baseAtk": 10,
    "baseHp": 80,
    "skillId": "archermousestrike",
    "spriteFallback": "galebird",
    "generated": true
  },
  {
    "id": "skypony",
    "name": "スカイポニー",
    "rarity": "rare",
    "element": "wind",
    "baseAtk": 7,
    "baseHp": 97,
    "skillId": "skyponymend",
    "spriteFallback": "galebird",
    "generated": true
  },
  {
    "id": "kingshroom",
    "name": "キングシュルーム",
    "rarity": "rare",
    "element": "earth",
    "baseAtk": 8,
    "baseHp": 85,
    "skillId": "kingshroomrally",
    "spriteFallback": "terrashell",
    "generated": true
  },
  {
    "id": "whitegolem",
    "name": "ホワイトゴーレム",
    "rarity": "rare",
    "element": "light",
    "baseAtk": 6,
    "baseHp": 121,
    "skillId": "whitegolemwall",
    "spriteFallback": "solarcat",
    "generated": true
  },
  {
    "id": "bubblefrog",
    "name": "バブルフロッグ",
    "rarity": "rare",
    "element": "water",
    "baseAtk": 7,
    "baseHp": 97,
    "skillId": "bubblefrogmend",
    "spriteFallback": "aquafox",
    "generated": true
  },
  {
    "id": "knightcat",
    "name": "キャットナイト",
    "rarity": "rare",
    "element": "light",
    "baseAtk": 6,
    "baseHp": 120,
    "skillId": "knightcatwall",
    "spriteFallback": "solarcat",
    "generated": true
  },
  {
    "id": "redimp",
    "name": "レッドインプ",
    "rarity": "rare",
    "element": "fire",
    "baseAtk": 10,
    "baseHp": 81,
    "skillId": "redimpstrike",
    "spriteFallback": "flamewolf",
    "generated": true
  },
  {
    "id": "graywarden",
    "name": "グレイウォーデン",
    "rarity": "rare",
    "element": "dark",
    "baseAtk": 6,
    "baseHp": 115,
    "skillId": "graywardenwall",
    "spriteFallback": "nightraven",
    "generated": true
  },
  {
    "id": "blazebone",
    "name": "ブレイズボーン",
    "rarity": "ultra",
    "element": "fire",
    "baseAtk": 15,
    "baseHp": 111,
    "skillId": "blazebonestrike",
    "spriteFallback": "flamewolf",
    "generated": true
  },
  {
    "id": "treant",
    "name": "トレント",
    "rarity": "ultra",
    "element": "earth",
    "baseAtk": 9,
    "baseHp": 162,
    "skillId": "treantwall",
    "spriteFallback": "terrashell",
    "generated": true
  },
  {
    "id": "gusthawk",
    "name": "ガストホーク",
    "rarity": "ultra",
    "element": "wind",
    "baseAtk": 15,
    "baseHp": 108,
    "skillId": "gusthawkstrike",
    "spriteFallback": "galebird",
    "generated": true
  },
  {
    "id": "blossompot",
    "name": "ブロッサムポット",
    "rarity": "ultra",
    "element": "earth",
    "baseAtk": 10,
    "baseHp": 141,
    "skillId": "blossompotmend",
    "spriteFallback": "terrashell",
    "generated": true
  },
  {
    "id": "voidcat",
    "name": "ヴォイドキャット",
    "rarity": "ultra",
    "element": "dark",
    "baseAtk": 15,
    "baseHp": 108,
    "skillId": "voidcatstrike",
    "spriteFallback": "nightraven",
    "generated": true
  },
  {
    "id": "magmafox",
    "name": "マグマフォックス",
    "rarity": "ultra",
    "element": "fire",
    "baseAtk": 14,
    "baseHp": 114,
    "skillId": "magmafoxstrike",
    "spriteFallback": "flamewolf",
    "generated": true
  },
  {
    "id": "blueflare",
    "name": "ブルーフレア",
    "rarity": "ultra",
    "element": "water",
    "baseAtk": 12,
    "baseHp": 119,
    "skillId": "blueflarerally",
    "spriteFallback": "aquafox",
    "generated": true
  },
  {
    "id": "coralotter",
    "name": "コーラルオッター",
    "rarity": "ultra",
    "element": "water",
    "baseAtk": 10,
    "baseHp": 131,
    "skillId": "coralottermend",
    "spriteFallback": "aquafox",
    "generated": true
  },
  {
    "id": "gargoyle",
    "name": "ガーゴイル",
    "rarity": "ultra",
    "element": "earth",
    "baseAtk": 9,
    "baseHp": 170,
    "skillId": "gargoylewall",
    "spriteFallback": "terrashell",
    "generated": true
  },
  {
    "id": "pinkfairy",
    "name": "ピンクフェアリー",
    "rarity": "ultra",
    "element": "light",
    "baseAtk": 10,
    "baseHp": 139,
    "skillId": "pinkfairymend",
    "spriteFallback": "solarcat",
    "generated": true
  },
  {
    "id": "magmagolem",
    "name": "マグマゴーレム",
    "rarity": "ultra",
    "element": "fire",
    "baseAtk": 8,
    "baseHp": 173,
    "skillId": "magmagolemwall",
    "spriteFallback": "flamewolf",
    "generated": true
  },
  {
    "id": "shieldmouse",
    "name": "シールドマウス",
    "rarity": "ultra",
    "element": "light",
    "baseAtk": 9,
    "baseHp": 178,
    "skillId": "shieldmousewall",
    "spriteFallback": "solarcat",
    "generated": true
  },
  {
    "id": "lavaserpent",
    "name": "ラーヴァサーペント",
    "rarity": "ultra",
    "element": "fire",
    "baseAtk": 16,
    "baseHp": 114,
    "skillId": "lavaserpentstrike",
    "spriteFallback": "flamewolf",
    "generated": true
  },
  {
    "id": "fountainfrog",
    "name": "ファウンテンフロッグ",
    "rarity": "ultra",
    "element": "water",
    "baseAtk": 10,
    "baseHp": 137,
    "skillId": "fountainfrogmend",
    "spriteFallback": "aquafox",
    "generated": true
  },
  {
    "id": "shadowknight",
    "name": "シャドウナイト",
    "rarity": "ultra",
    "element": "dark",
    "baseAtk": 14,
    "baseHp": 112,
    "skillId": "shadowknightstrike",
    "spriteFallback": "nightraven",
    "generated": true
  },
  {
    "id": "drakelord",
    "name": "ドレイクロード",
    "rarity": "legend",
    "element": "fire",
    "baseAtk": 25,
    "baseHp": 134,
    "skillId": "drakelordstrike",
    "spriteFallback": "flamewolf",
    "generated": true
  },
  {
    "id": "siren",
    "name": "セイレーン",
    "rarity": "legend",
    "element": "water",
    "baseAtk": 16,
    "baseHp": 173,
    "skillId": "sirenmend",
    "spriteFallback": "aquafox",
    "generated": true
  },
  {
    "id": "griffon",
    "name": "グリフォン",
    "rarity": "legend",
    "element": "wind",
    "baseAtk": 24,
    "baseHp": 138,
    "skillId": "griffonstrike",
    "spriteFallback": "galebird",
    "generated": true
  },
  {
    "id": "jadeogre",
    "name": "ジェイドオーガ",
    "rarity": "legend",
    "element": "earth",
    "baseAtk": 15,
    "baseHp": 219,
    "skillId": "jadeogrewall",
    "spriteFallback": "terrashell",
    "generated": true
  },
  {
    "id": "darkknight",
    "name": "ダークナイト",
    "rarity": "legend",
    "element": "dark",
    "baseAtk": 25,
    "baseHp": 135,
    "skillId": "darkknightstrike",
    "spriteFallback": "nightraven",
    "generated": true
  },
  {
    "id": "haloangel",
    "name": "ハロエンジェル",
    "rarity": "legend",
    "element": "light",
    "baseAtk": 18,
    "baseHp": 170,
    "skillId": "haloangelmend",
    "spriteFallback": "solarcat",
    "generated": true
  },
  {
    "id": "flameogre",
    "name": "フレイムオーガ",
    "rarity": "legend",
    "element": "fire",
    "baseAtk": 14,
    "baseHp": 205,
    "skillId": "flameogrewall",
    "spriteFallback": "flamewolf",
    "generated": true
  },
  {
    "id": "worldsprout",
    "name": "ワールドスプラウト",
    "rarity": "legend",
    "element": "earth",
    "baseAtk": 17,
    "baseHp": 174,
    "skillId": "worldsproutmend",
    "spriteFallback": "terrashell",
    "generated": true
  },
  {
    "id": "stormpaladin",
    "name": "ストームパラディン",
    "rarity": "legend",
    "element": "wind",
    "baseAtk": 15,
    "baseHp": 218,
    "skillId": "stormpaladinwall",
    "spriteFallback": "galebird",
    "generated": true
  },
  {
    "id": "dryadqueen",
    "name": "ドライアドクイーン",
    "rarity": "legend",
    "element": "earth",
    "baseAtk": 19,
    "baseHp": 170,
    "skillId": "dryadqueenrally",
    "spriteFallback": "terrashell",
    "generated": true
  },
  {
    "id": "darkbehemoth",
    "name": "ダークベヒモス",
    "rarity": "legend",
    "element": "dark",
    "baseAtk": 15,
    "baseHp": 212,
    "skillId": "darkbehemothwall",
    "spriteFallback": "nightraven",
    "generated": true
  },
  {
    "id": "heromouse",
    "name": "ヒーローマウス",
    "rarity": "legend",
    "element": "light",
    "baseAtk": 26,
    "baseHp": 141,
    "skillId": "heromousestrike",
    "spriteFallback": "solarcat",
    "generated": true
  },
  {
    "id": "phoenix",
    "name": "フェニックス",
    "rarity": "immortal",
    "element": "fire",
    "baseAtk": 27,
    "baseHp": 245,
    "skillId": "phoenixmend",
    "spriteFallback": "flamewolf",
    "generated": true
  },
  {
    "id": "tidalqueen",
    "name": "タイダルクイーン",
    "rarity": "immortal",
    "element": "water",
    "baseAtk": 39,
    "baseHp": 209,
    "skillId": "tidalqueenstrike",
    "spriteFallback": "aquafox",
    "generated": true
  },
  {
    "id": "royalgriffon",
    "name": "ロイヤルグリフォン",
    "rarity": "immortal",
    "element": "wind",
    "baseAtk": 24,
    "baseHp": 306,
    "skillId": "royalgriffonwall",
    "spriteFallback": "galebird",
    "generated": true
  },
  {
    "id": "luminfairy",
    "name": "ルミナフェアリー",
    "rarity": "immortal",
    "element": "light",
    "baseAtk": 27,
    "baseHp": 253,
    "skillId": "luminfairymend",
    "spriteFallback": "solarcat",
    "generated": true
  },
  {
    "id": "infernoknight",
    "name": "インフェルノナイト",
    "rarity": "immortal",
    "element": "fire",
    "baseAtk": 40,
    "baseHp": 218,
    "skillId": "infernoknightstrike",
    "spriteFallback": "flamewolf",
    "generated": true
  },
  {
    "id": "abyssaltoad",
    "name": "アビサルトード",
    "rarity": "immortal",
    "element": "water",
    "baseAtk": 23,
    "baseHp": 340,
    "skillId": "abyssaltoadwall",
    "spriteFallback": "aquafox",
    "generated": true
  },
  {
    "id": "bonemonarch",
    "name": "ボーンモナーク",
    "rarity": "immortal",
    "element": "dark",
    "baseAtk": 42,
    "baseHp": 216,
    "skillId": "bonemonarchstrike",
    "spriteFallback": "nightraven",
    "generated": true
  },
  {
    "id": "voidbehemoth",
    "name": "ヴォイドベヒモス",
    "rarity": "immortal",
    "element": "dark",
    "baseAtk": 24,
    "baseHp": 306,
    "skillId": "voidbehemothwall",
    "spriteFallback": "nightraven",
    "generated": true
  },
  {
    "id": "valkyrie",
    "name": "ヴァルキリー",
    "rarity": "immortal",
    "element": "light",
    "baseAtk": 40,
    "baseHp": 206,
    "skillId": "valkyriestrike",
    "spriteFallback": "solarcat",
    "generated": true
  },
  {
    "id": "generalmouse",
    "name": "ジェネラルマウス",
    "rarity": "immortal",
    "element": "earth",
    "baseAtk": 33,
    "baseHp": 249,
    "skillId": "generalmouserally",
    "spriteFallback": "terrashell",
    "generated": true
  },
  {
    "id": "crystaldragon",
    "name": "クリスタルドラゴン",
    "rarity": "arcana",
    "element": "light",
    "baseAtk": 66,
    "baseHp": 304,
    "skillId": "crystaldragonstrike",
    "spriteFallback": "solarcat",
    "generated": true
  },
  {
    "id": "abysswitch",
    "name": "アビスウィッチ",
    "rarity": "arcana",
    "element": "water",
    "baseAtk": 60,
    "baseHp": 314,
    "skillId": "abysswitchstrike",
    "spriteFallback": "aquafox",
    "generated": true
  },
  {
    "id": "gaiaflora",
    "name": "ガイアフローラ",
    "rarity": "arcana",
    "element": "earth",
    "baseAtk": 53,
    "baseHp": 362,
    "skillId": "gaiaflorarally",
    "spriteFallback": "terrashell",
    "generated": true
  },
  {
    "id": "nightwraith",
    "name": "ナイトレイス",
    "rarity": "arcana",
    "element": "dark",
    "baseAtk": 62,
    "baseHp": 302,
    "skillId": "nightwraithstrike",
    "spriteFallback": "nightraven",
    "generated": true
  },
  {
    "id": "dawnseraph",
    "name": "ドーンセラフ",
    "rarity": "arcana",
    "element": "light",
    "baseAtk": 44,
    "baseHp": 387,
    "skillId": "dawnseraphmend",
    "spriteFallback": "solarcat",
    "generated": true
  },
  {
    "id": "glacialsylph",
    "name": "グレイシャルシルフ",
    "rarity": "arcana",
    "element": "water",
    "baseAtk": 53,
    "baseHp": 354,
    "skillId": "glacialsylphrally",
    "spriteFallback": "aquafox",
    "generated": true
  },
  {
    "id": "goldlion",
    "name": "ゴールドレオン",
    "rarity": "beyond",
    "element": "light",
    "baseAtk": 98,
    "baseHp": 475,
    "skillId": "goldlionstrike",
    "spriteFallback": "solarcat",
    "generated": true
  },
  {
    "id": "marineoracle",
    "name": "マリンオラクル",
    "rarity": "beyond",
    "element": "water",
    "baseAtk": 67,
    "baseHp": 576,
    "skillId": "marineoraclemend",
    "spriteFallback": "aquafox",
    "generated": true
  },
  {
    "id": "gaiaseraph",
    "name": "ガイアセラフ",
    "rarity": "beyond",
    "element": "earth",
    "baseAtk": 57,
    "baseHp": 712,
    "skillId": "gaiaseraphwall",
    "spriteFallback": "terrashell",
    "generated": true
  },
  {
    "id": "starseraph",
    "name": "スターセラフ",
    "rarity": "beyond",
    "element": "light",
    "baseAtk": 103,
    "baseHp": 500,
    "skillId": "starseraphstrike",
    "spriteFallback": "solarcat",
    "generated": true
  },
  {
    "id": "divinewing",
    "name": "ディバインウィング",
    "rarity": "beyond",
    "element": "wind",
    "baseAtk": 78,
    "baseHp": 537,
    "skillId": "divinewingrally",
    "spriteFallback": "galebird",
    "generated": true
  },
  {
    "id": "twilightmuse",
    "name": "トワイライトミューズ",
    "rarity": "beyond",
    "element": "dark",
    "baseAtk": 70,
    "baseHp": 611,
    "skillId": "twilightmusemend",
    "spriteFallback": "nightraven",
    "generated": true
  },
  {
    "id": "sunmonarch",
    "name": "サンモナーク",
    "rarity": "beyond",
    "element": "fire",
    "baseAtk": 97,
    "baseHp": 466,
    "skillId": "sunmonarchstrike",
    "spriteFallback": "flamewolf",
    "generated": true
  },
  {
    "id": "jadetitan",
    "name": "ジェイドタイタン",
    "rarity": "beyond",
    "element": "earth",
    "baseAtk": 61,
    "baseHp": 756,
    "skillId": "jadetitanwall",
    "spriteFallback": "terrashell",
    "generated": true
  },
  {
    "id": "auroradancer",
    "name": "オーロラダンサー",
    "rarity": "beyond",
    "element": "wind",
    "baseAtk": 66,
    "baseHp": 594,
    "skillId": "auroradancermend",
    "spriteFallback": "galebird",
    "generated": true
  },
  {
    "id": "frostlich",
    "name": "フロストリッチ",
    "rarity": "century",
    "element": "water",
    "baseAtk": 155,
    "baseHp": 727,
    "skillId": "frostlichstrike",
    "spriteFallback": "aquafox",
    "generated": true
  },
  {
    "id": "thronemonarch",
    "name": "スローンモナーク",
    "rarity": "century",
    "element": "dark",
    "baseAtk": 95,
    "baseHp": 1112,
    "skillId": "thronemonarchwall",
    "spriteFallback": "nightraven",
    "generated": true
  },
  {
    "id": "astralsage",
    "name": "アストラルセージ",
    "rarity": "cosmic",
    "element": "light",
    "baseAtk": 197,
    "baseHp": 1304,
    "skillId": "astralsagemend",
    "spriteFallback": "solarcat",
    "generated": true
  },
  {
    "id": "nebulaqueen",
    "name": "ネビュラクイーン",
    "rarity": "cosmic",
    "element": "dark",
    "baseAtk": 236,
    "baseHp": 1250,
    "skillId": "nebulaqueenrally",
    "spriteFallback": "nightraven",
    "generated": true
  },
  {
    "id": "cosmicasura",
    "name": "コズミックアスラ",
    "rarity": "cosmic",
    "element": "dark",
    "baseAtk": 272,
    "baseHp": 1005,
    "skillId": "cosmicasurastrike",
    "spriteFallback": "nightraven",
    "generated": true
  },
  {
    "id": "orbitguardian",
    "name": "オービットガーディアン",
    "rarity": "cosmic",
    "element": "water",
    "baseAtk": 166,
    "baseHp": 1698,
    "skillId": "orbitguardianwall",
    "spriteFallback": "aquafox",
    "generated": true
  },
  {
    "id": "shinecat",
    "name": "シャインキャット",
    "rarity": "arcana",
    "element": "light",
    "baseAtk": 45,
    "baseHp": 401,
    "skillId": "shinemend",
    "spriteFallback": "sparkbee",
    "generated": true,
    "season": "2026-W29"
  },
  {
    "id": "shinecat2",
    "name": "ムーンキャット",
    "rarity": "arcana",
    "element": "light",
    "baseAtk": 45,
    "baseHp": 401,
    "skillId": "shinemend2",
    "spriteFallback": "sparkbee",
    "generated": true,
    "season": "2026-W29"
  }
];

export const EXTRA_EQUIPMENT = [
  {
    "id": "aurora_weapon",
    "name": "極光のブレイド",
    "part": "weapon",
    "rarity": "immortal",
    "affixes": [
      "critDmg",
      "atkPct",
      "cdr",
      "skillPower"
    ],
    "legendary": {
      "title": "極光",
      "lore": "極光の力を宿した武器。幾多の英雄を看取ってきた。"
    },
    "generated": true
  },
  {
    "id": "everfrost_sub",
    "name": "絶氷のイージス",
    "part": "sub",
    "rarity": "legend",
    "affixes": [
      "critRate",
      "cdr",
      "hpPct"
    ],
    "legendary": {
      "title": "絶氷",
      "lore": "絶氷の力を宿した盾。幾多の英雄を看取ってきた。"
    },
    "generated": true,
    "season": "2026-W29"
  },
  {
    "id": "everfrost_sub_2",
    "name": "絶氷のイージス2",
    "part": "sub",
    "rarity": "legend",
    "affixes": [
      "critRate",
      "cdr",
      "hpPct"
    ],
    "legendary": {
      "title": "絶氷",
      "lore": "絶氷の力を宿した盾。幾多の英雄を看取ってきた。"
    },
    "generated": true,
    "season": "2026-W29"
  }
,
  {
    "id": "lvb1_verdant",
    "name": "新緑の剣",
    "part": "weapon",
    "rarity": "arcana",
    "affixes": [
      "atkFlat",
      "atkPct",
      "critRate"
    ],
    "legendary": {
      "title": "新緑",
      "lore": "芽吹いたばかりの森の力を宿す一振り。すべての冒険はここから始まる。"
    },
    "special": {
      "auraTier": 1,
      "auraColor": "#e858c8"
    },
    "generated": true,
    "lvBand": 1
  },
  {
    "id": "lvb1_sunfleck",
    "name": "木漏れ日の盾",
    "part": "sub",
    "rarity": "arcana",
    "affixes": [
      "defPct",
      "hpPct",
      "goldBonus"
    ],
    "legendary": {
      "title": "木漏れ日",
      "lore": "木々の合間から差し込む光をそのまま鋳込んだ盾。"
    },
    "special": {
      "shiny": true
    },
    "generated": true,
    "lvBand": 1
  },
  {
    "id": "lvb1_sprout",
    "name": "若葉の鎧",
    "part": "armor",
    "rarity": "arcana",
    "affixes": [
      "hpPct",
      "defPct",
      "expBonus"
    ],
    "legendary": {
      "title": "若葉",
      "lore": "若い葉のようにしなやかで、それでいて折れない鎧。"
    },
    "generated": true,
    "lvBand": 1
  },
  {
    "id": "lvb5_seabreeze",
    "name": "潮風の弓",
    "part": "weapon",
    "rarity": "arcana",
    "affixes": [
      "atkFlat",
      "critRate",
      "atkSpeed"
    ],
    "legendary": {
      "title": "潮風",
      "lore": "遠く海から吹く風を弦に宿した弓。放たれた矢は迷わない。"
    },
    "special": {
      "auraTier": 1,
      "auraColor": "#e858c8"
    },
    "generated": true,
    "lvBand": 5
  },
  {
    "id": "lvb5_seashell",
    "name": "貝殻の兜",
    "part": "helm",
    "rarity": "arcana",
    "affixes": [
      "hpFlat",
      "defPct",
      "cdr"
    ],
    "legendary": {
      "title": "貝殻",
      "lore": "浜辺で拾った大きな貝を鍛え直した兜。潮騒が聞こえるという。"
    },
    "special": {
      "shiny": true
    },
    "generated": true,
    "lvBand": 5
  },
  {
    "id": "lvb5_harbor",
    "name": "波止場の靴",
    "part": "boots",
    "rarity": "arcana",
    "affixes": [
      "atkSpeed",
      "goldBonus",
      "expBonus"
    ],
    "legendary": {
      "title": "波止場",
      "lore": "港町の職人が仕立てた靴。どんな地面も水面のように歩ける。"
    },
    "generated": true,
    "lvBand": 5
  },
  {
    "id": "lvb10_twilight",
    "name": "黄昏の双剣",
    "part": "weapon",
    "rarity": "beyond",
    "affixes": [
      "critRate",
      "critDmg",
      "atkSpeed"
    ],
    "legendary": {
      "title": "黄昏",
      "lore": "昼と夜のはざまの色をまとう双剣。二撃は一撃よりも静かに届く。"
    },
    "special": {
      "auraTier": 2,
      "auraColor": "#4ae0d0"
    },
    "generated": true,
    "lvBand": 10
  },
  {
    "id": "lvb10_flamelight",
    "name": "灯火のオーブ",
    "part": "sub",
    "rarity": "beyond",
    "affixes": [
      "defPct",
      "hpPct",
      "cdr"
    ],
    "legendary": {
      "title": "灯火",
      "lore": "小さな炎を閉じ込めたオーブ。持つ者の道を照らし続ける。"
    },
    "special": {
      "shiny": true
    },
    "generated": true,
    "lvBand": 10
  },
  {
    "id": "lvb10_crescent",
    "name": "三日月の兜",
    "part": "helm",
    "rarity": "beyond",
    "affixes": [
      "hpFlat",
      "critRate",
      "expBonus"
    ],
    "legendary": {
      "title": "三日月",
      "lore": "夜空に浮かぶ細い月を象った兜。静けさの中に力を秘める。"
    },
    "generated": true,
    "lvBand": 10
  },
  {
    "id": "lvb15_gale",
    "name": "疾風の斧",
    "part": "weapon",
    "rarity": "beyond",
    "affixes": [
      "atkFlat",
      "atkSpeed",
      "critDmg"
    ],
    "legendary": {
      "title": "疾風",
      "lore": "振るうたびに突風が生まれるという斧。重さを感じさせない一撃。"
    },
    "special": {
      "auraTier": 2,
      "auraColor": "#4ae0d0"
    },
    "generated": true,
    "lvBand": 15
  },
  {
    "id": "lvb15_whirlwind",
    "name": "旋風の鎧",
    "part": "armor",
    "rarity": "beyond",
    "affixes": [
      "defPct",
      "atkSpeed",
      "hpPct"
    ],
    "legendary": {
      "title": "旋風",
      "lore": "身にまとうと小さなつむじ風が足元を巡るという軽鎧。"
    },
    "special": {
      "shiny": true
    },
    "generated": true,
    "lvBand": 15
  },
  {
    "id": "lvb15_swiftfoot",
    "name": "韋駄天の靴",
    "part": "boots",
    "rarity": "beyond",
    "affixes": [
      "atkSpeed",
      "cdr",
      "goldBonus"
    ],
    "legendary": {
      "title": "韋駄天",
      "lore": "俊足の守護者の名を冠した靴。地を蹴る音すら置き去りにする。"
    },
    "generated": true,
    "lvBand": 15
  },
  {
    "id": "lvb20_crimsondeep",
    "name": "深緋の槍",
    "part": "weapon",
    "rarity": "century",
    "affixes": [
      "critDmg",
      "atkPct",
      "cdr"
    ],
    "legendary": {
      "title": "深緋",
      "lore": "深く濃い紅に染まった穂先を持つ槍。歴戦の証がその色を濃くする。"
    },
    "special": {
      "auraTier": 3,
      "auraColor": "#e6ecff"
    },
    "generated": true,
    "lvBand": 20
  },
  {
    "id": "lvb20_crimsonflame",
    "name": "紅蓮の矢筒",
    "part": "sub",
    "rarity": "century",
    "affixes": [
      "defPct",
      "critRate",
      "expBonus"
    ],
    "legendary": {
      "title": "紅蓮",
      "lore": "尽きることのない紅蓮の矢を宿す矢筒。放つたびに炎が舞う。"
    },
    "special": {
      "shiny": true
    },
    "generated": true,
    "lvBand": 20
  },
  {
    "id": "lvb20_lioncrest",
    "name": "獅子紋の鎧",
    "part": "armor",
    "rarity": "century",
    "affixes": [
      "hpPct",
      "defPct",
      "goldBonus"
    ],
    "legendary": {
      "title": "獅子紋",
      "lore": "百獣の王の紋章を刻んだ鎧。着る者に王者の風格を与える。"
    },
    "generated": true,
    "lvBand": 20
  },
  {
    "id": "lvb30_azuresky",
    "name": "蒼穹の杖",
    "part": "weapon",
    "rarity": "century",
    "affixes": [
      "skillPower",
      "cdr",
      "critDmg"
    ],
    "legendary": {
      "title": "蒼穹",
      "lore": "澄み渡る大空の色を宿す杖。振るえば天候すら味方につくという。"
    },
    "special": {
      "auraTier": 3,
      "auraColor": "#e6ecff"
    },
    "generated": true,
    "lvBand": 30
  },
  {
    "id": "lvb30_thunderclap",
    "name": "雷鳴の兜",
    "part": "helm",
    "rarity": "century",
    "affixes": [
      "hpFlat",
      "critRate",
      "atkSpeed"
    ],
    "legendary": {
      "title": "雷鳴",
      "lore": "遠雷の轟きを聞き分けるという兜。かぶる者の反応を研ぎ澄ませる。"
    },
    "special": {
      "shiny": true
    },
    "generated": true,
    "lvBand": 30
  },
  {
    "id": "lvb30_skysoar",
    "name": "飛翔の靴",
    "part": "boots",
    "rarity": "century",
    "affixes": [
      "atkSpeed",
      "cdr",
      "goldBonus"
    ],
    "legendary": {
      "title": "飛翔",
      "lore": "翼をもたぬ者に空を歩む感覚を与える靴。踏み出すたびに雲が生まれる。"
    },
    "generated": true,
    "lvBand": 30
  },
  {
    "id": "lvb40_abyss",
    "name": "深淵の戦槌",
    "part": "weapon",
    "rarity": "cosmic",
    "affixes": [
      "atkFlat",
      "critDmg",
      "atkPct"
    ],
    "legendary": {
      "title": "深淵",
      "lore": "底知れぬ深みの力を封じた戦槌。一撃は世界の重みを乗せる。"
    },
    "special": {
      "auraTier": 4,
      "auraColor": "#ad4aff"
    },
    "generated": true,
    "lvBand": 40
  },
  {
    "id": "lvb40_seal",
    "name": "封印の護符",
    "part": "sub",
    "rarity": "cosmic",
    "affixes": [
      "defPct",
      "hpPct",
      "cdr"
    ],
    "legendary": {
      "title": "封印",
      "lore": "古の災いを封じ続けてきた護符。持つ者を守る結界を編む。"
    },
    "special": {
      "shiny": true
    },
    "generated": true,
    "lvBand": 40
  },
  {
    "id": "lvb40_phantom",
    "name": "幻影の兜",
    "part": "helm",
    "rarity": "cosmic",
    "affixes": [
      "hpFlat",
      "critRate",
      "expBonus"
    ],
    "legendary": {
      "title": "幻影",
      "lore": "かぶる者の姿を揺らめかせるという兜。実像と幻の境が曖昧になる。"
    },
    "generated": true,
    "lvBand": 40
  },
  {
    "id": "lvb50_revelation",
    "name": "天啓の大鎌",
    "part": "weapon",
    "rarity": "cosmic",
    "affixes": [
      "critDmg",
      "skillPower",
      "atkPct"
    ],
    "legendary": {
      "title": "天啓",
      "lore": "振るった者だけに見える啓示があるという大鎌。運命を刈り取る。"
    },
    "special": {
      "auraTier": 4,
      "auraColor": "#ad4aff"
    },
    "generated": true,
    "lvBand": 50
  },
  {
    "id": "lvb50_sanctuary",
    "name": "聖域の鎧",
    "part": "armor",
    "rarity": "cosmic",
    "affixes": [
      "hpPct",
      "defPct",
      "goldBonus"
    ],
    "legendary": {
      "title": "聖域",
      "lore": "神域の加護をまとう鎧。触れる者すべてを静かに癒す。"
    },
    "special": {
      "shiny": true
    },
    "generated": true,
    "lvBand": 50
  },
  {
    "id": "lvb50_heavenstride",
    "name": "天翔の靴",
    "part": "boots",
    "rarity": "cosmic",
    "affixes": [
      "atkSpeed",
      "cdr",
      "expBonus"
    ],
    "legendary": {
      "title": "天翔",
      "lore": "天へと駆け上がる翼を持たぬ者のための靴。歩みは光を残す。"
    },
    "generated": true,
    "lvBand": 50
  },
  {
    "id": "lvb60_starfrost",
    "name": "星霜の魔導書",
    "part": "weapon",
    "rarity": "celestial",
    "affixes": [
      "skillPower",
      "critDmg",
      "cdr"
    ],
    "legendary": {
      "title": "星霜",
      "lore": "幾星霜を経てなお色褪せぬ知識を封じた魔導書。頁は自ら開く。"
    },
    "special": {
      "auraTier": 5,
      "auraColor": "#fff6d8"
    },
    "generated": true,
    "lvBand": 60
  },
  {
    "id": "lvb60_everlantern",
    "name": "常夜灯のランタン",
    "part": "sub",
    "rarity": "celestial",
    "affixes": [
      "defPct",
      "hpPct",
      "goldBonus"
    ],
    "legendary": {
      "title": "常夜灯",
      "lore": "百年消えぬと伝わるランタン。持つ者の道を絶えず照らす。"
    },
    "special": {
      "shiny": true
    },
    "generated": true,
    "lvBand": 60
  },
  {
    "id": "lvb60_eternity",
    "name": "悠久の鎧",
    "part": "armor",
    "rarity": "celestial",
    "affixes": [
      "hpPct",
      "defPct",
      "expBonus"
    ],
    "legendary": {
      "title": "悠久",
      "lore": "時の流れに磨かれ続けた鎧。古びるどころか輝きを増していく。"
    },
    "generated": true,
    "lvBand": 60
  },
  {
    "id": "lvb65_stardust",
    "name": "星屑の鞭",
    "part": "weapon",
    "rarity": "celestial",
    "affixes": [
      "critRate",
      "atkSpeed",
      "critDmg"
    ],
    "legendary": {
      "title": "星屑",
      "lore": "夜空からこぼれた星の欠片を編み込んだ鞭。振るえば軌跡が瞬く。"
    },
    "special": {
      "auraTier": 5,
      "auraColor": "#fff6d8"
    },
    "generated": true,
    "lvBand": 65
  },
  {
    "id": "lvb65_galaxy",
    "name": "銀河の兜",
    "part": "helm",
    "rarity": "celestial",
    "affixes": [
      "hpFlat",
      "critRate",
      "skillPower"
    ],
    "legendary": {
      "title": "銀河",
      "lore": "遠い銀河の渦を閉じ込めた兜。かぶる者の視野は宇宙にまで届く。"
    },
    "special": {
      "shiny": true
    },
    "generated": true,
    "lvBand": 65
  },
  {
    "id": "lvb65_meteor",
    "name": "流星の靴",
    "part": "boots",
    "rarity": "celestial",
    "affixes": [
      "atkSpeed",
      "cdr",
      "goldBonus"
    ],
    "legendary": {
      "title": "流星",
      "lore": "夜空を駆ける流星の速さを宿す靴。願いを叶える暇すら与えない。"
    },
    "generated": true,
    "lvBand": 65
  },
  {
    "id": "lvb80_empyrean",
    "name": "天空の大剣",
    "part": "weapon",
    "rarity": "celestial",
    "affixes": [
      "critDmg",
      "atkPct",
      "skillPower"
    ],
    "legendary": {
      "title": "天空",
      "lore": "この世の頂に立つ者だけが振るえるという大剣。一振りに天が応える。"
    },
    "special": {
      "auraTier": 5,
      "auraColor": "#fff6d8"
    },
    "generated": true,
    "lvBand": 80
  },
  {
    "id": "lvb80_divinebell",
    "name": "神鐘の鈴",
    "part": "sub",
    "rarity": "celestial",
    "affixes": [
      "defPct",
      "hpPct",
      "cdr"
    ],
    "legendary": {
      "title": "神鐘",
      "lore": "鳴らすたびに天地が静まるという鈴。すべての戦いの終わりを告げる。"
    },
    "special": {
      "shiny": true
    },
    "generated": true,
    "lvBand": 80
  },
  {
    "id": "lvb80_godsdomain",
    "name": "神域の兜",
    "part": "helm",
    "rarity": "celestial",
    "affixes": [
      "hpFlat",
      "critRate",
      "skillPower"
    ],
    "legendary": {
      "title": "神域",
      "lore": "神々の座す領域の一片を戴く兜。かぶる者はもはや人ならざる者。"
    },
    "generated": true,
    "lvBand": 80
  }
];

export const EXTRA_PERKS = {
  "sp2026w29bastion": {
    "id": "sp2026w29bastion",
    "label": "城塞の秘紋",
    "special": true,
    "desc": "被ダメージ-5%",
    "stat": {
      "defCut": 0.05
    },
    "season": "2026-W29"
  },
  "sp2026w30bastion": {
    "id": "sp2026w30bastion",
    "label": "城塞の秘紋",
    "special": true,
    "desc": "被ダメージ-3%",
    "stat": {
      "defCut": 0.03
    },
    "season": "2026-W30"
  }
};

export const EXTRA_SPHERE = [
  {
    "id": "x2026w29_0",
    "stat": "def",
    "type": "small",
    "x": 1780,
    "y": 1159,
    "edges": [
      "c31_6"
    ],
    "season": "2026-W29"
  },
  {
    "id": "x2026w29_1",
    "stat": "skill",
    "type": "small",
    "x": 1735,
    "y": 1172,
    "edges": [
      "x2026w29_0"
    ],
    "season": "2026-W29"
  },
  {
    "id": "x2026w29_2",
    "stat": "gold",
    "type": "small",
    "x": 1701,
    "y": 1122,
    "edges": [
      "x2026w29_1"
    ],
    "season": "2026-W29"
  },
  {
    "id": "x2026w29_3",
    "stat": "def",
    "type": "small",
    "x": 1710,
    "y": 1107,
    "edges": [
      "x2026w29_2"
    ],
    "season": "2026-W29"
  },
  {
    "id": "x2026w29_4",
    "stat": "def",
    "type": "small",
    "x": 1765,
    "y": 1096,
    "edges": [
      "x2026w29_3"
    ],
    "season": "2026-W29"
  },
  {
    "id": "x2026w29_core",
    "stat": null,
    "type": "special",
    "grants": [
      "sp2026w29bastion"
    ],
    "x": 1745,
    "y": 1133,
    "edges": [
      "x2026w29_0",
      "x2026w29_2"
    ],
    "season": "2026-W29"
  },
  {
    "id": "x2026w30_0",
    "stat": "hp",
    "type": "small",
    "x": 1892,
    "y": 369,
    "edges": [
      "c11_6"
    ],
    "season": "2026-W30"
  },
  {
    "id": "x2026w30_1",
    "stat": "hp",
    "type": "small",
    "x": 1854,
    "y": 389,
    "edges": [
      "x2026w30_0"
    ],
    "season": "2026-W30"
  },
  {
    "id": "x2026w30_2",
    "stat": "speed",
    "type": "small",
    "x": 1806,
    "y": 353,
    "edges": [
      "x2026w30_1"
    ],
    "season": "2026-W30"
  },
  {
    "id": "x2026w30_3",
    "stat": "drop",
    "type": "small",
    "x": 1826,
    "y": 316,
    "edges": [
      "x2026w30_2"
    ],
    "season": "2026-W30"
  },
  {
    "id": "x2026w30_4",
    "stat": "skill",
    "type": "small",
    "x": 1867,
    "y": 311,
    "edges": [
      "x2026w30_3"
    ],
    "season": "2026-W30"
  },
  {
    "id": "x2026w30_core",
    "stat": null,
    "type": "special",
    "grants": [
      "sp2026w30bastion"
    ],
    "x": 1852,
    "y": 349,
    "edges": [
      "x2026w30_0",
      "x2026w30_2"
    ],
    "season": "2026-W30"
  }
];

export const EXTRA_JOBS = [];

export const EXTRA_EXPEDITION_SPOTS = [];

export const EXTRA_DAILY_BOSSES = [];

export const EXTRA_MAILS = [];

export const EXTRA_TUNING = {};
