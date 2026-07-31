import { endPool, exitWithStatus, parseCliFlag, passFail, query, writeReport } from './lib.js';

const TABLE_COUNT_SQL = `
-- Exclude Prisma ledger from rollback table ceiling
SELECT COUNT(*)::int AS table_count
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
  AND table_name <> '_prisma_migrations';
`;

const ORPHAN_TYPES_SQL = `
SELECT t.typname
FROM pg_type t
JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public'
  AND t.typtype = 'e'
  AND NOT EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace ns ON ns.oid = c.relnamespace
    WHERE a.atttypid = t.oid
      AND ns.nspname = 'public'
      AND c.relkind IN ('r', 'v', 'm')
  )
ORDER BY 1;
`;

async function main(): Promise<void> {
  let failures = 0;
  const expectMaxRaw = parseCliFlag('expect-max-tables');
  const expectMax = expectMaxRaw ? Number(expectMaxRaw) : undefined;

  const [{ rows: tableRows }, { rows: orphanTypes }] = await Promise.all([
    query<{ table_count: number }>(TABLE_COUNT_SQL),
    query<{ typname: string }>(ORPHAN_TYPES_SQL),
  ]);

  const tableCount = tableRows[0]?.table_count ?? 0;
  const lines: string[] = [
    '# Rollback Report',
    '',
    `Public base tables: **${tableCount}**`,
    expectMax !== undefined ? `Expected max tables: **${expectMax}**` : '_No `--expect-max-tables` limit set._',
    '',
  ];

  if (expectMax !== undefined && tableCount > expectMax) {
    failures += 1;
    lines.push(passFail(false, `Table count ${tableCount} exceeds expected max ${expectMax}`));
  } else if (expectMax !== undefined) {
    lines.push(passFail(true, `Table count ${tableCount} within expected max ${expectMax}`));
  } else {
    lines.push(passFail(true, `Observed ${tableCount} public tables after rollback check`));
  }

  lines.push('');
  if (orphanTypes.length > 0) {
    failures += 1;
    lines.push('## Orphan enum types', '');
    for (const row of orphanTypes) {
      lines.push(`- ${row.typname}`);
      passFail(false, `Orphan enum type: ${row.typname}`);
    }
  } else {
    lines.push(passFail(true, 'No orphan enum types in public schema'));
  }

  writeReport('RollbackReport.md', lines.join('\n'));
  await endPool();
  exitWithStatus(failures);
}

main().catch(async (err) => {
  console.error('[verify:FAIL]', err);
  await endPool();
  process.exit(1);
});
