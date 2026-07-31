import { endPool, getPool, exitWithStatus, passFail, query, writeReport } from './lib.js';

const DEMO_USER_ID = '50000000-0000-0000-0000-000000000001';
const SEED_ORDER_ID = '54000000-0000-0000-0000-000000000001';
const DISPOSABLE_PREFIX = 'a1000000-0000-4000-8000-';

type JoinCheck = {
  name: string;
  sql: string;
  requiredWhenSeedPresent: boolean;
};

const JOIN_CHECKS: JoinCheck[] = [
  {
    name: 'demo user exists',
    requiredWhenSeedPresent: false,
    sql: `SELECT id, email FROM users WHERE id = $1 AND deleted_at IS NULL`,
  },
  {
    name: 'seed order EC-2026-000001',
    requiredWhenSeedPresent: false,
    sql: `SELECT id, order_number, customer_id FROM orders WHERE id = $1 AND deleted_at IS NULL`,
  },
  {
    name: 'order → payments',
    requiredWhenSeedPresent: true,
    sql: `
      SELECT o.order_number, p.id AS payment_id, p.status
      FROM orders o
      JOIN payments p ON p.order_id = o.id AND p.deleted_at IS NULL
      WHERE o.id = $1 AND o.deleted_at IS NULL
    `,
  },
  {
    name: 'order → shipments',
    requiredWhenSeedPresent: true,
    sql: `
      SELECT o.order_number, s.id AS shipment_id, s.tracking_number, s.status
      FROM orders o
      JOIN shipments s ON s.order_id = o.id AND s.deleted_at IS NULL
      WHERE o.id = $1 AND o.deleted_at IS NULL
    `,
  },
  {
    name: 'order → warranty_registrations',
    requiredWhenSeedPresent: true,
    sql: `
      SELECT o.order_number, wr.id AS registration_id, wr.registration_number
      FROM orders o
      JOIN warranty_registrations wr ON wr.order_id = o.id AND wr.deleted_at IS NULL
      WHERE o.id = $1 AND o.deleted_at IS NULL
    `,
  },
  {
    name: 'warranty_registrations → service_tickets',
    requiredWhenSeedPresent: true,
    sql: `
      SELECT wr.registration_number, st.ticket_number, st.status
      FROM warranty_registrations wr
      JOIN service_tickets st ON st.registration_id = wr.id AND st.deleted_at IS NULL
      WHERE wr.order_id = $1 AND wr.deleted_at IS NULL
    `,
  },
  {
    name: 'order → campaign_attribution',
    requiredWhenSeedPresent: true,
    sql: `
      SELECT o.order_number, ca.id AS attribution_id, ca.revenue_amount
      FROM orders o
      JOIN campaign_attribution ca ON ca.order_id = o.id AND ca.deleted_at IS NULL
      WHERE o.id = $1 AND o.deleted_at IS NULL
    `,
  },
  {
    name: 'order → audit_logs (entity)',
    requiredWhenSeedPresent: true,
    sql: `
      SELECT o.order_number, al.id AS audit_id, al.action
      FROM orders o
      JOIN audit_logs al ON al.entity_type = 'orders' AND al.entity_id = o.id
      WHERE o.id = $1 AND o.deleted_at IS NULL
    `,
  },
  {
    name: 'full chain order→payment→shipment',
    requiredWhenSeedPresent: true,
    sql: `
      SELECT o.order_number, p.id AS payment_id, s.tracking_number
      FROM orders o
      JOIN payments p ON p.order_id = o.id AND p.deleted_at IS NULL
      JOIN shipments s ON s.order_id = o.id AND s.deleted_at IS NULL
      WHERE o.id = $1 AND o.deleted_at IS NULL
    `,
  },
];

async function tableExists(table: string): Promise<boolean> {
  const { rows } = await query<{ exists: boolean }>(
    `SELECT to_regclass($1) IS NOT NULL AS exists`,
    [`public.${table}`],
  );
  return rows[0]?.exists ?? false;
}

