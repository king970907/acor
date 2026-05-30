---
id: python-patterns
name: Python Patterns
description: Python 3.10+ 現代寫法：型別標注、pathlib、dataclasses、async/await
version: 1.0.0
tags: [python, backend, async]
triggers:
  - type: language
    value: python
  - type: file
    value: pyproject.toml
  - type: file
    value: requirements.txt
---

# Python 開發規範

## 型別標注

Python 3.10+ 所有 public function 必須標注型別，使用 `|` 代替 `Optional`：

```python
def find_user(user_id: int) -> User | None:
    ...

def process(items: list[str], limit: int = 10) -> list[str]:
    ...
```

使用 `from __future__ import annotations` 延遲求值（避免循環 import）：

```python
from __future__ import annotations
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .models import User
```

## Dataclasses

偏好 `@dataclass` 或 Pydantic `BaseModel` 定義資料結構，避免裸 dict：

```python
from dataclasses import dataclass, field

@dataclass
class Config:
    host: str
    port: int = 8000
    tags: list[str] = field(default_factory=list)
```

## 路徑操作

使用 `pathlib.Path`，禁止 `os.path`：

```python
from pathlib import Path

config_file = Path(__file__).parent / "config.json"
data = config_file.read_text(encoding="utf-8")
```

## 錯誤處理

捕捉具體例外，不用裸 `except Exception`：

```python
try:
    result = process(data)
except ValueError as e:
    logger.warning("資料格式錯誤: %s", e)
    raise
except OSError as e:
    logger.error("IO 失敗: %s", e)
    raise RuntimeError("無法讀取設定") from e
```

## Async

I/O bound 操作使用 `async/await`，CPU bound 不要放進 event loop：

```python
import asyncio
import httpx

async def fetch_all(urls: list[str]) -> list[bytes]:
    async with httpx.AsyncClient() as client:
        tasks = [client.get(url) for url in urls]
        responses = await asyncio.gather(*tasks)
    return [r.content for r in responses]
```

## Context Manager

資源管理使用 `with` 或 `async with`，不要手動 close：

```python
async def read_config(path: Path) -> dict:
    async with aiofiles.open(path) as f:
        return json.loads(await f.read())
```
