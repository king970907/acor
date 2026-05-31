---
name: acor-apply
description: 讀取 /acor-scan 的衝突報告，逐一處理衝突：修改、合併或移除衝突內容。刪除 skill 時同步更新 acor.json。所有修改需使用者確認後才執行。
---

# ACOR Apply — 衝突處理

## 核心原則

- **Phase 4 確認前不修改任何檔案**
- **刪除 skill 必須同步更新 `acor.json`**：否則下次 `acor init` 會重新安裝
- **只處理衝突**：不推薦新增 skills 或 rules，那是使用者透過 `acor add` 決定的事

---

## Phase 1：載入掃描結果

讀取 `.acor/core/last-scan.json`。

- 不存在 → 停止並提示：「請先執行 `/acor-scan`」
- `scannedAt` 超過 60 分鐘 → 警告：掃描結果可能過期，建議重新執行（使用者可選擇繼續）
- `conflicts` 為空 → 顯示「無衝突，環境配置良好」，結束

---

## Phase 2：逐一處理衝突

對每個衝突顯示詳情並提供選項（AskUserQuestion 單選）：

```
⚠ 衝突 1/N：[類型]
  <描述>
  <引用的衝突原文>
```

### `rule-rule`（兩個 rules 矛盾）

選項：
- 以 A 為準，修改 B 使其一致
- 以 B 為準，修改 A 使其一致
- 合併：移除重複，保留統一規定
- 略過

### `skill-skill`（兩個 skills 互斥）

選項：
- 移除 skill A（從 `.claude/skills/` 刪除，並從 `acor.json` 移除）
- 移除 skill B（從 `.claude/skills/` 刪除，並從 `acor.json` 移除）
- 兩個都保留（略過）

### `skill-rule`（skill 與 rule 矛盾）

選項：
- 以 skill 為準，修改 rule 使其一致
- 以 rule 為準，修改 skill 使其一致
- 略過

---

## Phase 3：優化建議（選填）

衝突全部處理後，若有以下情況用文字提出建議，**不自動執行**：

- 多個 rules 有重疊但不衝突的內容 → 建議手動合併精簡
- 某個 skill 的規範已被 rule 完整覆蓋 → 建議考慮移除其中一個

---

## Phase 4：確認並執行

### 顯示完整修改摘要

```
即將執行：
  修改 typescript.md — 將縮排改為 2 格
  刪除 skill react-patterns（.claude/ 與 acor.json 同步）
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

1. 修改 rule 內容（Edit 工具，只改衝突的段落）
2. 刪除 skill 目錄（`.claude/skills/<id>/`）
3. **更新 `acor.json`**：從 `skills` 陣列移除對應 id
4. 若有 rule 被刪除，同步從 `acor.json` 的 `rules` 陣列移除

---

## Phase 5：完成報告

```
✔ 完成

  已修改（N）：<列出檔案>
  已刪除（N）：<列出項目>
  略過（N）：<列出略過的衝突>
```

---

## Red Flags（禁止事項）

- ❌ Phase 4 確認前修改或刪除任何檔案
- ❌ 刪除 skill 但未同步更新 `acor.json`
- ❌ 推薦安裝新的 skills 或 rules
- ❌ 重寫整個 skill 或 rule 檔案（只修改衝突段落）
