import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { SQL_DIR, endPool, query } from '../scripts/ts/lib.js';

const DEMO_USER_ID = '50000000-0000-0000-0000-000000000001';
const SEED_ORDER_ID = '54000000-0000-0000-0000-000000000001';

const SEED_SQL_FILES = [
  '003_seed.sql',
  '006_catalog_seed.sql',
  '009_inventory_seed.sql',
  '012_order_seed.sql',
  '015_order_extension_seed.sql',
  '018_payment_seed.sql',
  '021_payment_extension_seed.sql',
  '024_shipping_seed.sql',
  '027_shipping_extension_seed.sql',
  '030_warranty_seed.sql',
  '033_warranty_extension_seed.sql',
  '036_marketing_seed.sql',
  '039_marketing_extension_seed.sql',
  '042_analytics_seed.sql',
  '045_analytics_extension_seed.sql',
];

async function countOrExists(sql: string, params: unknown[] = []): Promise<number> {
  const { rows } = await query<{ n: string }>(sql, params);
  return Number(rows[0]?.n ?? 0);
}

function reapplySeedFiles(): void {
  const databaseUrl = process.env.DATABASE_URL ??
    'postgresql://electronics:electronics@127.0.0.1:5433/electronics_cart';
  for (const file of SEED_SQL_FILES) {
    const fullPath = path.join(SQL_DIR, file);
    if (!fs.existsSync(fullPath)) {
      console.warn(`[seed] Missing seed file: ${file}`);
      continue;
    }
    console.log(`[seed] Re-applying ${file}`);
    execFileSync('psql', [databaseUrl, '-v', 'ON_ERROR_STOP=1', '-f', fullPath], {
      stdio: 'inherit',
      env: process.env,
    });
  }
}

async function main(): Promise<void> {
  let failures = 0;

  const checks: Array<{ label: string; sql: string; params?: unknown[]; min?: number }> = [
    {
      label: 'roles seeded',
      sql: `SELECT COUNT(*)::text AS n FROM roles WHERE deleted_at IS NULL`,
      min: 1,
    },
    {
      label: 'permissions seeded',
      sql: `SELECT COUNT(*)::text AS n FROM permissions WHERE deleted_at IS NULL`,
      min: 1,
    },
    {
      label: 'demo customer present',
      sql: `SELECT COUNT(*)::text AS n FROM users WHERE id = $1 AND deleted_at IS NULL`,
      params: [DEMO_USER_ID],
      min: 1,
    },
    {
      label: 'sample order EC-2026-000001',
      sql: `SELECT COUNT(*)::text AS n FROM orders WHERE id = $1 AND deleted_at IS NULL`,
      params: [SEED_ORDER_ID],
      min: 1,
    },
    {
      label: 'payment gateways seeded',
      sql: `SELECT COUNT(*)::text AS n FROM payment_gateways WHERE deleted_at IS NULL`,
      min: 1,
    },
    {
      label: 'shipping partners seeded',
      sql: `SELECT COUNT(*)::text AS n FROM shipping_partners WHERE deleted_at IS NULL`,
      min: 1,
    },
  ];

  for (const check of checks) {
    try {
      const count = await countOrExists(check.sql, check.params);
      const min = check.min ?? 1;
      if (count < min) {
        failures += 1;
        console.error(`[seed:FAIL] ${check.label}: ${count} (need >= ${min})`);
      } else {
        console.log(`[seed:OK] ${check.label}: ${count}`);
      }
    } catch (err) {
      failures += 1;
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[seed:FAIL] ${check.label}: ${message}`);
    }
  }

  if (failures > 0 && process.env.SEED_REAPPLY === '1') {
    console.log('[seed] SEED_REAPPLY=1 — re-applying seed SQL files');
    try {
      reapplySeedFiles();
      failures = 0;
      for (const check of checks) {
        const count = await countOrExists(check.sql, check.params);
        const min = check.min ?? 1;
        if (count < min) {
          failures += 1;
          console.error(`[seed:FAIL] after reapply ${check.label}: ${count}`);
        }
      }
    } catch (err) {
      failures += 1;
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[seed:FAIL] reapply error: ${message}`);
    }
  }

  await endPool();
  if (failures > 0) {
    console.error(`[seed] ${failures} anchor check(s) failed`);
    process.exit(1);
  }
  console.log('[seed] All seed anchors verified');
  process.exit(0);
}

main().catch(async (err) => {
  console.error('[seed:FAIL]', err);
  await endPool();
  process.exit(1);
});
