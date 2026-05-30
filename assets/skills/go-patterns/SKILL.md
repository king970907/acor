---
id: go-patterns
name: Go Patterns
description: Go 慣用寫法：錯誤處理、介面設計、goroutine、context 傳播
version: 1.0.0
tags: [go, backend, concurrency]
triggers:
  - type: language
    value: go
  - type: file
    value: go.mod
---

# Go 開發規範

## 錯誤處理

永遠檢查錯誤，使用 `fmt.Errorf` + `%w` 包裝（保留 stack chain）：

```go
func loadConfig(path string) (*Config, error) {
    data, err := os.ReadFile(path)
    if err != nil {
        return nil, fmt.Errorf("loadConfig: %w", err)
    }
    var cfg Config
    if err := json.Unmarshal(data, &cfg); err != nil {
        return nil, fmt.Errorf("loadConfig: parse: %w", err)
    }
    return &cfg, nil
}
```

呼叫端用 `errors.Is` / `errors.As` 比對類型，不要比對字串：

```go
if errors.Is(err, os.ErrNotExist) {
    // 檔案不存在的特殊處理
}
```

## 介面設計

介面定義在使用端（消費者），不在實作端。保持介面小：

```go
// 定義在需要它的 package，不是在 repository package
type UserReader interface {
    GetUser(ctx context.Context, id int64) (*User, error)
}
```

## Context 傳播

所有 I/O 操作第一個參數必須是 `ctx context.Context`，不可忽略：

```go
func (s *Service) FetchData(ctx context.Context, id int64) (*Data, error) {
    return s.repo.Find(ctx, id)
}
```

## Goroutine 管理

啟動 goroutine 前確認它的生命週期如何結束，使用 `errgroup` 管理並發：

```go
g, ctx := errgroup.WithContext(ctx)

g.Go(func() error {
    return processA(ctx)
})
g.Go(func() error {
    return processB(ctx)
})

if err := g.Wait(); err != nil {
    return fmt.Errorf("parallel work: %w", err)
}
```

## Struct 初始化

使用具名欄位，避免位置依賴：

```go
// 正確
user := User{
    ID:    1,
    Name:  "Alice",
    Email: "alice@example.com",
}

// 錯誤（新增欄位會 break）
user := User{1, "Alice", "alice@example.com"}
```

## 零值設計

讓 zero value 可用，避免 `New()` 強制初始化：

```go
type Counter struct {
    mu    sync.Mutex
    count int
}

// 直接 var c Counter 就能用，不需要 NewCounter()
func (c *Counter) Inc() {
    c.mu.Lock()
    defer c.mu.Unlock()
    c.count++
}
```
