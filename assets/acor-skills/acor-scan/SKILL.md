---
name: acor-scan
description: 掃描已安裝的 skills 與 rules，先做相關性檢查，通過後才做衝突分析。每個檔案只讀一次，結果寫入 .acor/core/last-scan.json。
---

# ACOR Scan — 相關性與衝突分析

## 核心原則

- **相關性先行**：有不相關項目就停下，不繼續做衝突分析
- **每個檔案只讀一次**：frontmatter 與正文同時取得，不重複開檔
- **不讀程式碼區塊**：跳過 ` ``` ` 之間的內容，只分析說明文字
- **有具體依據才報告**：引用原文，不憑印象

---

## Phase 1：偵測專案語言與框架

依序檢查以下檔案是否存在，存在就讀取：

| 檔案 | 判斷內容 |
|------|---------|
| `package.json` | dependencies / devDependencies → 框架（vue, react, next, nuxt, express…）、語言（typescript） |
| `go.mod` | → 語言：go |
| `Cargo.toml` | → 語言：rust |
| `pyproject.toml` / `requirements.txt` | → 語言：python |
| `pom.xml` / `build.gradle` | → 語言：java |
| `Package.swift` | → 語言：swift |

整理結果：
```
languages:  [typescript]
frameworks: [vue, nuxt]
```

---

## Phase 2：讀取已安裝項目（一次讀完）

列出：
- `.claude/skills/`：所有子目錄，排除 `acor-scan`、`acor-apply`
- `.claude/rules/`：所有 `.md` 檔案

若兩者都空 → 停止：「尚未安裝任何 skills 或 rules，請先執行 `acor add`」

**讀取每個檔案一次**，同時取得：
- frontmatter（`tags`、`triggers`）→ 用於相關性檢查
- 正文說明文字（跳過程式碼區塊）→ 用於衝突分析（若進入 Phase 4）

---

## Phase 3：相關性檢查

用 Phase 2 已取得的 frontmatter，比對 Phase 1 的專案特徵。

**標記為不相關的條件：**
tags 或 triggers 包含明確語言/框架識別詞，且與專案不符。

常見識別詞：

| 識別詞 | 屬於 |
|--------|------|
| `go`, `golang` | Go |
| `rust` | Rust |
| `python` | Python |
| `java`, `spring` | Java |
| `react`, `nextjs` | React |
| `vue`, `nuxt` | Vue |
| `swift` | Swift |

**不標記的情況：**
- tags 只有通用標籤：`testing`, `api`, `backend`, `security`
- skill 本身跨語言（如 `node-api` 屬通用 API 規範）

### ✅ Early Exit

若發現任何不相關項目 → **立即停止，不進行 Phase 4**。

原因：不相關的 skill 內容不應被納入衝突分析，移除後環境才是正確的基線。

輸出後提示：「請執行 `/acor-apply` 移除不相關項目，完成後重新執行 `/acor-scan`」

---

## Phase 4：衝突分析（僅在 Phase 3 全數通過時執行）

使用 Phase 2 已讀取的正文內容（不重新開檔），分析說明文字中的矛盾。

### 衝突類型

| 類型 | 說明 | 範例 |
|------|------|------|
| `rule-rule` | 兩個 rules 明確矛盾 | A 要求 2 格縮排，B 要求 4 格 |
| `skill-skill` | 兩個 skills 語意互斥 | react-patterns + vue-patterns 同時存在 |
| `skill-rule` | skill 與 rule 矛盾 | skill 說用 tabs，rule 說用 spaces |

只報告有具體原文可引用的確認衝突。

---

## Phase 5：輸出報告

### 終端機輸出

```
專案偵測
  語言：typescript　框架：vue, nuxt

已安裝 Skills（N）：typescript-strict, vue-patterns, go-patterns
已安裝 Rules（N）： typescript.md, go.md

不相關項目（已停止衝突分析）
  ⚠ [skill] go-patterns — tags: [go]，與當前專案不符
  ⚠ [rule]  go.md       — trigger: language: go，與當前專案不符
  → 執行 /acor-apply 移除後重新 scan
```

或全部相關時：

```
不相關項目：無，繼續衝突分析

衝突分析
  無衝突
  或
  ⚠ [rule-rule] typescript.md vs testing.md
      typescript.md：「使用 2 格縮排」
      testing.md：「使用 4 格縮排」
```

### 寫入 `.acor/core/last-scan.json`

確認 `.acor/core/` 目錄存在後寫入：

```json
{
  "scannedAt": "<ISO timestamp>",
  "project": {
    "languages": ["typescript"],
    "frameworks": ["vue", "nuxt"]
  },
  "installedSkills": ["typescript-strict", "vue-patterns"],
  "installedRules": ["typescript.md"],
  "irrelevant": [
    {
      "type": "skill",
      "id": "go-patterns",
      "reason": "tags: [go]，專案為 typescript / vue"
    }
  ],
  "conflicts": [
    {
      "type": "rule-rule",
      "description": "縮排衝突：typescript.md（2格）vs testing.md（4格）",
      "items": ["typescript.md", "testing.md"],
      "evidence": {
        "typescript.md": "使用 2 格縮排",
        "testing.md": "使用 4 格縮排"
      }
    }
  ]
}
```

完成後提示：「掃描完成，執行 `/acor-apply` 處理問題。」

---

## Red Flags（禁止事項）

- ❌ 有不相關項目仍繼續做衝突分析
- ❌ 同一個檔案開啟超過一次
- ❌ 把通用標籤（testing、api、security）的 skill 標記為不相關
- ❌ 把程式碼區塊內容誤判為衝突
- ❌ 沒有具體原文就宣告衝突
- ❌ 未寫入 last-scan.json 就結束
