# Logging

- Library: **Pino** via `nestjs-pino`.
- Development: pretty transport.
- Production: JSON logs.
- Request ID: middleware sets `x-request-id`; included in HTTP logs.
- Use Nest `Logger` / injected Pino logger — avoid `console.log` in services.
