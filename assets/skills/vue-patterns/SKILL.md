---
id: vue-patterns
name: Vue / Nuxt Patterns
description: Vue 3 Composition API 與 Nuxt 4 開發最佳實踐
version: 1.0.0
tags: [vue, nuxt, frontend]
triggers:
  - type: framework
    value: vue
  - type: framework
    value: nuxt
  - type: dependency
    value: vue
---

# Vue / Nuxt 開發規範

## Composition API

優先使用 `<script setup>` 語法：

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'

const count = ref(0)
const doubled = computed(() => count.value * 2)
</script>
```

## Composables

可重用邏輯抽取為 composables（`use` 前綴命名）：

```typescript
// composables/useCounter.ts
export function useCounter(initial = 0) {
  const count = ref(initial)
  const increment = () => count.value++
  return { count, increment }
}
```

## Props 定義

```typescript
const props = defineProps<{
  title: string
  count?: number
}>()
```

## State Management

使用 Pinia stores：

```typescript
export const useUserStore = defineStore('user', () => {
  const user = ref<User | null>(null)
  const isLoggedIn = computed(() => user.value !== null)
  return { user, isLoggedIn }
})
```

## Nuxt 特定

- 使用 `useAsyncData` 或 `useFetch` 進行資料抓取
- Server routes 放在 `server/api/`
- 共用型別放在 `types/`
