---
name: acor-scan
description: 掃描當前專案已安裝的 skills 與 rules，偵測不相關項目（語言/框架不符）與內容衝突，輸出報告並寫入 .acor/core/last-scan.json，供 /acor-apply 使用。
---

# ACOR Scan — 相關性與衝突分析

## 核心原則

- **只分析已安裝的項目**：讀 `.claude/skills/` 和 `.claude/rules/`，不做推薦
- **每個問題必須有具體依據**：引用原文或明確的技術特徵，不憑印象
- **不讀程式碼區塊**：跳過 ` ``` ` 之間的範例程式碼，只分析說明文字與規範條目

---

## Phase 1：偵測專案語言與框架

依序檢查以下檔案是否存在，**存在就讀取**（可能同時存在多個）：

| 檔案 | 判斷內容 |
|------|---------|
| `package.json` | `dependencies` / `devDependencies` → 框架（vue, react, next, nuxt, express, fastify…）、語言（typescript） |
| `go.mod` | → 語言：go |
| `Cargo.toml` | → 語言：rust |
| `pyproject.toml` / `requirements.txt` | → 語言：python |
| `pom.xml` / `build.gradle` | → 語言：java |
| `Package.swift` | → 語言：swift |

整理出：
```
languages:  [typescript, ...]
frameworks: [vue, nuxt, ...]
```

---

## Phase 2：建立已安裝清單

列出以下目錄的內容：

- `.claude/skills/`：所有子目錄名稱，排除 `acor-scan`、`acor-apply`
- `.claude/rules/`：所有 `.md` 檔案的相對路徑

若兩者都是空的 → 停止並提示：「尚未安裝任何 skills 或 rules，請先執行 `acor add`」

---

## Phase 3：相關性檢查

讀取每個已安裝 skill 的 `SKILL.md` frontmatter，取得 `tags` 和 `triggers`。

**判斷標準：**

若 skill 的 tags 或 triggers 包含**明確的語言或框架識別詞**，但與 Phase 1 偵測到的結果不符，標記為「不相關」。

常見的語言/框架識別詞：

| 識別詞 | 屬於 |
|--------|------|
| `go`, `golang` | Go 語言 |
| `rust` | Rust 語言 |
| `python` | Python 語言 |
| `java`, `spring` | Java 生態 |
| `react`, `nextjs`, `next` | React 框架 |
| `vue`, `nuxt` | Vue 框架 |
| `swift` | Swift 語言 |

**不標記為不相關的情況：**
- tags 只有通用標籤：`testing`, `api`, `backend`, `security`（與語言無關）
- skill 同時覆蓋多語言（如 `node-api` 支援 express/fastify/hono，屬通用）

**rules 的相關性：**
讀取 rule 的 frontmatter `triggers`，若 trigger 指定特定語言（如 `language: go`）但專案不是該語言，同樣標記為不相關。

---

## Phase 4：衝突分析

讀取所有已安裝 skill 和 rule 的全文，跳過程式碼區塊，分析說明文字。

### 衝突類型

| 類型 | 說明 | 範例 |
|------|------|------|
| `rule-rule` | 兩個 rules 之間明確矛盾 | A 要求 2 格縮排，B 要求 4 格 |
| `skill-skill` | 兩個 skills 語意互斥 | react-patterns + vue-patterns 同時存在 |
| `skill-rule` | skill 與 rule 之間矛盾 | skill 說用 tabs，rule 說用 spaces |

**只報告有具體原文可引用的確認衝突**，風格偏好差異不報。

---

## Phase 5：輸出報告

### 終端機輸出

```
專案偵測
  語言：typescript
  框架：vue, nuxt

已安裝 Skills（N）：typescript-strict, vue-patterns, go-patterns
已安裝 Rules（N）： typescript.md, go.md

不相關項目
  ⚠ [skill] go-patterns — tags: [go, backend]，與當前專案（vue/typescript）不符
  ⚠ [rule]  go.md       — trigger: language: go，與當前專案不符
  → 建議執行 `acor remove` 移除，或執行 `/acor-apply` 一併處理

衝突分析
  無衝突
  或
  ⚠ [rule-rule] typescript.md vs testing.md
      typescript.md：「使用 2 格縮排」
      testing.md：「使用 4 格縮排」
```

### 寫入 `.acor/core/last-scan.json`

確認 `.acor/core/` 目錄存在後再寫入。

```json
{
  "scannedAt": "<ISO timestamp>",
  "project": {
    "languages": ["typescript"],
    "frameworks": ["vue", "nuxt"]
  },
  "installedSkills": ["typescript-strict", "vue-patterns", "go-patterns"],
  "installedRules": ["typescript.md", "go.md"],
  "irrelevant": [
    {
      "type": "skill",
      "id": "go-patterns",
      "reason": "skill 標記為 [go, backend]，專案語言為 typescript / 框架為 vue"
    },
    {
      "type": "rule",
      "id": "go",
      "reason": "trigger 指定 language: go，專案語言為 typescript"
    }
  ],
  "conflicts": []
}
```

完成後提示：「掃描完成，執行 `/acor-apply` 處理問題。」

---

## Red Flags（禁止事項）

- ❌ 推薦安裝新的 skills 或 rules
- ❌ 把通用標籤（testing、api、security）的 skill 標記為不相關
- ❌ 把程式碼區塊內容誤判為衝突規範
- ❌ 沒有具體依據就宣告衝突或不相關
- ❌ 未寫入 last-scan.json 就結束
