---
id: testing
name: 測試規範
description: 單元測試與整合測試撰寫原則，框架無關
triggers:
  - type: devDependency
    value: vitest
  - type: devDependency
    value: jest
  - type: devDependency
    value: "@jest/core"
---

# 測試規範

## 測試原則

- 測試檔與源檔 colocated，放在 `__tests__/` 子目錄
- 檔名格式：`<source>.spec.ts`
- 目標覆蓋率：函式 ≥ 80%，分支 ≥ 70%

## 測試結構

```typescript
describe('功能模組名稱', () => {
  it('正常情境描述', () => {
    // Arrange → Act → Assert
  })

  it('邊界情況描述', () => {
    // ...
  })
})
```

## Mock 原則

- 只 mock 外部 I/O（API、資料庫、檔案系統）
- 避免 mock 內部模組，優先用真實實作
- Mock 後記得在 `afterEach` 清除

## CI 規範

- PR 合併前必須通過所有測試
- 不允許殘留 `.only` 或 `.skip`（加入 CI 檢查）
