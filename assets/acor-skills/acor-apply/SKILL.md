---
name: acor-apply
description: 讀取 acor-scan 的推薦結果，互動選擇後將 skills / rules 套用到 .claude/，並可選擇封存現有項目。
---

# ACOR Apply — 套用推薦

## 核心限制（最高優先）

- **Phase 6 之前禁止寫入任何檔案**，所有寫入必須等使用者確認
- **只能寫入 catalog 內存在的 skill / rule**（從 `.acor/skills/` 或 `.acor/rules/` 讀取內容）
- **封存 = 移動到 `.acor/archive/`**，禁止直接刪除

---

## Phase 1：載入掃描結果

讀取 `.acor/core/last-scan.json`。

- 若不存在 → 停止並提示：「請先執行 `/acor-scan`」
- 若 `scannedAt` 超過 30 分鐘前 → 警告：「掃描結果已過期，建議重新執行 `/acor-scan` 後再套用」（使用者可選擇繼續）

---

## Phase 2：顯示衝突警告（若有）

若 `last-scan.json` 的 `conflicts` 不為空：

```
⚠ 發現衝突，建議先處理：
  <列出每個衝突描述與影響項目>

仍要繼續套用？（yes/no）
```

使用者回 no → 停止。

---

## Phase 3：選擇要套用的 Skills

若 `recommendations` 中有 `type: "skill"` 的項目：

```
推薦 Skills：

  [1] <name>（高信心）
      依據：<evidence>

  [2] <name>（低信心）
      依據：<evidence>

請輸入要套用的編號（逗號分隔，全選輸入 all，略過按 Enter）：
```

等待使用者回應，記錄選擇。

若無推薦 → 顯示「無推薦 Skills」並繼續。

---

## Phase 4：選擇要套用的 Rules

若 `recommendations` 中有 `type: "rule"` 的項目：

```
推薦 Rules：

  [1] <name>（高信心）
      依據：<evidence>

  [2] <name>（低信心）
      依據：<evidence>

請輸入要套用的編號（逗號分隔，全選輸入 all，略過按 Enter）：
```

等待使用者回應，記錄選擇。

若無推薦 → 顯示「無推薦 Rules」並繼續。

---

## Phase 5：選擇要封存的現有項目（可選）

若 `last-scan.json` 的 `existing.skills` 或 `existing.rules` 不為空：

```
現有項目（可選擇封存至 .acor/archive/）：

  Skills：<列出名稱>
  Rules： <列出相對路徑>

請輸入要封存的項目（格式：skill:名稱 或 rule:路徑，逗號分隔，略過按 Enter）：
```

等待使用者回應，記錄選擇。

---

## Phase 6：確認摘要並執行

### 6.1 顯示確認摘要

```
即將執行：

  新增 Skills：<列出選擇的 skills>
  新增 Rules： <列出選擇的 rules>
  封存項目：   <列出要封存的項目，若無則顯示「無」>

確認執行？（yes/no）
```

使用者回 no → 停止。

### 6.2 執行封存

對每個要封存的項目：

**封存 skill（`.claude/skills/<name>/`）：**
```bash
mv .claude/skills/<name>/ .acor/archive/skills/<name>/
```

**封存 rule（`.claude/rules/<relativePath>`）：**
```bash
mv .claude/rules/<relativePath> .acor/archive/rules/<relativePath>
```

### 6.3 套用 Skills

對每個選擇的 skill，從 `.acor/skills/<id>/SKILL.md` 讀取內容，寫入 `.claude/skills/<id>/SKILL.md`。

若目標已存在 → 告知使用者並詢問是否覆寫。

### 6.4 套用 Rules

對每個選擇的 rule，從 `.acor/rules/<relativePath>` 讀取內容，寫入 `.claude/rules/<relativePath>`。

若目標已存在 → 告知使用者並詢問是否覆寫。

### 6.5 更新 state.json

讀取 `.acor/core/state.json`，更新以下欄位：

- `installedSkills`：加入新套用的 skill id
- `installedRules`：加入新套用的 rule relativePath
- `archivedAt`：加入封存項目的時間戳（`"<名稱>": "<ISO timestamp>"`）

寫回 `.acor/core/state.json`。

---

## Phase 7：完成報告

```
✔ 完成

  新增 Skills（N）：<列出名稱>
  新增 Rules（N）： <列出名稱>
  封存項目（N）：   <列出名稱>
```

---

## Red Flags（禁止事項）

- ❌ Phase 6 之前寫入任何檔案
- ❌ 未等使用者確認（Phase 6.1）就執行寫入
- ❌ 直接刪除現有 skill / rule（只能封存）
- ❌ 寫入 `.acor/skills/` 以外不存在的 skill 內容（不可自行產生 skill 內容）
- ❌ 封存後忘記更新 state.json
