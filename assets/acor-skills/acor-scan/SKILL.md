---
name: acor-scan
description: 掃描當前專案，分析語言/框架/現有 Claude 設定，從 ACOR catalog 推薦適合的 skills 與 rules。執行後結果寫入 .acor/core/last-scan.json，供 /acor-apply 使用。
---

# ACOR Scan — 專案分析與推薦

## 核心限制（最高優先，全程遵守）

- **只從 catalog.json 推薦**，禁止自行發明或推測 skill / rule 名稱
- **每個推薦必須列出具體證據**，不得只給結論
- **讀取依 Phase 順序**，有 early exit 就立即停止，不繼續往下讀
- **原始碼最多抽樣 2 個檔案，每個只讀前 40 行**

---

## Phase 1：基礎讀取（每次必跑）

### 1.1 讀取 ACOR catalog

讀取 `.acor/core/catalog.json`。

若不存在 → 停止並提示：「請先在專案根目錄執行 `acor init`」

### 1.2 偵測語言特徵檔

依序檢查以下檔案是否存在，**存在哪個就讀哪個**（可能同時存在多個）：

| 語言 / 平台 | 特徵檔 |
|-------------|--------|
| JavaScript / TypeScript | `package.json` |
| Go | `go.mod` |
| Python | `pyproject.toml` → `requirements.txt` → `Pipfile`（優先順序） |
| Rust | `Cargo.toml` |
| Java / Kotlin | `pom.xml` → `build.gradle` → `build.gradle.kts` |
| Swift | `Package.swift` |
| PHP | `composer.json` |
| Ruby | `Gemfile` |
| .NET | 搜尋根目錄下 `*.csproj` 或 `*.sln` |

從讀取結果判斷：主要語言、框架、dependencies、devDependencies。

### 1.3 讀取現有 Claude 設定

- 列出 `.claude/skills/` 下的子目錄名稱（不讀內容）
- 列出 `.claude/rules/` 下的所有 `.md` 檔案名稱（不讀內容）

### ✅ Early Exit 條件

若以下三項均已確定，**直接跳至 Phase 4**，不執行 Phase 2 和 Phase 3：
- 主要語言（typescript / javascript / go / python / rust / ...）
- 主要框架或專案類型（framework / api / cli / library / unknown）
- 是否有測試工具

---

## Phase 2：Config 檔補充（Phase 1 無法確定時才執行）

選擇性讀取（只讀存在的）：

- `tsconfig.json`（確認 TypeScript 設定）
- `vite.config.ts` / `vite.config.js`（確認前端工具鏈）
- `nuxt.config.ts`（確認 Nuxt）
- `next.config.ts` / `next.config.js`（確認 Next.js）
- `vitest.config.ts` / `jest.config.ts`（確認測試框架）
- `go.sum`（確認 Go 模組依賴）
- `Cargo.lock`（確認 Rust crate）

### ✅ Early Exit 條件

語言和框架已確定 → **跳至 Phase 4**

---

## Phase 3：原始碼抽樣（Phase 2 仍無法確定時才執行）

從以下候選路徑中選最多 2 個存在的檔案，每個**只讀前 40 行**：

```
main.ts / main.go / main.py / main.rs / main.swift
src/main.ts / src/index.ts / src/app.ts
app/page.tsx / pages/index.tsx / pages/index.vue
cmd/main.go / src/main.rs
```

目的：確認主要語言和框架，**不用於深度分析**。

---

## Phase 4：分析與推薦

### 4.1 整理已知資訊

確認以下項目（未知填 `unknown`）：

```
語言：        typescript | javascript | go | python | rust | ...
框架：        vue | nuxt | react | next | express | fastify | gin | ...
專案類型：    web | api | cli | library | unknown
測試工具：    vitest | jest | go test | pytest | cargo test | unknown
已安裝 skills：[列出名稱]
已安裝 rules： [列出相對路徑]
```

### 4.2 衝突偵測

檢查現有 rules 之間是否有語意矛盾，常見模式：
- 縮排：同時出現 tabs 和 spaces 規定
- 引號：同時出現 single quotes 和 double quotes 規定
- 行長：同時出現不同的 max line length 數字
- 框架衝突：同時安裝不同框架的 patterns skill（如 vue-patterns + react-patterns）

讀取有衝突疑慮的 rule 檔案內容（**最多讀 3 個**）來確認。

### 4.3 評估每個 catalog skill / rule

對 catalog.json 中每個項目：

1. 若已安裝（名稱在已安裝清單中）→ 跳過
2. 對照 triggers 和現有分析結果
3. 命中 2 個以上明確 trigger → **高信心推薦**
4. 只命中 1 個 trigger → **低信心**，列出但標示
5. 完全不符 → 不推薦

**高信心判斷標準（任一成立）：**
- 特徵檔直接包含對應 dependency / framework 名稱
- 語言完全匹配
- 專案類型完全匹配

---

## Phase 5：輸出結果

### 5.1 終端機輸出

```
專案資訊
  語言：       <language>
  框架：       <framework>
  專案類型：   <projectType>
  測試工具：   <testing>

現有 Claude 設定
  Skills（N）：<列出名稱>
  Rules（N）： <列出相對路徑>

衝突偵測
  <無衝突 | 列出衝突描述>

推薦 Skills
  ★ <name>（高/低信心）
    依據：<列出具體證據>

推薦 Rules
  ◆ <name>（高/低信心）
    依據：<列出具體證據>
```

### 5.2 寫入 .acor/core/last-scan.json

```json
{
  "scannedAt": "<ISO timestamp>",
  "project": {
    "language": "...",
    "framework": "...",
    "projectType": "...",
    "hasTesting": true
  },
  "existing": {
    "skills": ["..."],
    "rules": ["..."]
  },
  "conflicts": [
    {
      "description": "...",
      "items": ["..."]
    }
  ],
  "recommendations": [
    {
      "type": "skill",
      "id": "...",
      "name": "...",
      "confidence": "high",
      "evidence": ["package.json 包含 vue 3.4.0", "nuxt 在 devDependencies"]
    }
  ]
}
```

完成後提示：「掃描完成，執行 `/acor-apply` 套用推薦。」

---

## Red Flags（禁止事項）

- ❌ 推薦 catalog.json 以外的 skill / rule
- ❌ 推薦時未列出具體證據
- ❌ Phase 1 已有足夠資訊仍繼續讀更多檔案
- ❌ 讀取超過 2 個原始碼檔案，或每個超過 40 行
- ❌ 讀原始碼的目的是分析程式邏輯（只能用於確認語言/框架）
- ❌ 未寫入 last-scan.json 就結束
