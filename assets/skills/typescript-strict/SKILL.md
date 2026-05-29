---
id: typescript-strict
name: TypeScript Strict Mode
description: TypeScript strict mode 最佳實踐：型別安全、unknown 處理、避免 any
version: 1.0.0
tags: [typescript, type-safety]
triggers:
  - type: language
    value: typescript
  - type: devDependency
    value: typescript
---

# TypeScript Strict Mode 規範

## 型別安全原則

- 啟用 strict mode（`"strict": true`）
- 禁止裸 `any`，必要時用 `unknown` + type guard
- exported functions 必須明確標示參數和回傳型別
- 型別推斷明確時不需要標示（例如 `const x = 1`）

## 型別定義

使用 `interface` 定義可繼承的物件形狀，`type` 用於 union、intersection 和工具型別。

```typescript
// object shape → interface
interface User {
  id: string
  email: string
}

// union → type
type UserRole = 'admin' | 'member' | 'viewer'
```

## 錯誤處理

```typescript
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return 'Unexpected error'
}

async function loadData(): Promise<Data> {
  try {
    return await fetchData()
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error))
  }
}
```

## Null 安全

使用 optional chaining 和 nullish coalescing：

```typescript
const name = user?.profile?.name ?? 'Anonymous'
```
