---
name: acor-apply
description: 讀取 acor-scan 的推薦結果，互動選擇後將 skills / rules 套用到 .claude/，並可選擇封存現有項目。支援 `/acor-apply all` 跳過所有互動直接套用高信心推薦。
---

# ACOR Apply — 套用推薦

## 核心限制（最高優先）

- **Phase 5 之前禁止寫入任何檔案**，所有寫入必須等使用者確認
- **只能寫入 catalog 內存在的 skill / rule**（從 `.acor/skills/` 或 `.acor/rules/` 讀取內容，不可自行產生）
- **封存 = 移動到 `.acor/archive/`**，禁止直接刪除

---

## 快速模式判斷

若使用者輸入 `/acor-apply all`（或任何含 `all` 的參數）：
- 設定 `autoMode = true`
- 自動選取所有高信心推薦
- 跳過 Phase 3，直接執行 Phase 4（確認摘要）

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

## Phase 3：選擇要套用的項目

**若 `autoMode = true`，跳過此 Phase。**

### 3.1 快速決策（AskUserQuestion — 單選）

計算高信心數 `H`、總推薦數 `T`，使用 AskUserQuestion 詢問：

```
question: "如何套用推薦項目？"
header: "套用模式"
options:
  - label: "套用高信心推薦（H 項）"
    description: "自動套用所有高信心 skills 和 rules，直接進入確認"
  - label: "手動選擇"
    description: "自行決定每個項目"
  - label: "套用全部（T 項）"
    description: "含低信心推薦，共 T 項"
```

- 選「套用高信心推薦」→ selectedSkills = 高信心 skills，selectedRules = 高信心 rules，跳到 Phase 4
- 選「套用全部」→ selectedSkills = 全部 skills，selectedRules = 全部 rules，跳到 Phase 4
- 選「手動選擇」→ 繼續 3.2

若無任何推薦 → 顯示「無推薦項目」，跳到 Phase 4。

### 3.2 選擇 Skills（僅「手動選擇」時執行，有 skill 推薦才詢問）

取 skills 按分數由高到低排序，最多取前 3 項顯示。

使用 AskUserQuestion（multiSelect: true）：

```
question: "選擇要套用的 Skills"
header: "Skills"
options（最多 3 項）:
  - label: "<skill name>"
    description: "<高信心 / 低信心> · 依據：<evidence 摘要>"
  - ...（剩餘 skills 依序，最多 3 項）
```

若 skills 總數 > 3，在最後一個 option 的 description 補充：
`「還有 N 項未顯示，可在 Other 輸入名稱加入，逗號分隔」`

解析使用者回應：
- 勾選的 labels → 對應 skill 加入 selectedSkills
- Other 文字輸入 → 以逗號切分，逐一比對 `recommendations` 中存在的 skill 名稱，符合者加入 selectedSkills，不符合者警告忽略

### 3.3 選擇 Rules（僅「手動選擇」時執行，有 rule 推薦才詢問）

同 3.2 邏輯，對 rules 執行，結果存入 selectedRules。

記錄最終 selectedSkills 和 selectedRules。

---

## Phase 4：確認摘要（含封存建議）

### 4.1 封存建議偵測

自動判斷現有項目是否建議封存：

- 若新增的 skill/rule 與現有某個 skill **功能重疊**（名稱語意相近，如 `vue-patterns` + 新增 `vue-patterns`），標記為「建議封存」
- 若 `conflicts` 中提到某個現有項目，標記為「建議封存」
- 其餘現有項目列為「可選封存」

### 4.2 選擇封存項目（有封存建議或現有項目時才詢問）

先以文字顯示套用摘要：

```
即將執行：
  新增 Skills（N）：<名稱列表，若無顯示「無」>
  新增 Rules（N）： <名稱列表，若無顯示「無」>
```

接著使用 AskUserQuestion（multiSelect: true）詢問封存：

```
question: "是否封存以下現有項目？"
header: "封存選擇"
options（最多 3 項）:
  - label: "<name>（建議封存）"
    description: "原因：衝突 / 功能重疊"   ← 建議封存項目優先列出
  - label: "<name>"
    description: "可選封存的現有項目"       ← 其餘現有項目
  - ...（最多 3 項）
```

若封存候選 > 3 項，description 補充：`「還有 N 項未顯示，可在 Other 輸入名稱封存」`

解析使用者回應：
- 勾選的 labels → 加入 toArchive 清單
- Other 文字輸入 → 逗號切分，比對現有 skill/rule，符合者加入 toArchive
- 不勾選任何項目 → toArchive 為空，不封存

### 4.3 最終確認（AskUserQuestion — 單選）

```
question: "確認執行？"
header: "確認"
options:
  - label: "確認執行"
    description: "新增 N 項，封存 N 項"
  - label: "取消"
    description: "放棄本次套用，不做任何修改"
```

- 選「確認執行」→ 進入 Phase 5
- 選「取消」→ 停止並提示「已取消，未做任何修改」

若 `autoMode = true`，跳過 4.2 和 4.3，直接進入 Phase 5（不封存任何項目）。

---

## Phase 5：執行

### 5.1 執行封存

對每個確認封存的項目：

**封存 skill（`.claude/skills/<name>/`）：**
```bash
mv .claude/skills/<name>/ .acor/archive/skills/<name>/
```

**封存 rule（`.claude/rules/<relativePath>`）：**
```bash
mv .claude/rules/<relativePath> .acor/archive/rules/<relativePath>
```

### 5.2 套用 Skills

對每個選擇的 skill，從 `.acor/skills/<id>/SKILL.md` 讀取內容，寫入 `.claude/skills/<id>/SKILL.md`。

若目標已存在 → 直接覆寫（不另行詢問，封存已是保護機制）。

### 5.3 套用 Rules

對每個選擇的 rule，從 `.acor/rules/<relativePath>` 讀取內容，寫入 `.claude/rules/<relativePath>`。

若目標已存在 → 直接覆寫（不另行詢問，封存已是保護機制）。

### 5.4 更新 state.json

讀取 `.acor/core/state.json`，更新以下欄位：

- `installedSkills`：加入新套用的 skill id
- `installedRules`：加入新套用的 rule relativePath
- `archivedAt`：加入封存項目的時間戳（`"<名稱>": "<ISO timestamp>"`）

寫回 `.acor/core/state.json`。

---

## Phase 6：完成報告

```
✔ 完成

  新增 Skills（N）：<列出名稱>
  新增 Rules（N）： <列出名稱>
  封存項目（N）：   <列出名稱，若無顯示「無」>
```

---

## 互動流程對照

| 情境 | AskUserQuestion 次數 |
|------|---------------------|
| 選「套用高信心推薦」+ 無封存建議 | **2 次**（模式選擇 + 最終確認） |
| 選「套用高信心推薦」+ 有封存建議 | **3 次**（模式選擇 + 封存選擇 + 最終確認） |
| 選「手動選擇」，有 skills + rules | **最多 5 次**（模式 + Skills + Rules + 封存 + 確認） |
| `/acor-apply all` | **0 次**（全自動） |

> 選項超過 3 項時，Other 輸入可補充剩餘項目，不增加互動次數。

---

## Red Flags（禁止事項）

- ❌ 封存後忘記更新 state.json
- ❌ `autoMode` 時套用低信心推薦（除非明確傳入 `all --include-low`）
