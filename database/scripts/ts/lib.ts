import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const DATABASE_DIR = path.resolve(__dirname, '../..');
export const REPO_ROOT = path.resolve(DATABASE_DIR, '..');
export const SCRIPTS_DIR = path.resolve(DATABASE_DIR, 'scripts');
export const SQL_DIR = path.resolve(DATABASE_DIR, 'sql');
export const CHECK_SQL_DIR = path.resolve(SCRIPTS_DIR, 'sql');
export const REPORTS_DIR = path.resolve(DATABASE_DIR, 'reports');
export const ROOT_REPORTS_DIR = path.resolve(REPO_ROOT, 'reports');
export const EXPECTED_ENUMS = path.resolve(SCRIPTS_DIR, 'lib/expected_enums.txt');
export const EXPECTED_TABLES = path.resolve(SCRIPTS_DIR, 'lib/expected_tables.txt');
export const EXPECTED_MIGRATIONS = path.resolve(SCRIPTS_DIR, 'lib/expected_migrations.txt');

export const DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgresql://electronics:electronics@127.0.0.1:5433/electronics_cart';

let pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (!pool) {
    pool = new pg.Pool({ connectionString: DATABASE_URL });
  }
  return pool;
}

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  sql: string,
  params?: unknown[],
): Promise<pg.QueryResult<T>> {
  return getPool().query<T>(sql, params);
}

export async function endPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

export function readLines(filePath: string): string[] {
  const raw = fs.readFileSync(filePath, 'utf8');
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));
}

export function ensureReportsDir(): void {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  fs.mkdirSync(ROOT_REPORTS_DIR, { recursive: true });
}

export function writeReport(filename: string, markdown: string): void {
  ensureReportsDir();
  const dbPath = path.join(REPORTS_DIR, filename);
  const rootPath = path.join(ROOT_REPORTS_DIR, filename);
  fs.writeFileSync(dbPath, markdown.endsWith('\n') ? markdown : `${markdown}\n`, 'utf8');
  fs.copyFileSync(dbPath, rootPath);
  console.log(`[verify] Wrote reports/${filename}`);
}

export function appendSchemaValidationSection(sectionTitle: string, body: string): void {
  ensureReportsDir();
  const filename = 'SchemaValidation.md';
  const dbPath = path.join(REPORTS_DIR, filename);
  const rootPath = path.join(ROOT_REPORTS_DIR, filename);
  const marker = `## ${sectionTitle}`;
  const block = `${marker}\n\n${body.trim()}\n\n`;
  let existing = '';
  if (fs.existsSync(dbPath)) {
    existing = fs.readFileSync(dbPath, 'utf8');
    const idx = existing.indexOf(marker);
    if (idx >= 0) {
      const next = existing.indexOf('\n## ', idx + marker.length);
      existing = next >= 0 ? existing.slice(0, idx) + existing.slice(next + 1) : existing.slice(0, idx);
    }
  } else {
    existing = '# Schema Validation\n\n';
  }
  const updated = `${existing.trimEnd()}\n\n${block}`;
  fs.writeFileSync(dbPath, updated.endsWith('\n') ? updated : `${updated}\n`, 'utf8');
  fs.copyFileSync(dbPath, rootPath);
}

export function passFail(ok: boolean, msg: string): string {
  const tag = ok ? 'PASS' : 'FAIL';
  const line = `[${tag}] ${msg}`;
  console.log(line);
  return line;
}

export function exitWithStatus(failures: number): never {
  if (failures > 0) {
    console.error(`[verify] ${failures} check(s) failed`);
    process.exit(1);
  }
  console.log('[verify] All checks passed');
  process.exit(0);
}

export function readSqlFile(relativeFromCheckSql: string): string {
  return fs.readFileSync(path.join(CHECK_SQL_DIR, relativeFromCheckSql), 'utf8');
}

export function splitExplainBlocks(sqlFileContents: string): string[] {
  const blocks: string[] = [];
  const lines = sqlFileContents.split(/\r?\n/);
  let current: string[] = [];

  for (const line of lines) {
    if (/^\s*EXPLAIN\b/i.test(line)) {
      if (current.length > 0) {
        blocks.push(current.join('\n').trim());
        current = [];
      }
      current.push(line);
      continue;
    }
    if (current.length > 0) {
      current.push(line);
      if (line.trim().endsWith(';')) {
        blocks.push(current.join('\n').trim());
        current = [];
      }
    }
  }
  if (current.length > 0) {
    blocks.push(current.join('\n').trim());
  }
  return blocks.filter(Boolean);
}

export function stripSqlComments(sql: string): string {
  let out = '';
  let i = 0;
  while (i < sql.length) {
    if (sql.startsWith('--', i)) {
      const nl = sql.indexOf('\n', i);
      i = nl === -1 ? sql.length : nl + 1;
      continue;
    }
    if (sql.startsWith('/*', i)) {
      const end = sql.indexOf('*/', i + 2);
      i = end === -1 ? sql.length : end + 2;
      continue;
    }
    out += sql[i];
    i += 1;
  }
  return out;
}

export function parseCliFlag(name: string): string | undefined {
  const prefix = `--${name}=`;
  const arg = process.argv.find((a) => a.startsWith(prefix));
  return arg?.slice(prefix.length);
}
