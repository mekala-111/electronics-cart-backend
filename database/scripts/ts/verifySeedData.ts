import { endPool, exitWithStatus, passFail, query, writeReport } from './lib.js';

const REQUIRED_SEED_TABLES = [
  'roles',
  'permissions',
  'shipping_partners',
  'warranty_providers',
  'delivery_failure_reasons',
  'feature_flags',
  'dashboard_widgets',
  'cancellation_reasons',
  'payment_gateways',
  'payment_methods',
] as const;

async function countTable(table: string): Promise<{ ok: boolean; count: number; error?: string }> {
  try {
    const { rows } = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM "${table.replace(/"/g, '""')}"`,
    );
    return { ok: true, count: Number(rows[0]?.count ?? 0) };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, count: 0, error: message };
  }
}

async function main(): Promise<void> {
  let failures = 0;
  const lines: string[] = ['# Seed Data Report', '', '| Table | Rows | Status |', '| --- | ---: | --- |'];

  for (const table of REQUIRED_SEED_TABLES) {
    const result = await countTable(table);
    if (!result.ok) {
      failures += 1;
      lines.push(`| ${table} | — | missing / error |`);
      passFail(false, `Seed table unavailable: ${table} (${result.error})`);
      continue;
    }
    if (result.count === 0) {
      failures += 1;
      lines.push(`| ${table} | 0 | **FAIL** — empty |`);
      passFail(false, `Seed table empty: ${table}`);
    } else {
      lines.push(`| ${table} | ${result.count} | OK |`);
      passFail(true, `${table}: ${result.count} row(s)`);
    }
  }

  lines.push('');
  writeReport('SeedReport.md', lines.join('\n'));
  await endPool();
  exitWithStatus(failures);
}

main().catch(async (err) => {
  console.error('[verify:FAIL]', err);
  await endPool();
  process.exit(1);
});
