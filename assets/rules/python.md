---
id: python
name: Python 慣例
description: Python 3.10+ 程式碼慣例：PEP 8、型別標注、命名規範
triggers:
  - type: language
    value: python
---

## 命名規範

- 變數、函數、模組：`snake_case`
- 類別：`PascalCase`
- 常數：`UPPER_SNAKE_CASE`
- 私有成員：單底線 `_name`（慣例），不用雙底線除非有特殊理由

## 型別標注

所有 public function 必須標注參數與回傳型別：

```python
def calculate_total(items: list[float], tax_rate: float = 0.05) -> float:
    return sum(items) * (1 + tax_rate)
```

使用 `|` 代替 `Optional[X]`（Python 3.10+）：

```python
def find(id: int) -> User | None: ...
```

## 格式

- 縮排：4 個空格
- 行長上限：88 字元（black 預設）
- 字串：優先使用雙引號
- import 順序：stdlib → third-party → local，各組空一行

## 禁止事項

- 不使用裸 `except:` 或 `except Exception:`，捕捉具體例外
- 不用 `os.path`，改用 `pathlib.Path`
- 不在函數預設參數用可變物件（`def f(items=[])` 是 bug）
- 不 print 替代 logging
