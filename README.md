# ACOR

**AI Context Orchestration Runtime** — 分析專案、推薦適合的 skills / rules，並一鍵注入 Claude Code 的 AI 上下文管理工具。

```
   ___   _____  ____  ____
  / _ | / ___/ / __ \/ __ \
 / __ |/ /__  / /_/ / /_/ /
/_/ |_|\___/  \____/\____/
```

---

## 解決的問題

- 每個新專案都要手動建 `.claude/skills/` 和 `.claude/rules/`，重複費時
- 不知道當前專案適合裝哪些 skills — 明明是 Vue + TypeScript 專案卻裝了 React 相關設定
- 多個 rule 檔案彼此衝突（A 說 single quotes、B 說 double quotes）卻沒有人發現
- 手動封存 / 還原 skills 很麻煩，怕刪錯

---

## 核心設計

### CLI 只做機械操作，智能交給 Claude

ACOR 的設計參考 spec-tools 的架構理念：**CLI 是搬運工，Claude 才是大腦。**

| 層級 | 工具 | 職責 |
|------|------|------|
| CLI（`acor`） | Node.js | 初始化目錄、同步 skill 庫、列清單、還原封存 |
| Skills（`/acor-scan`、`/acor-apply`） | Claude 執行 | 分析專案、偵測衝突、推薦、套用 |

### 為什麼不在 CLI 做分析？

CLI 做靜態分析的天花板很低：只能讀 `package.json`、用 regex 找衝突、觸發條件硬編碼。

Claude 做分析則不同：
- 能讀任何語言的專案（Go、Python、Rust、Java…）
- 能理解語意衝突，不是 regex 比對
- 推薦理由有說明，不是黑盒子分數

### 其他設計原則

- **非破壞性**：從不直接刪除，封存至 `.acor/archive/`，可用 `acor restore` 還原
- **本地優先**：`acor init` 把 skill 庫複製到 `.acor/`，Claude skill 讀本地檔案，不依賴網路
- **Source of Truth**：`.acor/core/state.json` 追蹤 ACOR 安裝過的每一個 skill / rule

---

## 安裝

```bash
git clone git@github.com:king970907/acor.git
cd acor
npm install
npm install -g .

# 確認安裝成功
acor --version
```

更新到最新版：

```bash
cd <acor clone 路徑>
git pull
npm install -g .
```

---

## 使用流程

```
acor init           ← 一次性設定（建目錄 + 同步 skill 庫 + 安裝 Claude skills）
     ↓
在 Claude Code 中：
/acor-scan          ← Claude 分析專案、偵測衝突、推薦 skills / rules
     ↓
/acor-apply         ← Claude 互動選擇，確認後套用到 .claude/
```

之後若有新增 skills 或更新 ACOR，重新執行 `acor init --force` 即可。

---

## CLI 指令

### `acor init`

初始化 ACOR，執行以下步驟：

1. 建立 `.acor/` 目錄結構
2. 將 ACOR 的 skill / rule 庫複製到 `.acor/skills/` 和 `.acor/rules/`（供 Claude 本地讀取）
3. 產生 `.acor/core/catalog.json`（skills / rules 清單，`/acor-scan` 的推薦來源）
4. 安裝 `/acor-scan` 和 `/acor-apply` 到 `.claude/skills/`

```bash
acor init
acor init --cwd /path/to/project
acor init --force   # 強制重新初始化（更新 skill 庫後使用）
```

初始化後的 `.acor/` 結構：

```
.acor/                     ← 不進 git（自動加入 .gitignore）
  core/
    catalog.json           # skills / rules 清單（/acor-scan 的推薦來源）
    state.json             # 追蹤 ACOR 安裝的 skills / rules
    last-scan.json         # /acor-scan 的掃描結果快取
  skills/                  # skill 庫本地副本
    typescript-strict/
    vue-patterns/
    ...
  rules/                   # rule 庫本地副本
    typescript.md
    ...
  archive/                 # 封存的舊 skills / rules
```

---

### `acor list`

列出 ACOR 所有可用的 skills 與 rules，並顯示當前專案的安裝狀態。

```bash
acor list
acor list --cwd /path/to/project
```

範例輸出：

```
可用 Skills（5）
  ✔ TypeScript Strict Mode    TypeScript strict mode 最佳實踐      [typescript, type-safety]
  ✔ Vue / Nuxt Patterns       Vue 3 Composition API 與 Nuxt 4...   [vue, nuxt, frontend]
  ○ React / Next.js Patterns  React 18+ 與 Next.js App Router...   [react, nextjs, frontend]

可用 Rules（3）
  ✔ TypeScript 慣例            TypeScript strict mode 程式碼慣例...
  ○ 測試規範                   單元測試與整合測試撰寢原則，框架無關
  ○ Node.js 安全規範           Node.js 後端 API 安全實踐...
```

`✔` 表示已由 ACOR 安裝，`○` 表示未安裝。需先執行 `acor init` 才能使用。

---

### `acor restore`

從 `.acor/archive/` 還原封存的 skills 或 rules（由 `/acor-apply` 封存的項目）。

```bash
acor restore
acor restore -y     # 還原所有封存項目
```

---

## Claude Skills

