---
id: react-patterns
name: React / Next.js Patterns
description: React 18+ 與 Next.js App Router 開發最佳實踐
version: 1.0.0
tags: [react, nextjs, frontend]
triggers:
  - type: framework
    value: react
  - type: framework
    value: next
  - type: dependency
    value: react
---

# React / Next.js 開發規範

## 元件設計

函式元件為主，明確標示 props 型別：

```typescript
interface CardProps {
  title: string
  onSelect: (id: string) => void
}

export function Card({ title, onSelect }: CardProps) {
  return <button onClick={() => onSelect(title)}>{title}</button>
}
```

## Hooks

自訂 Hook 以 `use` 開頭命名，只在 React 函式中呼叫：

```typescript
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}
```

## Next.js App Router

- Server Components 為預設，避免不必要的 `'use client'`
- 資料抓取在 Server Component 直接 async/await
- Client 互動元件明確標示 `'use client'`

```typescript
// app/users/page.tsx (Server Component)
export default async function UsersPage() {
  const users = await fetchUsers()
  return <UserList users={users} />
}
```

## State 管理

優先 `useState` + props drilling，複雜狀態才引入 Zustand 或 Jotai。
