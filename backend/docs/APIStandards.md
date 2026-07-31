# API Standards

## Envelope

Success:

```json
{ "success": true, "data": {}, "meta": {} }
```

Error:

```json
{ "success": false, "code": "ORDER_NOT_FOUND", "message": "...", "errors": [] }
```

## Versioning

Global prefix: `/api`. Future breaking changes use `/api/v2` via Nest versioning when needed.

## Auth

Bearer JWT (`Authorization: Bearer <token>`). Endpoints marked `@Public()` skip JWT.

## Pagination

Offset: `?page=1&limit=20` → meta via `buildPaginationMeta`.
Cursor helpers live in `cursor-pagination.util.ts`.

## Docs

Swagger UI at `/docs` (dev/staging). JWT security scheme name: `JWT`.
