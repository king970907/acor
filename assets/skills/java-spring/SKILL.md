---
id: java-spring
name: Java / Spring Boot Patterns
description: Spring Boot 分層架構、JPA 實體設計、REST controller 最佳實踐
version: 1.0.0
tags: [java, spring, backend, api]
triggers:
  - type: language
    value: java
  - type: file
    value: pom.xml
  - type: file
    value: build.gradle
  - type: framework
    value: spring
---

# Java / Spring Boot 開發規範

## 分層架構

嚴格分層，依賴方向只能向下：

```
Controller → Service → Repository → Entity
```

每層只依賴下一層的介面，不跨層呼叫：

```java
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {
    private final UserService userService;  // 只注入 Service

    @GetMapping("/{id}")
    public ResponseEntity<UserResponse> getUser(@PathVariable Long id) {
        return ResponseEntity.ok(userService.findById(id));
    }
}
```

## DTO 分離

Entity 不直接回傳給前端，使用 record 定義 DTO：

```java
// Request DTO
public record CreateUserRequest(
    @NotBlank String name,
    @Email String email
) {}

// Response DTO
public record UserResponse(Long id, String name, String email) {
    public static UserResponse from(User user) {
        return new UserResponse(user.getId(), user.getName(), user.getEmail());
    }
}
```

## JPA Entity

```java
@Entity
@Table(name = "users")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String email;

    public static User create(String name, String email) {
        User user = new User();
        user.name = name;
        user.email = email;
        return user;
    }
}
```

## Service 層

業務邏輯集中在 Service，不在 Controller：

```java
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class UserService {
    private final UserRepository userRepository;

    public UserResponse findById(Long id) {
        return userRepository.findById(id)
            .map(UserResponse::from)
            .orElseThrow(() -> new EntityNotFoundException("User not found: " + id));
    }

    @Transactional
    public UserResponse create(CreateUserRequest req) {
        User user = User.create(req.name(), req.email());
        return UserResponse.from(userRepository.save(user));
    }
}
```

## 例外處理

統一使用 `@RestControllerAdvice`：

```java
@RestControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(EntityNotFoundException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(new ErrorResponse(e.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException e) {
        String msg = e.getBindingResult().getFieldErrors().stream()
            .map(fe -> fe.getField() + ": " + fe.getDefaultMessage())
            .collect(Collectors.joining(", "));
        return ResponseEntity.badRequest().body(new ErrorResponse(msg));
    }
}
```
