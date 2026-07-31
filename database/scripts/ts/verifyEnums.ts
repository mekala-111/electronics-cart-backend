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
    missing.length === 0
      ? `All **${expected.length}** expected PostgreSQL enums are present.`
      : `**${missing.length}** expected enum(s) missing: ${missing.join(', ')}`,
  );

  await endPool();
  exitWithStatus(failures);
}

main().catch(async (err) => {
  console.error('[verify:FAIL]', err);
  await endPool();
  process.exit(1);
});
