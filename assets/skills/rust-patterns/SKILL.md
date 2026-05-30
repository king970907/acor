---
id: rust-patterns
name: Rust Patterns
description: Rust 慣用寫法：Result/Option 鏈式操作、所有權、trait 設計、錯誤類型
version: 1.0.0
tags: [rust, systems, backend]
triggers:
  - type: language
    value: rust
  - type: file
    value: Cargo.toml
---

# Rust 開發規範

## 錯誤類型

使用 `thiserror` 定義具名錯誤，不回傳 `Box<dyn Error>`：

```rust
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("設定檔讀取失敗: {0}")]
    Config(#[from] std::io::Error),

    #[error("JSON 解析失敗: {0}")]
    Parse(#[from] serde_json::Error),

    #[error("找不到使用者 {id}")]
    UserNotFound { id: u64 },
}

pub type Result<T> = std::result::Result<T, AppError>;
```

## Result / Option 鏈式操作

使用 `?` 提早返回，搭配 `.map`、`.and_then`、`.ok_or`：

```rust
fn load_user(path: &Path) -> Result<User> {
    let content = fs::read_to_string(path)?;
    let user: User = serde_json::from_str(&content)?;
    Ok(user)
}

fn find_email(users: &[User], id: u64) -> Option<&str> {
    users.iter()
        .find(|u| u.id == id)
        .map(|u| u.email.as_str())
}
```

## 所有權與借用

優先傳遞引用，只在需要所有權時 move：

```rust
// 唯讀 → &T
fn print_name(user: &User) { println!("{}", user.name); }

// 修改 → &mut T
fn update_email(user: &mut User, email: String) { user.email = email; }

// 需要所有權（spawn、async move） → T
fn spawn_task(user: User) {
    tokio::spawn(async move { process(user).await });
}
```

## Trait 設計

Trait 表達能力，不是繼承。實作常用標準 trait：

```rust
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct UserId(u64);

impl fmt::Display for UserId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "user:{}", self.0)
    }
}
```

## Async

使用 `tokio`，I/O 操作標記 `async`，避免在 async 裡做阻塞操作：

```rust
#[tokio::main]
async fn main() -> Result<()> {
    let config = load_config(Path::new("config.json")).await?;
    run(config).await
}

async fn load_config(path: &Path) -> Result<Config> {
    let content = tokio::fs::read_to_string(path).await?;
    Ok(serde_json::from_str(&content)?)
}
```

## Clippy

程式碼需通過 `cargo clippy -- -D warnings`，常見修正：

```rust
// clippy::needless_pass_by_value → 改用 &str
fn greet(name: &str) { println!("Hello, {name}"); }

// clippy::map_unwrap_or → 改用 unwrap_or_else
let val = opt.unwrap_or_else(|| compute_default());
```
