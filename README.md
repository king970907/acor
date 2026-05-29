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

## 核心設計

- **掃描優先**：`acor scan` 讀取專案的 `package.json`、dependencies、偵測 framework，再對照 ACOR 的 skill 庫給出分數排序的推薦，不是一刀切全裝
- **衝突偵測**：掃描現有 `.claude/rules/` 時會比對引號、縮排、行長等常見矛盾，在 apply 前告警
- **非破壞性**：apply 不會直接刪除舊檔案，改用 `封存 → .acor/archive/`，隨時可用 `acor restore` 還原
- **Source of Truth**：`.acor/core/state.json` 追蹤 ACOR 安裝過的每一個 skill / rule，與手動放入的檔案明確區分
- **快取感知**：scan 結果快取 30 分鐘，`package.json` 有變動時自動觸發重新掃描

---

## 安裝

### 全域安裝（推薦）

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

### 本地開發

```bash
git clone git@github.com:king970907/acor.git
cd acor
npm install
npm run build
node bin/acor.js --help
```

---

## 使用流程

```
acor init        ← 初始化 .acor/ 目錄（第一次使用時執行）
     ↓
acor scan        ← 分析專案 + 現有 Claude 設定 + 衝突偵測 + 推薦
     ↓
acor apply       ← 互動選擇套用哪些 skills / rules，選擇性封存現有項目
```

---

## 指令說明

### `acor init`

在當前專案初始化 ACOR，建立 `.acor/` 目錄結構與 Claude adapter 設定。

```bash
acor init
acor init --cwd /path/to/project
```

建立的結構：

```
.acor/
  core/
    state.json       # 追蹤 ACOR 安裝的 skills / rules
    last-scan.json   # 上次掃描結果快取
  archive/           # 封存的舊 skills / rules
  adapters/
    claude.json      # Claude Code adapter 設定
```

同時在 `.gitignore` 補上 `.acor/`，確保 runtime 狀態不進版控。

---

### `acor scan`

掃描專案結構與現有 Claude 設定，輸出三層分析結果：

1. **現有清單** — `.claude/skills/` 和 `.claude/rules/` 目前有什麼
2. **衝突偵測** — 自動偵測 rules 之間的矛盾（引號、縮排、行長、分號等）
3. **推薦清單** — 根據 framework / dependencies / 語言計算分數，由高到低排列

```bash
acor scan
acor scan --cwd /path/to/project
acor scan --json          # 輸出機器可讀的 JSON（供 CI 或腳本使用）
```

掃描結果自動快取，30 分鐘內或 `package.json` 未變動時，`acor apply` 直接讀取快取。

---

### `acor apply`

互動式套用推薦，分三個步驟：

1. **選擇要套用的 Skills**（推薦分數 ≥ 60% 預設勾選）
2. **選擇要套用的 Rules**
3. **選擇要封存的現有項目**（全不選直接 Enter 跳過）

```bash
acor apply
acor apply -y             # 跳過互動，套用全部推薦
acor apply --force        # 覆寫已存在的檔案
acor apply --cwd /path/to/project
```

套用後 skills 寫入 `.claude/skills/<id>/SKILL.md`，rules 寫入 `.claude/rules/<file>.md`，並更新 `state.json`。

> 發現衝突時會先詢問是否繼續，讓使用者有機會先解決衝突再套用。

---

### `acor list`

列出 ACOR 內建的所有 skills 與 rules，並顯示當前專案的安裝狀態。

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
  ○ 測試規範                   單元測試與整合測試撰寫原則，框架無關
  ○ Node.js 安全規範           Node.js 後端 API 安全實踐...
