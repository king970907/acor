---
name: acor-scan
description: 掃描當前專案已安裝的 skills 與 rules，分析內容衝突與矛盾，輸出衝突報告並寫入 .acor/core/last-scan.json，供 /acor-apply 使用。
---

# ACOR Scan — 衝突分析

## 核心原則

- **只分析已安裝的項目**：讀 `.claude/skills/` 和 `.claude/rules/`，不做推薦
- **每個衝突必須有具體證據**：引用原文，不憑印象
- **讀取有上限**：每個檔案最多讀前 80 行，超過部分略過

---

## Phase 1：建立已安裝清單

列出以下目錄的內容：

- `.claude/skills/`：列出所有子目錄名稱（排除 `acor-scan`、`acor-apply`）
- `.claude/rules/`：列出所有 `.md` 檔案的相對路徑

若兩個目錄都是空的 → 停止並提示：「尚未安裝任何 skills 或 rules，請先執行 `acor add`」

---

## Phase 2：讀取內容

讀取每個 skill 的 `SKILL.md` 和每個 rule 的 `.md` 檔案，**每個最多讀前 80 行**。

目的：找出可能衝突的規範，例如：
- 縮排：tabs vs spaces，2 vs 4 格
- 引號：single vs double quotes
- 行長：不同的 max line length
- 命名慣例：camelCase vs snake_case 的矛盾規定
- 框架衝突：同時安裝多個前端框架的 patterns（如 vue-patterns + react-patterns）
- 測試工具衝突：同時出現 vitest 和 jest 的不同規範

---

## Phase 3：分析衝突

### 衝突類型

| 類型 | 說明 | 範例 |
|------|------|------|
| `rule-rule` | 兩個 rules 之間矛盾 | A 要求 2 格縮排，B 要求 4 格 |
| `skill-skill` | 兩個 skills 之間衝突 | react-patterns + vue-patterns 同時存在 |
| `skill-rule` | skill 與 rule 之間矛盾 | skill 說用 tabs，rule 說用 spaces |

### 判斷標準

- **確認衝突**：找到明確矛盾的文字（不同的規定針對同一件事）
- **疑似衝突**：語意上可能衝突，但需更多上下文確認
- **不衝突**：只是風格不同，不互相矛盾的部分不報告

---

## Phase 4：輸出報告

### 終端機輸出

```
已安裝 Skills（N）：<列出名稱>
已安裝 Rules（N）： <列出名稱>

衝突分析
  <無衝突>
  或
  ⚠ [rule-rule] typescript.md vs testing.md
      typescript.md 第 12 行：「使用 2 格縮排」
      testing.md 第 8 行：「使用 4 格縮排」

  ⚠ [skill-skill] vue-patterns vs react-patterns
      同時安裝兩個前端框架 patterns，建議只保留一個
```

### 寫入 `.acor/core/last-scan.json`

```json
{
  "scannedAt": "<ISO timestamp>",
  "installedSkills": ["typescript-strict", "vue-patterns"],
  "installedRules": ["typescript.md", "testing.md"],
  "conflicts": [
    {
      "type": "rule-rule",
      "description": "縮排設定衝突：typescript.md（2格）vs testing.md（4格）",
      "items": ["typescript.md", "testing.md"],
      "evidence": {
        "typescript.md": "使用 2 格縮排",
        "testing.md": "使用 4 格縮排"
      }
    }
  ]
}
```

完成後提示：「掃描完成，執行 `/acor-apply` 處理衝突。」

---

## Red Flags（禁止事項）

- ❌ 推薦安裝新的 skills 或 rules（那不是這個 skill 的職責）
- ❌ 讀取超過 80 行
- ❌ 沒有具體引用文字就宣告衝突
- ❌ 未寫入 last-scan.json 就結束
