---
id: node-security
name: Node.js 安全規範
description: Node.js 後端 API 安全實踐，避免常見 OWASP 漏洞
triggers:
  - type: projectType
    value: api
  - type: framework
    value: express
  - type: framework
    value: fastify
  - type: framework
    value: hono
---

# Node.js 安全規範

## 環境變數

- 所有機密（API key、DB 密碼）一律從 `process.env` 讀取
- 禁止 hardcode 機密值，禁止提交 `.env` 檔
- 啟動時驗證必要環境變數是否存在

## 輸入驗證

- 所有外部輸入（request body、query params）用 `zod` 驗證
- 不信任 `req.params`，統一驗證後再使用

## HTTP 安全

- 使用 `helmet` 設定安全 HTTP headers
- 實作 rate limiting 防止暴力攻擊
- CORS 白名單明確列出，禁止 `origin: *`

## 禁止事項

- 禁止 `eval()`、`Function(constructor)`
- 禁止直接拼接 SQL（使用 ORM 或 parameterized query）
- 禁止在 response 中暴露 stack trace
- 禁止記錄密碼、token 等敏感資料到 log
