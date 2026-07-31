import {
  EXPECTED_MIGRATIONS,
  endPool,
  exitWithStatus,
  passFail,
  query,
  readLines,
  writeReport,
} from './lib.js';

async function main(): Promise<void> {
  let failures = 0;
  const expected = readLines(EXPECTED_MIGRATIONS).map((line) => line.replace(/\.sql$/i, ''));

  const { rows } = await query<{
    migration_name: string;
    checksum: string;
    finished_at: Date | null;
    rolled_back_at: Date | null;
  }>(`
    SELECT migration_name, checksum, finished_at, rolled_back_at
    FROM "_prisma_migrations"
    ORDER BY migration_name
  `);

  const active = rows.filter((r) => r.finished_at && !r.rolled_back_at);
  const names = active.map((r) => r.migration_name).sort();
  const expectedSorted = [...expected].sort();

  const lines: string[] = [
    '# Migration Verification Report',
    '',
    `Expected finished migrations: **${expected.length}**`,
    `Active rows in _prisma_migrations: **${active.length}**`,
    '',
  ];

  if (active.length !== expected.length) {
    failures += 1;
    lines.push(passFail(false, `Expected ${expected.length} active migrations, found ${active.length}`));
  } else {
    lines.push(passFail(true, `Active migration count matches expected (${expected.length})`));
  }

  const missing = expectedSorted.filter((name) => !names.includes(name));
  const extra = names.filter((name) => !expectedSorted.includes(name));
  if (missing.length > 0) {
    failures += missing.length;
    lines.push('', '## Missing migrations', '');
    for (const name of missing) {
      lines.push(`- ${name}`);
      passFail(false, `Missing migration: ${name}`);
    }
  }
  if (extra.length > 0) {
    failures += extra.length;
    lines.push('', '## Unexpected migrations', '');
    for (const name of extra) {
      lines.push(`- ${name}`);
      passFail(false, `Unexpected migration: ${name}`);
    }
  }

  const badChecksum = active.filter((r) => r.checksum.length !== 64);
  if (badChecksum.length > 0) {
    failures += badChecksum.length;
    lines.push('', '## Invalid checksum length', '');
    for (const row of badChecksum) {
      lines.push(`- ${row.migration_name}: length ${row.checksum.length}`);
      passFail(false, `Bad checksum length for ${row.migration_name}`);
    }
  } else {
    lines.push(passFail(true, 'All active migration checksums are 64 chars'));
  }

  const unfinished = rows.filter((r) => !r.finished_at || r.rolled_back_at);
  if (unfinished.length > 0) {
    failures += unfinished.length;
    lines.push('', '## Unfinished or rolled-back rows', '');
    for (const row of unfinished) {
      lines.push(`- ${row.migration_name}`);
      passFail(false, `Migration not active: ${row.migration_name}`);
    }
  }

  lines.push('', '## Expected migration names', '', expectedSorted.map((n) => `- ${n}`).join('\n'));
  writeReport('MigrationVerificationReport.md', lines.join('\n'));
  await endPool();
  exitWithStatus(failures);
}

main().catch(async (err) => {
  console.error('[verify:FAIL]', err);
  await endPool();
  process.exit(1);
});
