---
name: acor-apply
description: 讀取 /acor-scan 的報告，處理不相關項目與衝突：移除不符專案的 skills/rules，解決衝突內容。所有修改需使用者確認後才執行，刪除操作同步更新 acor.json。
---

# ACOR Apply — 問題處理

## 核心原則

- **Phase 4 確認前不修改任何檔案**
- **刪除 skill 或 rule 必須同步更新 `acor.json`**：否則下次 `acor init` 會重新安裝
- **只處理 scan 發現的問題**：不推薦新增 skills 或 rules

---

## Phase 1：載入掃描結果

讀取 `.acor/core/last-scan.json`。

- 不存在 → 停止並提示：「請先執行 `/acor-scan`」
- `scannedAt` 超過 60 分鐘 → 警告：掃描結果可能過期，建議重新執行（使用者可選擇繼續）
- `irrelevant` 和 `conflicts` 都為空 → 顯示「無問題，環境配置良好」，結束

---

## Phase 2：處理不相關項目

若 `irrelevant` 不為空，先處理這類問題。

對每個不相關項目顯示詳情：

```
⚠ 不相關 1/N：[skill / rule]
  <id>
  <原因>
```

**整批詢問**（AskUserQuestion 多選）：

```
以下項目與當前專案不符，選擇要移除的：
  ◉ go-patterns（skill）— 標記為 [go]，專案為 Vue/TypeScript
  ◉ go.md（rule）       — trigger: language: go，專案語言為 TypeScript
```

- 勾選 → 加入刪除清單
- 不勾選 → 保留（略過）

---

## Phase 3：處理衝突

若 `conflicts` 不為空，逐一處理。

對每個衝突顯示詳情（AskUserQuestion 單選）：

```
⚠ 衝突 1/N：[類型]
  <描述>
  <引用的衝突原文>
```

### `rule-rule`

- 以 A 為準，修改 B 使其一致
- 以 B 為準，修改 A 使其一致
- 合併：移除重複，保留統一規定
- 略過

### `skill-skill`

- 移除 skill A（`.claude/skills/` 與 `acor.json` 同步）
- 移除 skill B（`.claude/skills/` 與 `acor.json` 同步）
- 兩個都保留（略過）

### `skill-rule`

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
  修改 typescript.md — 將縮排改為 2 格
  略過 1 個衝突
```

### 最終確認（AskUserQuestion 單選）

```
確認執行？
  ● 確認
  ○ 取消
```

取消 → 不修改任何檔案，結束。

### 執行順序

1. 修改 rule 內容（只改衝突段落）
2. 刪除 skill 目錄（`.claude/skills/<id>/`）
3. 刪除 rule 檔案（`.claude/rules/<rel>`）
4. **更新 `acor.json`**：從 `skills` 和 `rules` 陣列中移除所有被刪除的項目

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
- ❌ 刪除任何項目但未同步更新 `acor.json`
- ❌ 推薦安裝新的 skills 或 rules
- ❌ 重寫整個 skill 或 rule 檔案（只修改衝突段落）
