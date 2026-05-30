---
id: go
name: Go 慣例
description: Go 程式碼慣例：命名、錯誤處理、package 設計
triggers:
  - type: language
    value: go
---

## 命名規範

- exported：`PascalCase`（`UserService`、`GetUser`）
- unexported：`camelCase`（`userService`、`getUser`）
- 介面名：行為名詞加 `-er`（`Reader`、`Storer`、`UserFetcher`）
- 縮寫保持全大寫：`ID`、`URL`、`HTTP`，不寫 `Id`、`Url`

## 錯誤處理

- 永遠處理錯誤，不用 `_` 忽略
- 用 `fmt.Errorf("context: %w", err)` 包裝，保留 unwrap chain
- 呼叫端用 `errors.Is` / `errors.As` 比對，不比對字串

## Package 設計

- Package 名稱：小寫單字，不用底線（`userstore`，不是 `user_store`）
- 每個 package 有單一職責
- 不建立 `util`、`common`、`helper` package — 移到具體的 package

## 格式

- 所有程式碼必須通過 `gofmt`
- import 分組：stdlib → external → internal，各組空一行

## 禁止事項

- 不在 goroutine 裡捕捉 panic 再繼續（讓它 crash）
- 不回傳 `interface{}`，使用具體型別或泛型
- 不在 init() 做複雜初始化
- 不建立 getter/setter，直接存取 exported field（除非需要封裝邏輯）
