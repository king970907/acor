---
name: acor-apply
description: 讀取 /acor-scan 的報告，處理不相關項目與衝突。用 evidence 欄位顯示衝突內容，只在確定修改時才開啟檔案。所有操作確認後才執行，刪除同步更新 acor.json。
---

# ACOR Apply — 問題處理

## 核心原則

- **Phase 4 確認前不修改任何檔案**
- **用 `evidence` 顯示衝突，不重讀檔案**：只有「確定要修改的檔案」才開啟
- **刪除必須同步更新 `acor.json`**：否則下次 `acor init` 會重新安裝
- **只處理 scan 發現的問題**：不推薦新增 skills 或 rules

---

## Phase 1：載入掃描結果

讀取 `.acor/core/last-scan.json`。

- 不存在 → 停止：「請先執行 `/acor-scan`」
- `irrelevant` 和 `conflicts` 都為空 → 顯示「無問題，環境配置良好」，結束

**新鮮度判斷（看 `acor.json` 異動，不看時間）：**

比較 `acor.json` 的最後修改時間與 `scannedAt`：
- `acor.json` 的 mtime > `scannedAt` → `acor.json` 在 scan 之後有變動 → 停止：「`acor.json` 已更新，請重新執行 `/acor-scan`」
- `acor.json` 的 mtime ≤ `scannedAt` → scan 結果仍然有效，繼續

---

## Phase 2：處理不相關項目

若 `irrelevant` 不為空，整批詢問（AskUserQuestion 多選）：

```
以下項目與當前專案不符，選擇要移除的：
  ◉ go-patterns（skill）— tags: [go]，專案為 vue/typescript
  ◉ go.md（rule）       — trigger: language: go
```

勾選加入刪除清單，不勾選略過。

---

## Phase 3：處理衝突

若 `conflicts` 不為空，逐一處理（AskUserQuestion 單選）。

**顯示衝突時直接使用 `evidence` 欄位的內容，不重新開啟檔案：**

```
⚠ 衝突 1/N：[rule-rule]
  typescript.md vs testing.md
  typescript.md：「使用 2 格縮排」
  testing.md：「使用 4 格縮排」
```

### `rule-rule` 選項
- 以 A 為準，修改 B
- 以 B 為準，修改 A
- 合併：移除重複，保留統一規定
- 略過

### `skill-skill` 選項
- 移除 skill A（`.claude/` 與 `acor.json` 同步）
- 移除 skill B（`.claude/` 與 `acor.json` 同步）
- 略過

### `skill-rule` 選項
- 以 skill 為準，修改 rule
- 以 rule 為準，修改 skill
- 略過

---

## Phase 4：確認並執行

### 顯示完整修改摘要

```
即將執行：
  移除 skill go-patterns（.claude/ 與 acor.json 同步）
  移除 rule  go.md（.claude/ 與 acor.json 同步）
  修改 typescript.md — 縮排改為 2 格
  略過 1 個衝突
```

### 最終確認（AskUserQuestion 單選）

取消 → 不修改任何檔案，結束。

### 執行

**只在此時才開啟需要修改的檔案**（之前只讀 evidence，不開檔）。

執行順序：
1. 修改 rule 內容（只改衝突段落）
2. 刪除 skill 目錄（`.claude/skills/<id>/`）
3. 刪除 rule 檔案（`.claude/rules/<rel>`）
4. 更新 `acor.json`：從 `skills` 和 `rules` 陣列移除所有被刪除的項目

---

## Phase 5：完成報告

```
✔ 完成

  已移除不相關（N）：<列出項目>
  已修改（N）：<列出檔案>
  已刪除（N）：<列出項目>
  略過（N）：<列出略過的問題>
```

---

## Red Flags（禁止事項）

- ❌ Phase 4 確認前修改或刪除任何檔案
- ❌ 顯示衝突時開啟檔案（應用 evidence 欄位）
- ❌ 刪除任何項目但未同步更新 `acor.json`
- ❌ 推薦安裝新的 skills 或 rules
- ❌ 重寫整個檔案（只改衝突段落）
