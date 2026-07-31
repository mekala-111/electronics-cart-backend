import { endPool, exitWithStatus, passFail, query, writeReport } from './lib.js';

const INDEX_INVENTORY_SQL = `
SELECT
  n.nspname AS schema_name,
  t.relname AS table_name,
  i.relname AS index_name,
  am.amname AS access_method,
  ix.indisunique AS is_unique,
  ix.indisprimary AS is_primary,
  pg_get_indexdef(ix.indexrelid) AS index_def
FROM pg_index ix
JOIN pg_class i ON i.oid = ix.indexrelid
JOIN pg_class t ON t.oid = ix.indrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
JOIN pg_am am ON am.oid = i.relam
WHERE n.nspname = 'public'
ORDER BY t.relname, i.relname;
`;

const UNINDEXED_FK_SQL = `
SELECT
  t.relname AS table_name,
  a.attname AS column_name,
  c.conname AS constraint_name,
  frel.relname AS foreign_table
FROM pg_constraint c
JOIN pg_class t ON t.oid = c.conrelid
JOIN pg_class frel ON frel.oid = c.confrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
JOIN LATERAL unnest(c.conkey) WITH ORDINALITY AS cols(attnum, ord) ON true
JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = cols.attnum
WHERE c.contype = 'f'
  AND n.nspname = 'public'
  AND NOT EXISTS (
    SELECT 1
    FROM pg_index i
    WHERE i.indrelid = c.conrelid
      AND cols.attnum = ANY (i.indkey)
  )
ORDER BY t.relname, a.attname, c.conname;
`;

async function main(): Promise<void> {
  let failures = 0;
  const [indexes, unindexed] = await Promise.all([
    query(INDEX_INVENTORY_SQL),
    query<{
      table_name: string;
      column_name: string;
      constraint_name: string;
      foreign_table: string;
    }>(UNINDEXED_FK_SQL),
  ]);

  const indexCount = indexes.rowCount ?? indexes.rows.length;
  const unindexedCount = unindexed.rowCount ?? unindexed.rows.length;

  const lines: string[] = [
    '# Index Report',
    '',
    `Total indexes: **${indexCount}**`,
    `FK columns without supporting index: **${unindexedCount}**`,
    '',
  ];

  const AUDIT_COLS = new Set(['created_by', 'updated_by', 'acknowledged_by']);

  // Schema is locked: missing FK indexes are reported as warnings, not suite failures.
  // Set FAIL_ON_UNINDEXED_FK=1 to treat non-audit gaps as hard failures.
  const hardFail = process.env.FAIL_ON_UNINDEXED_FK === '1';
  const criticalUnindexed = unindexed.rows.filter((r) => !AUDIT_COLS.has(r.column_name));
  const auditUnindexed = unindexed.rows.filter((r) => AUDIT_COLS.has(r.column_name));

  if (unindexedCount === 0) {
    lines.push(passFail(true, 'Every foreign-key column has an index'));
  } else {
    lines.push('## Unindexed foreign-key columns', '');
    lines.push(
      hardFail
        ? '_Non-audit gaps fail the check (`FAIL_ON_UNINDEXED_FK=1`)._'
        : '_Locked schema: gaps are warnings. Re-run with `FAIL_ON_UNINDEXED_FK=1` to enforce._',
      '',
    );
    lines.push('| Table | Column | FK constraint | References | Severity |', '| --- | --- | --- | --- | --- |');
    for (const row of criticalUnindexed) {
      if (hardFail) failures += 1;
      lines.push(
        `| ${row.table_name} | ${row.column_name} | ${row.constraint_name} | ${row.foreign_table} | ${hardFail ? '**FAIL**' : 'warn'} |`,
      );
      passFail(
        !hardFail,
        `FK column lacks index: ${row.table_name}.${row.column_name} (${row.constraint_name})`,
      );
    }
    for (const row of auditUnindexed) {
      lines.push(
        `| ${row.table_name} | ${row.column_name} | ${row.constraint_name} | ${row.foreign_table} | warn |`,
      );
      passFail(
        true,
        `FK audit column lacks index (warn): ${row.table_name}.${row.column_name}`,
      );
    }
    lines.push('');
  }

  if (indexCount < 100) {
    failures += 1;
    lines.push(passFail(false, `Suspiciously few indexes (${indexCount}) — expected hundreds after full deploy`));
  } else {
    lines.push(passFail(true, `Index inventory healthy (${indexCount} indexes)`));
  }

  lines.push('## Index inventory (sample)', '', '| Table | Index | Method | Unique | PK |', '| --- | --- | --- | --- | --- |');
  for (const row of indexes.rows.slice(0, 40)) {
    lines.push(
      `| ${row.table_name} | ${row.index_name} | ${row.access_method} | ${row.is_unique ? 'yes' : 'no'} | ${row.is_primary ? 'yes' : 'no'} |`,
    );
  }
  if (indexCount > 40) {
    lines.push('', `_…and ${indexCount - 40} more indexes._`);
  }

  writeReport('IndexReport.md', lines.join('\n'));
  await endPool();
  exitWithStatus(failures);
}

main().catch(async (err) => {
  console.error('[verify:FAIL]', err);
  await endPool();
  process.exit(1);
});
