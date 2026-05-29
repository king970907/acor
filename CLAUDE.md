# CLAUDE.md

這個檔案提供 Claude Code 在操作本 repo 時的參考指引。

## 這是什麼

`acor`（AI Context Orchestration Runtime）是一支 CLI 工具，用來分析專案結構、推薦適合的 skills / rules，並一鍵注入 Claude Code 的 AI 上下文。核心設計是「掃描 → 推薦 → 套用」，不盲目安裝，根據 framework / dependencies 給出有分數的推薦清單。

## 常用指令

```bash
npm install              # 安裝依賴（prepare 鉤子會跑 tsc 產生 dist/）
npm run build            # tsc 編譯 src/ → dist/
npm run dev              # tsc --watch（開發時用）
node bin/acor.js --help  # 本地執行 CLI
npm install -g .         # 重新安裝全域指令（改完 src/ 或 assets/ 後執行）
```

修改 `src/` 後務必先 `npm run build`，因為 `bin/acor.js` 載入的是編譯後的 `dist/cli.js`。

## 架構

資料流：`assets/` → recommender 評分 → commands 執行 → 寫入 `.claude/`

### 入口

- **`src/cli.ts`** — Commander 進入點，定義 `init / scan / apply / list / restore` 五個子指令

### Commands（`src/commands/`）

| 檔案 | 指令 | 職責 |
|------|------|------|
| `init.ts` | `acor init` | 建立 `.acor/` 目錄結構、Claude adapter、更新 `.gitignore` |
| `scan.ts` | `acor scan` | 掃描專案 + Claude 設定 + 衝突偵測 + 推薦，寫入快取 |
| `apply.ts` | `acor apply` | 讀取快取（或重新 scan）、互動選擇 skills / rules / 封存項目、執行套用 |
| `list.ts` | `acor list` | 列出 ACOR 內建所有 skills / rules，顯示安裝狀態 |
| `restore.ts` | `acor restore` | 掃描 `.acor/archive/`，互動選擇後還原到 `.claude/` |

### Scanner（`src/scanner/`）

- **`project-scanner.ts`** — 讀取 `package.json`，偵測 framework / language / packageManager / projectType
- **`claude-scanner.ts`** — 掃描 `.claude/skills/`（每個子目錄的 SKILL.md）與 `.claude/rules/`（所有 .md）
- **`conflict-detector.ts`** — 比對 rules 內容，用預定義的 regex pair 找矛盾（引號、縮排、行長、分號、尾逗號）

### Recommender（`src/recommender/index.ts`）

- `loadSkills()` — 從 `assets/skills/` 載入所有 skill（gray-matter 解析 frontmatter）
- `loadRules()` — 從 `assets/rules/` 遞迴載入所有 rule
- `recommendSkills(skills, project, alreadyInstalled)` — 對每個 skill 計算 trigger 命中分數，過濾已安裝
- `recommendRules(rules, project, alreadyInstalled)` — 同上；無 triggers 的 rule 預設 score = 1.0（通用規則）

分數計算：`score = 命中 trigger 數 / 總 trigger 數`，四捨五入到小數點後兩位。

### Core（`src/core/state.ts`）

管理 `.acor/core/state.json`：

```json
{
  "version": "0.1.0",
  "installedSkills": ["typescript-strict", "vue-patterns"],
  "installedRules": ["typescript.md"],
  "archivedAt": { "vue-patterns": "2026-05-29T10:30:00.000Z" }
}
```

- `loadState(cwd)` — 讀取，不存在時回傳空白 state
- `saveState(cwd, state)` — 寫入
- `markInstalled(cwd, type, name)` — 新增到 installedSkills / installedRules
- `markArchived(cwd, name)` — 記錄封存時間，從 installed 清單移除

### Utils

- **`logger.ts`** — `log.info / success / warn / error / step / dim / section / conflict / recommendation`
- **`fs.ts`** — `safeWriteFile`（存在時跳過或覆寫）、`moveFile`、`readJsonFile`、`writeJsonFile`、`ensureDir`
- **`paths.ts`** — 集中管理所有路徑：`getAssetsDir()`（用 `import.meta.url` 計算）、`getAcorDir / getClaudeDir` 等
- **`banner.ts`** — CLI 啟動時的 banner

## Assets 管理

```
assets/
  skills/<id>/SKILL.md    ← 每個 skill 一個子目錄
  rules/<name>.md         ← 每個 rule 一個 .md 檔
```

Assets 直接在 repo 裡維護，`build` 不會修改它們。全域安裝後，`getAssetsDir()` 用 `import.meta.url` 往上兩層找到 `assets/`，無論安裝在哪個路徑都能正確定位。

**新增 skill 流程：**
1. 建立 `assets/skills/<id>/SKILL.md`，填寫 frontmatter（id / name / description / version / tags / triggers）
2. `npm run build && npm install -g .`
3. `acor list` 確認出現在清單中

**新增 rule 流程：**
1. 建立 `assets/rules/<name>.md`，填寫 frontmatter
2. `npm run build && npm install -g .`

## 快取機制

`acor scan` 把結果寫入 `.acor/core/last-scan.json`（含 `scannedAt` timestamp）。  
`acor apply` 讀取快取前先呼叫 `isCacheStale(cwd, scannedAt)`，以下任一條件成立就重新掃描：

- 快取超過 **30 分鐘**
- `package.json` 的 mtime 比 `scannedAt` 新

## 新增指令

1. 建立 `src/commands/<name>.ts`，export `run<Name>(opts)` async function
2. 在 `src/cli.ts` import 並用 `program.command(...)` 註冊
3. `npm run build` 驗證，再 `npm install -g .`

## 慣例

- ESM 專案（`"type": "module"`）；TS 相對 import 一律帶 `.js` 副檔名（指向編譯產物）
- TypeScript strict mode；禁止裸 `any`
- **CLI 輸出、註解、commit message 用繁體中文**；程式識別字用英文
- Commit message 格式：`type(scope): 繁中描述`
- `dist/` 不進 git；使用者 `npm install -g .` 時 `prepare` 腳本自動跑 `tsc`
