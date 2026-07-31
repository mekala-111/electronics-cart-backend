# Category Tree

DB v1.0 has **no** `category_closure` table. Nesting uses adjacency list:

```
categories.parent_id → categories.id
```

`GET /api/catalog/categories/tree` loads active categories and builds an in-memory forest (`buildCategoryTree`).

Admin create/update accepts optional `parentId`. Soft-delete archives the row; children are not auto-moved (parent FK is `ON DELETE Restrict` at DB level — delete children first or reparent).
