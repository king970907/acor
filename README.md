# ACOR

**AI Context Orchestration Runtime** — 管理 Claude Code 的 skills 與 rules，讓開發者自行選擇、團隊統一同步。

```
   ___   _____  ____  ____
  / _ | / ___/ / __ \/ __ \
 / __ |/ /__  / /_/ / /_/ /
/_/ |_|\___/  \____/\____/
```

---

## 解決的問題

- 每個新專案都要手動建 `.claude/skills/` 和 `.claude/rules/`，重複費時
- 團隊成員各自安裝不同的 skills，環境不一致
- 安裝了衝突的 rules（A 說 single quotes、B 說 double quotes）沒有人發現

---

## 核心設計

### CLI 搬運，Claude 分析

| 層級 | 工具 | 職責 |
|------|------|------|
| CLI（`acor`） | Node.js | 選擇 skills、安裝、移除、同步 |
| Skills（`/acor-scan`、`/acor-apply`） | Claude 執行 | 分析衝突、處理矛盾、合併優化 |

### 使用者自主選擇，不靠 AI 推薦

開發者最了解自己的專案。ACOR 提供清單讓你選，CLI 負責安裝，不猜測你需要什麼。

### `acor.json` 是 source of truth

宣告專案使用哪些 skills/rules，進 git，讓所有人 `acor init` 就能還原一致的環境。

---

## 安裝

**需求：** Node.js >= 18.0.0

```bash
git clone git@github.com:yourorg/acor.git
cd acor
npm install
npm install -g .

# 確認安裝
acor --version
```

---

## 設定 Hub（skills 來源）

在 `~/.acor/config.json` 設定 hub 路徑：

**本地資料夾：**
```json
{
  "registry": {
    "path": "/path/to/acor-hub"
  }
}
```

**Git 倉庫：**
```json
{
  "registry": {
    "url": "https://github.com/yourorg/acor-hub",
    "branch": "main"
  }
}
```

---

## 使用流程

```
acor init                ← 建立 .acor/ 環境，若有 acor.json 自動安裝
     ↓
acor add                 ← 互動式選擇 skills 和 rules，產生 acor.json
     ↓
git commit acor.json     ← 讓團隊同步
     ↓
在 Claude Code 中：
/acor-scan               ← 分析已安裝項目是否有衝突
     ↓
/acor-apply              ← 處理衝突，修改或合併
```

### 團隊成員加入

```bash
git clone <your-project>
acor init                ← 讀 acor.json，一鍵還原所有 skills/rules
```

---

## CLI 指令

### `acor init`

建立 `.acor/` 目錄結構、安裝 `/acor-scan` 與 `/acor-apply`。
若 `acor.json` 已存在，自動安裝宣告的 skills/rules。

```bash
acor init
acor init --force        # 強制重新安裝所有項目
```

### `acor add`

從 hub 互動式選擇 skills 和 rules：

```bash
acor add
```

```
? Skills
  ◉ TypeScript Strict Mode    TypeScript strict mode 最佳實踐
  ◯ Vue / Nuxt Patterns       Vue 3 Composition API...
  ◯ React / Next.js Patterns  React 18+ App Router...
  ...

? Rules
  ◉ TypeScript 慣例
  ◯ 測試規範
  ...

確認套用？ › 是
```

已安裝的項目預先勾選，可直接新增或取消勾選來移除。
完成後更新 `acor.json`。

### `acor remove`

互動式移除已安裝的 skills/rules：

```bash
acor remove
```

### `acor list`

列出 `acor.json` 中所有已安裝的 skills 和 rules。

### `acor status`

顯示目前狀態：已安裝項目、上次 scan 時間與衝突數。

---

## Claude Skills

`acor init` 會將以下兩個 skill 安裝到 `.claude/skills/`：

### `/acor-scan`

分析已安裝的所有 skills/rules，找出衝突與矛盾：
- 縮排設定不一致
- 引號規範衝突
- 框架 patterns 重複安裝（如 vue + react）
- 任何語意上的矛盾規定

結果寫入 `.acor/core/last-scan.json`，供 `/acor-apply` 使用。

### `/acor-apply`

讀取 scan 結果，逐一處理衝突：
- 修改衝突的規則內容
- 合併重複的規範
- 移除有衝突的項目
- 所有修改需使用者確認後才執行

---

## Hub 結構（`acor-hub/`）

```
acor-hub/
  skills/
    typescript-strict/
      SKILL.md
    vue-patterns/
      SKILL.md
    ...
  rules/
    typescript.md
    testing.md
    ...
```

新增 skill：建立 `skills/<id>/SKILL.md`，填寫 frontmatter（id / name / description / version / tags / triggers）。

新增 rule：建立 `rules/<name>.md`，填寫 frontmatter。

修改後執行 `acor add` 即可看到新項目（動態讀取，不需要重建索引）。

---

## `acor.json` 格式

```json
{
  "version": "1.0.0",
  "skills": [
    "typescript-strict",
    "vue-patterns"
  ],
  "rules": [
    "typescript.md",
    "testing.md"
  ]
}
```

進 git，是團隊環境的 source of truth。

---

## 目錄結構

```
acor/
  src/
    cli.ts                    # 指令入口
    commands/
      init.ts                 # 建立環境、安裝 acor.json 宣告的項目
      add.ts                  # 互動式選擇並安裝 skills/rules
      remove.ts               # 移除已安裝項目
      list.ts                 # 列出已安裝清單
      status.ts               # 顯示狀態
    utils/
      config.ts               # ~/.acor/config.json 讀寫
      registry.ts             # hub 同步（本地路徑或 git clone）
      logger.ts / fs.ts / paths.ts / banner.ts
  assets/
    acor-skills/
      acor-scan/SKILL.md      # /acor-scan：衝突分析
      acor-apply/SKILL.md     # /acor-apply：衝突處理
  bin/
    acor.js
```

---

## 開發

```bash
npm run build        # 編譯 TypeScript
npm run dev          # tsc --watch
npm install -g .     # 重新安裝全域
```

慣例：TypeScript strict mode、繁體中文輸出與 commit message、程式識別字用英文。

---

## License

MIT
