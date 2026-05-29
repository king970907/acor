---
id: testing-vitest
name: Testing with Vitest
description: Vitest 單元測試與整合測試最佳實踐
version: 1.0.0
tags: [testing, vitest]
triggers:
  - type: devDependency
    value: vitest
  - type: file
    value: vitest.config
---

# Vitest 測試規範

## 測試結構

測試檔與源檔 colocated，放在 `__tests__/` 子目錄：

```
src/
  utils/
    formatDate.ts
    __tests__/
      formatDate.spec.ts
```

## 測試撰寫原則

```typescript
import { describe, it, expect, vi } from 'vitest'
import { formatDate } from '../formatDate'

describe('formatDate', () => {
  it('formats ISO date to readable string', () => {
    const result = formatDate('2026-01-15')
    expect(result).toBe('January 15, 2026')
  })

  it('returns empty string for invalid date', () => {
    expect(formatDate('')).toBe('')
  })
})
```

## Mock

```typescript
const mockFetch = vi.fn().mockResolvedValue({ data: [] })
vi.mock('../api', () => ({ fetchUsers: mockFetch }))
```

## 目標覆蓋率

- 函式覆蓋率：≥ 80%
- 分支覆蓋率：≥ 70%
- 執行：`vitest run --coverage`
