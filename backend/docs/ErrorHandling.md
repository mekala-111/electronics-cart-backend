# Error Handling

| Filter | Role |
|--------|------|
| `ValidationExceptionFilter` | DTO / ValidationPipe failures → `errors[]` |
| `HttpExceptionFilter` | Nest `HttpException` / `AppException` |
| `PrismaExceptionFilter` | Prisma codes (P2002 unique, P2025 not found, …) |
| `AllExceptionsFilter` | Unknown → `INTERNAL_ERROR` |

Use `AppException` for domain errors:

```ts
throw new AppException(ErrorCodes.NOT_FOUND, 'Order not found', 404);
```

Never leak stack traces in production responses.
