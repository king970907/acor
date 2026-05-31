# CLAUDE.md

這個檔案提供 Claude Code 在操作本 repo 時的參考指引。

## 這是什麼

`acor`（AI Context Orchestration Runtime）是一支 CLI 工具，讓開發者從 hub 選擇 skills/rules，一鍵安裝到 Claude Code 環境，並透過 `/acor-scan` 和 `/acor-apply` 分析與處理衝突。

設計哲學：**使用者自主選擇，CLI 搬運，Claude 分析衝突**。不做 AI 推薦，不猜測需求。

## 常用指令

```bash
npm install              # 安裝依賴
npm run build            # 編譯 TypeScript
npm run dev              # tsc --watch
node bin/acor.js --help  # 本地執行
npm install -g .         # 重新安裝全域
```

## 架構

### 入口

- **`src/cli.ts`** — Commander 進入點，定義 `init / add / remove / list / status` 五個指令

### Commands（`src/commands/`）

| 檔案 | 指令 | 職責 |
|------|------|------|
| `init.ts` | `acor init` | 建立 `.acor/`、安裝 acor-skills、若有 `acor.json` 自動安裝 |
| `add.ts` | `acor add` | 從 hub 動態讀取清單，互動多選，安裝並更新 `acor.json` |
| `remove.ts` | `acor remove` | 互動選擇已安裝項目，移除並更新 `acor.json` |
| `list.ts` | `acor list` | 讀 `acor.json`，列出已安裝 skills/rules |
| `status.ts` | `acor status` | 顯示安裝狀態與上次 scan 結果 |

### Utils

- **`config.ts`** — 讀寫 `~/.acor/config.json`（hub 路徑設定）
- **`registry.ts`** — hub 同步：本地路徑直接用，git URL 則 clone/pull 到 `~/.acor/registry/`
- **`logger.ts`** — `log.info / success / warn / error / step / dim / section`
- **`fs.ts`** — `safeWriteFile`、`readJsonFile`、`writeJsonFile`、`ensureDir`
- **`paths.ts`** — 集中管理所有路徑

### Claude Skills（`assets/acor-skills/`）

| 檔案 | 指令 | 職責 |
|------|------|------|
| `acor-skills/acor-scan/SKILL.md` | `/acor-scan` | 讀取已安裝的 skills/rules，分析衝突，寫入 `last-scan.json` |
| `acor-skills/acor-apply/SKILL.md` | `/acor-apply` | 讀 scan 結果，逐一處理衝突，確認後修改檔案 |

## 關鍵檔案

### `acor.json`（專案根目錄，進 git）

```json
{
  "version": "1.0.0",
  "skills": ["typescript-strict", "vue-patterns"],
  "rules": ["typescript.md", "testing.md"]
}
```

宣告專案使用哪些 skills/rules，是團隊環境的 source of truth。

### `~/.acor/config.json`（全域設定）

```json
{
  "registry": {
    "path": "/path/to/acor-hub"
  }
}
```

或 git URL：
```json
{
  "registry": {
    "url": "https://github.com/yourorg/acor-hub",
    "branch": "main"
  }
}
```

### `.acor/core/last-scan.json`（不進 git）

`/acor-scan` 的結果快取，供 `/acor-apply` 讀取。

## Hub 結構（`acor-hub/`）

```
acor-hub/
  skills/<id>/SKILL.md    ← 每個 skill 一個子目錄
  rules/<name>.md         ← 每個 rule 一個 .md 檔
```

`acor add` 在執行時動態讀取 frontmatter，**不需要預建索引**（無 registry.json）。

新增 skill 或 rule 後，直接執行 `acor add` 即可看到新項目。

## 流程

```
acor init → acor add → git commit acor.json
              ↓
           /acor-scan → /acor-apply
```

## 慣例

- ESM 專案（`"type": "module"`）；TS 相對 import 一律帶 `.js` 副檔名
- TypeScript strict mode；禁止裸 `any`
- **CLI 輸出、註解、commit message 用繁體中文**；程式識別字用英文
- Commit message 格式：`type(scope): 繁中描述`