async function runDisposableInsertRollback(): Promise<string> {
  const client = await getPool().connect();
  const noteId = `${DISPOSABLE_PREFIX}000000000001`;
  try {
    await client.query('BEGIN');
    const user = await client.query(`SELECT id FROM users WHERE id = $1`, [DEMO_USER_ID]);
    if (user.rowCount === 0) {
      await client.query('ROLLBACK');
      return 'Skipped disposable chain — demo user not present';
    }
    await client.query(
      `INSERT INTO order_notes (id, order_id, author_id, body, visibility, created_by, updated_by)
       SELECT $1, $2, $3, 'verifyRelations disposable note', 'internal', $3, $3
       WHERE EXISTS (SELECT 1 FROM orders WHERE id = $2)
       ON CONFLICT (id) DO NOTHING`,
      [noteId, SEED_ORDER_ID, DEMO_USER_ID],
    );
    const verify = await client.query(`SELECT id FROM order_notes WHERE id = $1`, [noteId]);
    await client.query('ROLLBACK');
    return verify.rowCount && verify.rowCount > 0
      ? 'Disposable insert verified inside transaction (rolled back)'
      : 'Disposable insert skipped — seed order not present';
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function main(): Promise<void> {
  let failures = 0;
  const lines: string[] = ['# Relations Report', ''];

  const seedOrder = await query(`SELECT id FROM orders WHERE id = $1`, [SEED_ORDER_ID]);
  const seedPresent = (seedOrder.rowCount ?? 0) > 0;
  lines.push(`Seed order \`${SEED_ORDER_ID}\` present: **${seedPresent ? 'yes' : 'no'}**`, '');

  const requiredTables = [
    'orders',
    'payments',
    'shipments',
    'warranty_registrations',
    'service_tickets',
    'campaign_attribution',
    'audit_logs',
  ];
  lines.push('## Table presence', '');
  for (const table of requiredTables) {
    const exists = await tableExists(table);
    lines.push(`- ${table}: ${exists ? 'present' : '**missing**'}`);
    if (!exists) {
      failures += 1;
      passFail(false, `Required table missing: ${table}`);
    }
  }
  lines.push('');

  lines.push('## Join verification', '', '| Check | Rows | Status |', '| --- | ---: | --- |');
  for (const check of JOIN_CHECKS) {
    try {
      const params =
        check.sql.includes('$1') && check.name !== 'demo user exists'
          ? [SEED_ORDER_ID]
          : check.name === 'demo user exists'
            ? [DEMO_USER_ID]
            : check.name === 'seed order EC-2026-000001'
              ? [SEED_ORDER_ID]
              : [];
      const { rowCount } = await query(check.sql, params);
      const rows = rowCount ?? 0;
      const ok = rows > 0 || (!check.requiredWhenSeedPresent && !seedPresent);
      const requiredFail = check.requiredWhenSeedPresent && seedPresent && rows === 0;
      if (requiredFail) {
        failures += 1;
      }
      lines.push(`| ${check.name} | ${rows} | ${requiredFail ? '**FAIL**' : 'OK'} |`);
      passFail(!requiredFail, `${check.name}: ${rows} row(s)`);
    } catch (err) {
      failures += 1;
      const message = err instanceof Error ? err.message : String(err);
      lines.push(`| ${check.name} | — | **ERROR** |`);
      passFail(false, `${check.name}: ${message}`);
    }
  }

  lines.push('');
  try {
    const rollbackNote = await runDisposableInsertRollback();
    lines.push('## Transaction probe', '', rollbackNote);
    passFail(true, rollbackNote);
  } catch (err) {
    failures += 1;
    const message = err instanceof Error ? err.message : String(err);
    lines.push('## Transaction probe', '', `**FAIL:** ${message}`);
    passFail(false, `Disposable transaction probe failed: ${message}`);
  }

  writeReport('RelationsReport.md', lines.join('\n'));
  await endPool();
  exitWithStatus(failures);
}

main().catch(async (err) => {
  console.error('[verify:FAIL]', err);
  await endPool();
  process.exit(1);
});
