---
name: acor-apply
description: 讀取 /acor-scan 的報告，處理不相關項目與衝突。用 evidence 欄位顯示衝突內容，只在確定修改時才開啟檔案。所有操作確認後統一執行，刪除同步更新 acor.json。
---

# ACOR Apply — 問題處理

## 核心原則

- **Phase 4 確認前不修改任何檔案**：Phase 2、3 只收集「待執行清單」
- **用 `evidence` 顯示衝突，不重讀檔案**：只有「確定要修改內容的檔案」才在 Phase 4 開啟
- **刪除必須同步更新 `acor.json`**：否則下次 `acor init` 會重新安裝
- **只處理 scan 發現的問題**：不推薦新增 skills 或 rules

---

## Phase 1：載入掃描結果

讀取 `.acor/core/last-scan.json`。

- 不存在 → 停止：「請先執行 `/acor-scan`」
- `irrelevant` 和 `conflicts` 都為空 → 顯示「無問題，環境配置良好」，結束

**新鮮度判斷（看 `acor.json` 異動時間，不看時間長度）：**

執行 Bash 取得 `acor.json` 的修改時間（秒）：
```bash
stat -f %m acor.json 2>/dev/null || stat -c %Y acor.json
```

- mtime > `scannedAt` 的 Unix 時間戳 → `acor.json` 在 scan 之後有變動 → 停止：「`acor.json` 已更新，請重新執行 `/acor-scan`」
- mtime ≤ `scannedAt` → scan 結果有效，繼續

---

## Phase 2：收集不相關項目的刪除清單

若 `irrelevant` 不為空，整批詢問（AskUserQuestion 多選）：

```
以下項目與當前專案不符，選擇要移除的：
  ◉ go-patterns（skill）— tags: [go]，專案為 vue/typescript
  ◉ go.md（rule）       — trigger: language: go
```

勾選的項目加入 `toDelete` 清單，不勾選略過。

---

## Phase 3：收集衝突的處理清單

若 `conflicts` 不為空，逐一處理（AskUserQuestion 單選）。

**因 scan 的 Early Exit 設計，`irrelevant` 非空時 `conflicts` 必為空，所以 Phase 2 和 Phase 3 不會同時有項目需處理。**

顯示衝突時直接使用 `evidence` 欄位，不重新開啟檔案：

```
⚠ 衝突 1/N：[rule-rule]
  typescript.md vs testing.md
  typescript.md：「使用 2 格縮排」
  testing.md：「使用 4 格縮排」
```

使用者選擇的結果加入 `toModify`（修改）或 `toDelete`（刪除）清單，略過的不加入。

### `rule-rule` 選項
- 以 A 為準，修改 B → 加入 `toModify`
- 以 B 為準，修改 A → 加入 `toModify`
- 合併：移除重複，保留統一規定 → 加入 `toModify`
- 略過

### `skill-skill` 選項
- 移除 skill A → 加入 `toDelete`
- 移除 skill B → 加入 `toDelete`
- 略過

### `skill-rule` 選項
- 以 skill 為準，修改 rule → 加入 `toModify`
- 以 rule 為準，修改 skill → 加入 `toModify`
- 略過

---

## Phase 4：確認並統一執行

### 顯示完整摘要

彙整 Phase 2 和 Phase 3 收集的所有待執行項目：

```
即將執行：
  刪除 skill go-patterns（.claude/ 與 acor.json 同步）
  刪除 rule  go.md（.claude/ 與 acor.json 同步）
  修改 typescript.md — 縮排改為 2 格
  略過 1 個衝突
```

### 最終確認（AskUserQuestion 單選）

取消 → 不執行任何操作，結束。

### 執行（確認後才開始）

**只在此時開啟需要修改內容的檔案**（`toModify` 中的項目）。

執行順序：
1. 開啟 `toModify` 中的每個檔案，只修改衝突段落
2. 刪除 `toDelete` 中的 skill 目錄（`.claude/skills/<id>/`）
3. 刪除 `toDelete` 中的 rule 檔案（`.claude/rules/<rel>`）
4. 更新 `acor.json`：從 `skills` 和 `rules` 陣列移除所有 `toDelete` 中的項目

---

## Phase 5：完成報告

```
✔ 完成

  已刪除（N）：<列出項目>
  已修改（N）：<列出檔案>
  略過（N）：<列出略過的問題>
```

---

## Red Flags（禁止事項）

- ❌ Phase 4 確認前修改或刪除任何檔案
- ❌ 顯示衝突時開啟檔案（應直接用 evidence 欄位）
- ❌ 刪除任何項目但未同步更新 `acor.json`
- ❌ 不使用 Bash stat 指令就判斷 acor.json 新鮮度
- ❌ 推薦安裝新的 skills 或 rules
- ❌ 重寫整個檔案（只修改衝突段落）
