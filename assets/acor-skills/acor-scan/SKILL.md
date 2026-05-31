---
name: acor-scan
description: 掃描當前專案已安裝的 skills 與 rules，分析內容衝突與矛盾，輸出衝突報告並寫入 .acor/core/last-scan.json，供 /acor-apply 使用。
---

# ACOR Scan — 衝突分析

## 核心原則

- **只分析已安裝的項目**：讀 `.claude/skills/` 和 `.claude/rules/`，不做推薦
- **每個衝突必須有具體證據**：引用原文，不憑印象
- **不讀程式碼區塊**：只分析說明文字與規範條文，跳過 ` ``` ` 區塊內的範例程式碼

---

## Phase 1：建立已安裝清單

列出以下目錄的內容：

- `.claude/skills/`：所有子目錄名稱，排除 `acor-scan`、`acor-apply`
- `.claude/rules/`：所有 `.md` 檔案的相對路徑

若兩者都是空的 → 停止並提示：「尚未安裝任何 skills 或 rules，請先執行 `acor add`」

---

## Phase 2：讀取內容

讀取每個 skill 的 `SKILL.md` 與每個 rule 的 `.md` 全文。

分析時**跳過程式碼區塊**（\`\`\` 之間的內容），只看說明文字與規範條目，避免把範例程式碼誤判為衝突。

---

## Phase 3：分析衝突

### 衝突類型

| 類型 | 說明 | 範例 |
|------|------|------|
| `rule-rule` | 兩個 rules 之間明確矛盾 | A 要求 2 格縮排，B 要求 4 格 |
| `skill-skill` | 兩個 skills 語意重疊或互斥 | react-patterns + vue-patterns 同時存在 |
| `skill-rule` | skill 與 rule 之間矛盾 | skill 說用 tabs，rule 說用 spaces |

### 判斷標準

- **確認衝突**：找到針對同一件事的不同規定，有具體原文可引用
- **疑似衝突**：語意上可能矛盾，但文字不夠明確，標記為疑似
- **不報告**：風格偏好差異（如不同命名建議但不互相矛盾）

---

## Phase 4：輸出報告

### 終端機輸出

```
已安裝 Skills（N）：typescript-strict, vue-patterns
已安裝 Rules（N）： typescript.md, testing.md

衝突分析
  無衝突
  或
  ⚠ [rule-rule] typescript.md vs testing.md
      typescript.md：「使用 2 格縮排」
      testing.md：「使用 4 格縮排」

  ⚠ [skill-skill] vue-patterns vs react-patterns
      同時安裝兩個前端框架 patterns，建議只保留一個
```

### 寫入 `.acor/core/last-scan.json`

確認 `.acor/core/` 目錄存在後再寫入。

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

- ❌ 推薦安裝新的 skills 或 rules
- ❌ 把程式碼區塊內容誤判為衝突規範
- ❌ 沒有具體引用原文就宣告衝突
- ❌ 未寫入 last-scan.json 就結束
