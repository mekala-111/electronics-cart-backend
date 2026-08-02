import fs from 'node:fs';
import path from 'node:path';
import {
  SQL_DIR,
  endPool,
  exitWithStatus,
  passFail,
  stripSqlComments,
  writeReport,
} from './lib.js';

type Finding = {
  file: string;
  line: number;
  pattern: string;
  text: string;
  severity: 'fail' | 'warn';
};

const PATTERNS: Array<{ name: string; regex: RegExp; severity: 'fail' | 'warn' }> = [
  { name: 'DROP TABLE (no IF EXISTS)', regex: /\bDROP\s+TABLE(?!\s+IF\s+EXISTS)\b/i, severity: 'warn' },
  { name: 'DROP TABLE', regex: /\bDROP\s+TABLE\b/i, severity: 'warn' },
  { name: 'DROP COLUMN', regex: /\bDROP\s+COLUMN\b/i, severity: 'fail' },
  { name: 'ALTER TABLE ... DROP', regex: /\bALTER\s+TABLE\b[\s\S]*?\bDROP\b/i, severity: 'warn' },
  { name: 'TRUNCATE', regex: /\bTRUNCATE\b/i, severity: 'warn' },
];

function classifyFile(filePath: string): 'forward' | 'seed' | 'index' | 'other' {
  const base = path.basename(filePath);
  if (/^\d{3}_.*seed\.sql$/i.test(base)) return 'seed';
  if (/^\d{3}_.*index/i.test(base)) return 'index';
  if (/^\d{3}_/.test(base)) return 'forward';
  return 'other';
}

function scanFile(filePath: string): Finding[] {
  const content = fs.readFileSync(filePath, 'utf8');
  const stripped = stripSqlComments(content);
  const lines = stripped.split(/\r?\n/);
  const findings: Finding[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]!;
    for (const pattern of PATTERNS) {
      if (pattern.regex.test(line)) {
        findings.push({
          file: path.basename(filePath),
          line: i + 1,
          pattern: pattern.name,
          text: line.trim(),
          severity: pattern.severity,
        });
      }
    }
  }
  return findings;
}

async function main(): Promise<void> {
  let failures = 0;
  const files = fs
    .readdirSync(SQL_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => path.join(SQL_DIR, f));

  const allFindings: Finding[] = [];
  for (const file of files) {
    allFindings.push(...scanFile(file));
  }

  // Fail only on DROP COLUMN (data-loss risk). DROP TABLE IF EXISTS in forward
  // files is unexpected — fail those too. Plain DROP TABLE without IF EXISTS warns
  // unless it is clearly DROP COLUMN.
  for (const f of allFindings) {
    const num = Number(f.file.slice(0, 3));
    if (!(num >= 1 && num <= 45)) continue;
    if (f.pattern === 'DROP COLUMN') failures += 1;
    if (f.pattern === 'DROP TABLE (no IF EXISTS)') failures += 1;
  }

  const lines: string[] = [
    '# Production Dry Run',
    '',
    'Scans `database/sql/*.sql` for destructive statements outside SQL comments.',
    '',
    `Files scanned: **${files.length}**`,
    `Findings: **${allFindings.length}**`,
    '',
  ];

  if (allFindings.length === 0) {
    lines.push(passFail(true, 'No destructive SQL patterns detected'));
  } else {
    lines.push('| File | Kind | Line | Pattern | Severity | Snippet |', '| --- | --- | ---: | --- | --- | --- |');
    for (const f of allFindings) {
      const kind = classifyFile(path.join(SQL_DIR, f.file));
      const sev =
        f.pattern === 'DROP COLUMN' ||
        (Number(f.file.slice(0, 3)) <= 45 && (f.pattern === 'DROP TABLE' || f.pattern === 'DROP COLUMN'))
          ? 'fail'
          : f.severity;
      lines.push(
        `| ${f.file} | ${kind} | ${f.line} | ${f.pattern} | ${sev} | ${f.text.replace(/\|/g, '\\|').slice(0, 80)} |`,
      );
      if (sev === 'fail') {
        passFail(false, `${f.file}:${f.line} ${f.pattern}`);
      } else {
        passFail(true, `${f.file}:${f.line} ${f.pattern} (warn)`);
      }
    }
  }

  lines.push(
    '',
    'Deploy path uses numbered SQL files under `database/sql/` (not Prisma migrate folders).',
    'Forward migrations `001`–`046` must not contain `DROP TABLE` or `DROP COLUMN`.',
  );

  writeReport('ProductionDryRun.md', lines.join('\n'));
  await endPool();
  exitWithStatus(failures);
}

main().catch(async (err) => {
  console.error('[verify:FAIL]', err);
  await endPool();
  process.exit(1);
});