```

`✔` 表示已安裝（由 ACOR 管理），`○` 表示未安裝。

---

### `acor restore`

從 `.acor/archive/` 還原封存的 skills 或 rules。

```bash
acor restore
acor restore -y     # 還原所有封存項目
```

列出封存清單（含封存時間），互動選擇後還原到原始位置，並更新 `state.json`。

---

## 內建 Skills

| ID | 名稱 | 觸發條件 |
|----|------|----------|
| `typescript-strict` | TypeScript Strict Mode | `language: typescript` / `devDep: typescript` |
| `vue-patterns` | Vue / Nuxt Patterns | `framework: vue` / `framework: nuxt` / `dep: vue` |
| `react-patterns` | React / Next.js Patterns | `framework: react` / `framework: next` / `dep: react` |
| `testing-vitest` | Testing with Vitest | `devDep: vitest` / `file: vitest.config` |
| `node-api` | Node.js API Patterns | `framework: express/fastify/hono` / `projectType: api` |

---

## 內建 Rules

| ID | 名稱 | 觸發條件 |
|----|------|----------|
| `typescript` | TypeScript 慣例 | `language: typescript` / `devDep: typescript` |
| `testing` | 測試規範 | `devDep: vitest` / `devDep: jest` |
| `node-security` | Node.js 安全規範 | `projectType: api` / `framework: express/fastify/hono` |

---

## Skill 與 Rule 格式

Skills 放在 `assets/skills/<id>/SKILL.md`，Rules 放在 `assets/rules/<name>.md`，皆使用 YAML frontmatter：

**Skill 格式：**

```markdown
---
id: my-skill
name: My Skill
description: 這個 skill 的簡短說明
version: 1.0.0
tags: [tag1, tag2]
triggers:
  - type: framework
    value: vue
  - type: devDependency
    value: typescript
---

# Skill 內文（Markdown）
這裡寫給 Claude 的指引...
```

**Rule 格式：**

```markdown
---
id: my-rule
name: 規則名稱
description: 規則簡短說明
triggers:            # 省略 triggers = 通用規則（永遠推薦）
  - type: language
    value: typescript
---

# 規則內文...
```

**可用的 trigger 類型：**

| type | 說明 | 範例值 |
|------|------|--------|
| `framework` | 偵測到的框架 | `vue`, `nuxt`, `react`, `next`, `express` |
| `dependency` | `dependencies` 中包含 | `vue`, `react` |
| `devDependency` | `devDependencies` 中包含 | `typescript`, `vitest` |
| `language` | 偵測到的語言 | `typescript`, `javascript` |
| `projectType` | 偵測到的專案類型 | `web`, `api`, `cli`, `library` |
| `file` | 偵測到特定設定檔 | `vitest.config`, `tailwind.config` |

---

## 新增自訂 Skill / Rule

1. 在 `assets/skills/<your-id>/SKILL.md` 或 `assets/rules/<your-name>.md` 建立檔案
2. 填寫 frontmatter（參考上方格式）
3. 重新安裝：

```bash
npm run build
npm install -g .
```

4. 執行 `acor list` 確認出現在清單中

---

## 目錄結構

```
acor/
  src/
    cli.ts                  # Commander 入口，定義五個子指令
    commands/
      init.ts               # acor init
      scan.ts               # acor scan（含快取過期邏輯）
      apply.ts              # acor apply（skills + rules + 封存）
      list.ts               # acor list
      restore.ts            # acor restore
    scanner/
      project-scanner.ts    # 掃描 package.json、framework、dependencies
      claude-scanner.ts     # 掃描 .claude/skills/ 和 .claude/rules/
      conflict-detector.ts  # 偵測 rules 之間的矛盾
    recommender/
      index.ts              # loadSkills / loadRules / recommendSkills / recommendRules
    core/
      state.ts              # state.json 讀寫（installedSkills / archivedAt）
    types/
      index.ts              # 所有共用型別
    utils/
      logger.ts             # log.info / log.success / log.warn / log.error
      fs.ts                 # safeWriteFile / moveFile / readJsonFile
      paths.ts              # getAssetsDir / getClaudeDir / getAcorDir
      banner.ts             # CLI banner
  assets/
    skills/                 # 內建 skills（每個子目錄一個 SKILL.md）
    rules/                  # 內建 rules（.md 檔案）
  bin/
    acor.js                 # CLI 入口（shebang + import dist/cli.js）
  dist/                     # TypeScript 編譯輸出（不進 git）
```

---

## 開發

```bash
npm run build        # 編譯 TypeScript → dist/
npm run dev          # tsc --watch（開發用）
node bin/acor.js     # 本地執行，等同 acor 全域指令
npm install -g .     # 重新安裝全域（改完 src/ 或 assets/ 後執行）
```

慣例：
- TypeScript strict mode，禁止裸 `any`
- 繁體中文用於 CLI 輸出、註解、commit message
- 程式識別字（function / type）用英文
- Commit message 格式：`type(scope): 繁中描述`

---

## License

MIT
