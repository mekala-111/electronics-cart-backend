import {
  EXPECTED_ENUMS,
  appendSchemaValidationSection,
  endPool,
  exitWithStatus,
  passFail,
  query,
  readLines,
  writeReport,
} from './lib.js';

const ENUMS_SQL = `
SELECT t.typname AS enum_name,
       string_agg(e.enumlabel, ',' ORDER BY e.enumsortorder) AS labels
FROM pg_type t
JOIN pg_enum e ON e.enumtypid = t.oid
JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public'
GROUP BY t.typname
ORDER BY 1;
`;

/** Prisma Client names that must NEVER exist as PostgreSQL type names (use snake_case). */
const FORBIDDEN_PASCAL_ENUMS = [
  'RecordStatus',
  'UserType',
  'AuthProvider',
  'OrderStatus',
  'PaymentStatus',
  'ShipmentStatus',
];

const RECORD_STATUS_LABELS = [
  'active',
  'inactive',
  'suspended',
  'pending',
  'archived',
];

async function main(): Promise<void> {
  let failures = 0;
  const expected = readLines(EXPECTED_ENUMS);
  const { rows } = await query<{ enum_name: string; labels: string }>(ENUMS_SQL);
  const actual = new Map(rows.map((r) => [r.enum_name, r.labels]));
  const missing = expected.filter((name) => !actual.has(name));
  const extra = [...actual.keys()].filter((name) => !expected.includes(name)).sort();

  const lines: string[] = [
    '# Enum Validation',
    '',
    `Expected enums: **${expected.length}**`,
    `Actual enums: **${actual.size}**`,
    '',
  ];

  if (missing.length > 0) {
    failures += missing.length;
    lines.push('## Missing expected enums', '');
    for (const name of missing) {
      lines.push(`- ${name}`);
      passFail(false, `Missing enum: ${name}`);
    }
    lines.push('');
  } else {
    lines.push(passFail(true, 'All expected enums present'));
    lines.push('');
  }

  // record_status labels + no PascalCase RecordStatus duplicate
  const rs = actual.get('record_status');
  if (!rs) {
    failures += 1;
    lines.push(passFail(false, 'record_status enum missing'));
  } else {
    const labels = rs.split(',');
    const labelsOk =
      labels.length === RECORD_STATUS_LABELS.length &&
      RECORD_STATUS_LABELS.every((l, i) => labels[i] === l);
    if (!labelsOk) {
      failures += 1;
      lines.push(
        passFail(
          false,
          `record_status labels mismatch: got [${rs}] expected [${RECORD_STATUS_LABELS.join(',')}]`,
        ),
      );
    } else {
      lines.push(passFail(true, 'record_status labels match Prisma RecordStatus values'));
    }
  }

  const forbiddenHit = FORBIDDEN_PASCAL_ENUMS.filter((name) => actual.has(name));
  if (forbiddenHit.length > 0) {
    failures += forbiddenHit.length;
    lines.push('', '## Forbidden PascalCase PostgreSQL enums', '');
    for (const name of forbiddenHit) {
      lines.push(`- ${name}`);
      passFail(
        false,
        `Forbidden enum "${name}" — Prisma must @@map to snake_case; do not CREATE TYPE "${name}"`,
      );
    }
    lines.push('');
  } else {
    lines.push(
      passFail(
        true,
        'No forbidden PascalCase enums (RecordStatus, UserType, …)',
      ),
    );
    lines.push('');
  }

  if (extra.length > 0) {
    lines.push('## Extra enums (not in expected list)', '');
    for (const name of extra) {
      lines.push(`- ${name}`);
    }
    lines.push('');
  }

  lines.push('## Inventory', '', '| Enum | Label count |', '| --- | ---: |');
  for (const name of expected) {
    const labels = actual.get(name);
    if (labels) {
      lines.push(`| ${name} | ${labels.split(',').length} |`);
    }
  }

  const report = lines.join('\n');
  writeReport('EnumValidation.md', report);
  appendSchemaValidationSection(
    'Enums',
    missing.length === 0 && forbiddenHit.length === 0
      ? `All **${expected.length}** expected PostgreSQL enums are present; record_status naming OK.`
      : `Enum validation failures: missing=${missing.length} forbidden=${forbiddenHit.length}`,
  );

  await endPool();
  exitWithStatus(failures);
}

main().catch(async (err) => {
  console.error('[verify:FAIL]', err);
  await endPool();
  process.exit(1);
});
