# CLAUDE.md

這個檔案提供 Claude Code 在操作本 repo 時的參考指引。

## 這是什麼

`acor`（AI Context Orchestration Runtime）是一支 CLI 工具，用來分析專案結構、推薦適合的 skills / rules，並一鍵注入 Claude Code 的 AI 上下文。核心設計是「掃描 → 推薦 → 套用」，不盲目安裝，根據 framework / dependencies 給出有信心分級的推薦清單。

## 常用指令

```bash
npm install              # 安裝依賴（prepare 自動執行 build）
npm run build            # 清除 dist/ 後重新編譯（node fs.rmSync + tsc）
npm run dev              # tsc --watch（開發時用）
node bin/acor.js --help  # 本地執行 CLI
npm install -g .         # 重新安裝全域指令（改完 src/ 或 assets/ 後執行）
```

修改 `src/` 後務必先 `npm run build`，因為 `bin/acor.js` 載入的是編譯後的 `dist/cli.js`。

## 架構

**設計原則：CLI 是搬運工，Claude 才是大腦。**

分析、推薦、套用等智能操作全部由 Claude skills 執行（`/acor-scan`、`/acor-apply`）。CLI 只做機械性操作：建目錄、同步檔案、讀清單、還原封存。

### 入口

- **`src/cli.ts`** — Commander 進入點，定義 `init / list / status / restore` 四個子指令

### Commands（`src/commands/`）

| 檔案 | 指令 | 職責 |
|------|------|------|
| `init.ts` | `acor init` | 建立 `.acor/` 目錄結構、同步 skill/rule 庫、產生 catalog、安裝 ACOR skills 到 `.claude/skills/` |
| `list.ts` | `acor list` | 讀 catalog.json 與 state.json，顯示所有 skills/rules 及安裝狀態 |
| `status.ts` | `acor status` | 顯示已安裝項目、上次掃描摘要、封存清單 |
| `restore.ts` | `acor restore` | 掃描 `.acor/archive/`，互動選擇後還原到 `.claude/` |

### Claude Skills（`assets/acor-skills/`）

分析與套用邏輯在 Claude skills 裡，不在 CLI：

| 檔案 | 指令 | 職責 |
|------|------|------|
| `acor-skills/acor-scan/SKILL.md` | `/acor-scan` | 分層讀取專案資訊、偵測衝突、從 catalog 推薦 skills/rules、寫入 last-scan.json |
| `acor-skills/acor-apply/SKILL.md` | `/acor-apply` | 讀取 last-scan.json、AskUserQuestion 互動選擇、確認後套用到 `.claude/` |

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
  skills/<id>/SKILL.md      ← 每個 coding skill 一個子目錄
  rules/<name>.md            ← 每個 rule 一個 .md 檔
  acor-skills/<id>/SKILL.md  ← ACOR 工具 skills（acor-scan、acor-apply）
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

`/acor-scan` 把結果寫入 `.acor/core/last-scan.json`（含 `scannedAt` timestamp）。  
`/acor-apply` 讀取前先確認快取是否過期，以下任一條件成立就提示重新掃描：

- 快取超過 **30 分鐘**
- `package.json` 的 mtime 比 `scannedAt` 新

## 新增 CLI 指令

1. 建立 `src/commands/<name>.ts`，export `run<Name>(opts)` async function
2. 在 `src/cli.ts` import 並用 `program.command(...)` 註冊
3. `npm run build` 驗證，再 `npm install -g .`

## 代碼品質

每次修改 `src/` 後，執行 `/simplify` 掃描變更過的代碼，確保簡潔性與一致性。

## 慣例

- ESM 專案（`"type": "module"`）；TS 相對 import 一律帶 `.js` 副檔名（指向編譯產物）
- TypeScript strict mode；禁止裸 `any`
- **CLI 輸出、註解、commit message 用繁體中文**；程式識別字用英文
- Commit message 格式：`type(scope): 繁中描述`
- `dist/` 不進 git；`prepare` 腳本在 `npm install` 時自動執行 `npm run build`
