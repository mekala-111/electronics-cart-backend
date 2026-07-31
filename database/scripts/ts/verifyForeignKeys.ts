import { endPool, exitWithStatus, passFail, query, writeReport } from './lib.js';

const FK_INVENTORY_SQL = `
SELECT
  con.conname AS constraint_name,
  rel.relname AS table_name,
  af.attname AS column_name,
  frel.relname AS foreign_table,
  afk.attname AS foreign_column,
  CASE con.confdeltype
    WHEN 'a' THEN 'NO ACTION'
    WHEN 'r' THEN 'RESTRICT'
    WHEN 'c' THEN 'CASCADE'
    WHEN 'n' THEN 'SET NULL'
    WHEN 'd' THEN 'SET DEFAULT'
  END AS on_delete
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace n ON n.oid = rel.relnamespace
JOIN pg_class frel ON frel.oid = con.confrelid
JOIN LATERAL unnest(con.conkey) WITH ORDINALITY AS cols(attnum, ord) ON true
JOIN LATERAL unnest(con.confkey) WITH ORDINALITY AS fcols(attnum, ord) ON cols.ord = fcols.ord
JOIN pg_attribute af ON af.attrelid = con.conrelid AND af.attnum = cols.attnum
JOIN pg_attribute afk ON afk.attrelid = con.confrelid AND afk.attnum = fcols.attnum
WHERE con.contype = 'f'
  AND n.nspname = 'public'
ORDER BY rel.relname, con.conname, cols.ord;
`;

const TABLE_COUNT_SQL = `
SELECT COUNT(*)::int AS table_count
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
  AND table_name NOT LIKE '\\_prisma%' ESCAPE '\\';
`;

type FkRow = {
  constraint_name: string;
  table_name: string;
  column_name: string;
  foreign_table: string;
  foreign_column: string;
  on_delete: string;
};

async function countOrphans(fk: FkRow): Promise<number> {
  const sql = `
    SELECT COUNT(*)::int AS orphan_count
    FROM "${fk.table_name.replace(/"/g, '""')}" c
    LEFT JOIN "${fk.foreign_table.replace(/"/g, '""')}" p
      ON c."${fk.column_name.replace(/"/g, '""')}" = p."${fk.foreign_column.replace(/"/g, '""')}"
    WHERE c."${fk.column_name.replace(/"/g, '""')}" IS NOT NULL
      AND p."${fk.foreign_column.replace(/"/g, '""')}" IS NULL
  `;
  const { rows } = await query<{ orphan_count: number }>(sql);
  return rows[0]?.orphan_count ?? 0;
}

async function main(): Promise<void> {
  let failures = 0;
  const [{ rows: fks }, { rows: tableRows }] = await Promise.all([
    query<FkRow>(FK_INVENTORY_SQL),
    query<{ table_count: number }>(TABLE_COUNT_SQL),
  ]);

  const tableCount = tableRows[0]?.table_count ?? 0;
  const lines: string[] = [
    '# Foreign Key Report',
    '',
    `Public tables: **${tableCount}**`,
    `Foreign keys: **${fks.length}**`,
    '',
  ];

  if (tableCount > 0 && fks.length === 0) {
    failures += 1;
    lines.push(passFail(false, 'Zero foreign keys while tables exist'));
  } else {
    lines.push(passFail(true, `Found ${fks.length} foreign keys`));
  }
  lines.push('');

  const orphanFindings: Array<{ fk: FkRow; orphans: number }> = [];
  for (const fk of fks) {
    const orphans = await countOrphans(fk);
    if (orphans > 0) {
      orphanFindings.push({ fk, orphans });
    }
  }

  if (orphanFindings.length === 0) {
    lines.push(passFail(true, 'No orphan FK references detected'));
  } else {
    failures += orphanFindings.length;
    lines.push('## Invalid FK references', '');
    lines.push('| Table | Column | References | Orphans |', '| --- | --- | --- | ---: |');
    for (const { fk, orphans } of orphanFindings) {
      lines.push(
        `| ${fk.table_name} | ${fk.column_name} | ${fk.foreign_table}.${fk.foreign_column} | ${orphans} |`,
      );
      passFail(
        false,
        `Orphan FK rows: ${fk.table_name}.${fk.column_name} → ${fk.foreign_table} (${orphans})`,
      );
    }
    lines.push('');
  }

  lines.push('## FK inventory (sample)', '', '| Table | Column | → | On delete |', '| --- | --- | --- | --- |');
  for (const fk of fks.slice(0, 50)) {
    lines.push(
      `| ${fk.table_name} | ${fk.column_name} | ${fk.foreign_table}.${fk.foreign_column} | ${fk.on_delete} |`,
    );
  }
  if (fks.length > 50) {
    lines.push('', `_…and ${fks.length - 50} more foreign keys._`);
  }

  writeReport('ForeignKeyReport.md', lines.join('\n'));
  await endPool();
  exitWithStatus(failures);
}

main().catch(async (err) => {
  console.error('[verify:FAIL]', err);
  await endPool();
  process.exit(1);
});
