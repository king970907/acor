---
id: node-api
name: Node.js API Patterns
description: Node.js REST API 設計與安全性最佳實踐（Express / Fastify / Hono）
version: 1.0.0
tags: [node, api, backend]
triggers:
  - type: framework
    value: express
  - type: framework
    value: fastify
  - type: framework
    value: hono
  - type: projectType
    value: api
---

# Node.js API 開發規範

## API 回應格式

統一使用標準回應結構：

```typescript
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  meta?: { total: number; page: number; limit: number }
}
```

## 錯誤處理

```typescript
class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message)
  }
}

// 中間件捕捉
app.use((err: unknown, req, res, next) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
    })
  }
  res.status(500).json({ success: false, error: 'Internal server error' })
})
```

## 安全性

- 使用 `helmet` 設定安全 HTTP headers
- 輸入驗證使用 `zod`
- 環境變數透過 `process.env`，不 hardcode
- 敏感資料不寫 log

## 環境變數管理

```typescript
const config = {
  port: Number(process.env.PORT ?? 3000),
  dbUrl: process.env.DATABASE_URL!,
}

if (!config.dbUrl) throw new Error('DATABASE_URL is required')
```