`acor init` 會將以下兩個 skill 安裝到 `.claude/skills/`，之後直接在 Claude Code 中呼叫。

### `/acor-scan`

Claude 執行的專案掃描與推薦 skill，設計重點：

**分層讀取，token 節省：**

```
Phase 1（必跑）：catalog.json + 語言特徵檔 + 現有 .claude/ 清單
  ✅ 語言和框架已確定 → 直接跳 Phase 4

Phase 2（Phase 1 不確定才讀）：tsconfig / vite.config / nuxt.config…
  ✅ 已有足夠資訊 → 跳 Phase 4

Phase 3（Phase 2 仍不確定才讀）：原始碼抽樣，最多 2 個檔案 × 前 40 行

Phase 4：分析 + 推薦（只從 catalog 選，每個推薦附具體證據）

Phase 5：輸出結果 + 寫入 .acor/core/last-scan.json
```

**多語言支援：** Phase 1 同時檢查 `package.json`、`go.mod`、`Cargo.toml`、`pyproject.toml`、`pom.xml`、`Package.swift` 等，不限 Node.js 專案。

**證據驅動：** 每個推薦必須列出具體依據，信心不足時詢問使用者而非猜測。

---

### `/acor-apply`

Claude 執行的互動式套用 skill：

1. 讀取 `/acor-scan` 產生的 `last-scan.json`（超過 30 分鐘提示重新 scan）
2. 顯示衝突警告，讓使用者決定是否繼續
3. 互動選擇要套用的 skills / rules
4. 互動選擇要封存的現有項目
5. **確認摘要後才寫入任何檔案**
6. 寫入 `.claude/`、執行封存、更新 `state.json`

---

## 內建 Skills

| ID | 名稱 | 觸發條件 |
|----|------|----------|
| `typescript-strict` | TypeScript Strict Mode | `language: typescript` / `devDep: typescript` |
| `vue-patterns` | Vue / Nuxt Patterns | `framework: vue/nuxt` / `dep: vue` |
| `react-patterns` | React / Next.js Patterns | `framework: react/next` / `dep: react` |
| `testing-vitest` | Testing with Vitest | `devDep: vitest` |
| `node-api` | Node.js API Patterns | `framework: express/fastify/hono` |

## 內建 Rules

| ID | 名稱 | 觸發條件 |
|----|------|----------|
| `typescript` | TypeScript 慣例 | `language: typescript` |
| `testing` | 測試規範 | `devDep: vitest / jest` |
| `node-security` | Node.js 安全規範 | `projectType: api` / `framework: express/fastify/hono` |

---

## 新增自訂 Skill / Rule

**新增 skill：**

1. 建立 `assets/skills/<id>/SKILL.md`：

```markdown
---
id: my-skill
name: My Skill
description: 簡短說明
version: 1.0.0
tags: [tag1, tag2]
triggers:
  - type: framework
    value: vue
  - type: devDependency
    value: typescript
---

# Skill 內文（給 Claude 的指引）
...
```

2. 重新安裝並在目標專案重新初始化：

```bash
npm run build && npm install -g .
acor init --force --cwd /your/project
```

**新增 rule：**

1. 建立 `assets/rules/<name>.md`（frontmatter 格式同上，`triggers` 可省略表示通用規則）
2. 同上重新安裝

**可用的 trigger 類型：**

| type | 說明 | 範例值 |
|------|------|--------|
| `framework` | 偵測到的框架 | `vue`, `nuxt`, `react`, `next`, `express` |
| `dependency` | `dependencies` 中包含 | `vue`, `react` |
| `devDependency` | `devDependencies` 中包含 | `typescript`, `vitest` |
| `language` | 偵測到的語言 | `typescript`, `javascript`, `go`, `python` |
| `projectType` | 偵測到的專案類型 | `web`, `api`, `cli`, `library` |
| `file` | 偵測到特定設定檔 | `vitest.config`, `tailwind.config` |

---

## 目錄結構

```
acor/
  src/
    cli.ts                  # Commander 入口（init / list / restore）
    commands/
      init.ts               # 同步 skill 庫、產生 catalog、安裝 ACOR skills
      list.ts               # 讀 catalog.json 顯示清單與安裝狀態
      restore.ts            # 從 .acor/archive/ 還原封存項目
    core/
      state.ts              # state.json 讀寫
    types/
      index.ts              # 共用型別（Catalog、AcorState…）
    utils/
      logger.ts / fs.ts / paths.ts / banner.ts
  assets/
    skills/                 # 內建 coding skills（每個子目錄一個 SKILL.md）
    rules/                  # 內建 rules（.md 檔案）
    acor-skills/            # ACOR 工具 skills（由 Claude 執行）
      acor-scan/SKILL.md    # /acor-scan：分析 + 推薦
      acor-apply/SKILL.md   # /acor-apply：互動套用
  bin/
    acor.js                 # CLI 入口
  dist/                     # TypeScript 編譯輸出（不進 git）
```

---

## 開發

```bash
npm run build        # 編譯 TypeScript → dist/
npm run dev          # tsc --watch
node bin/acor.js     # 本地執行
npm install -g .     # 重新安裝全域
```

慣例：TypeScript strict mode、繁體中文輸出與 commit message、程式識別字用英文。

---

## License

MIT
