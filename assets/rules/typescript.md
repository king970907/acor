---
id: typescript
name: TypeScript 慣例
description: TypeScript strict mode 程式碼慣例與型別安全規範
triggers:
  - type: language
    value: typescript
  - type: devDependency
    value: typescript
---

# TypeScript 程式碼慣例

## 基本設定

- 啟用 `"strict": true`
- 禁止裸 `any`，必要時用 `unknown` + type guard
- ESM 專案 import 一律帶 `.js` 副檔名

## 型別定義

- `interface` 用於可繼承的物件形狀
- `type` 用於 union、intersection 和工具型別
- Exported functions 必須明確標示參數和回傳型別

## 錯誤處理

```typescript
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return 'Unexpected error'
}
```

## 命名慣例

- 型別/介面：PascalCase
- 變數/函式：camelCase
- 常數：UPPER_SNAKE_CASE
