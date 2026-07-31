import {
  endPool,
  exitWithStatus,
  passFail,
  query,
  readSqlFile,
  splitExplainBlocks,
  writeReport,
} from './lib.js';

type PlanNode = {
  'Node Type'?: string;
  'Relation Name'?: string;
  Plans?: PlanNode[];
};

function collectSeqScans(node: PlanNode, out: Array<{ table: string; nodeType: string }>): void {
  const nodeType = node['Node Type'] ?? '';
  const relation = node['Relation Name'];
  if (nodeType === 'Seq Scan' && relation) {
    out.push({ table: relation, nodeType });
  }
  for (const child of node.Plans ?? []) {
    collectSeqScans(child, out);
  }
}

function extractPlanJson(rows: Array<Record<string, unknown>>): PlanNode | null {
  const first = rows[0];
  if (!first) return null;
  const raw = first['QUERY PLAN'] ?? first[Object.keys(first)[0]!];
  if (Array.isArray(raw) && raw[0]?.Plan) {
    return raw[0].Plan as PlanNode;
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as Array<{ Plan: PlanNode }>;
      return parsed[0]?.Plan ?? null;
    } catch {
      return null;
    }
  }
  return null;
}

async function main(): Promise<void> {
  let failures = 0;
  const sqlFile = readSqlFile('performance_queries.sql');
  const blocks = splitExplainBlocks(sqlFile);
  const lines: string[] = [
    '# Performance Report',
    '',
    `Queries from \`performance_queries.sql\`: **${blocks.length}**`,
    '',
    '| # | Status | Seq scans | Notes |',
    '| ---: | --- | --- | --- |',
  ];

  let index = 0;
  for (const block of blocks) {
    index += 1;
    const label = block.split('\n')[0]?.replace(/\s+/g, ' ').trim() ?? `Query ${index}`;
    try {
      const result = await query(block);
      const plan = extractPlanJson(result.rows as Array<Record<string, unknown>>);
      const seqScans: Array<{ table: string; nodeType: string }> = [];
      if (plan) {
        collectSeqScans(plan, seqScans);
      }
      const seqList = [...new Set(seqScans.map((s) => s.table))];
      if (seqList.length > 0) {
        lines.push(`| ${index} | WARN | ${seqList.join(', ')} | ${label.slice(0, 60)} |`);
        passFail(true, `Query ${index}: seq scan warning on ${seqList.join(', ')}`);
      } else {
        lines.push(`| ${index} | OK | — | ${label.slice(0, 60)} |`);
        passFail(true, `Query ${index}: no seq scans detected`);
      }
    } catch (err) {
      failures += 1;
      const message = err instanceof Error ? err.message : String(err);
      lines.push(`| ${index} | **FAIL** | — | ${message.replace(/\|/g, '\\|').slice(0, 120)} |`);
      passFail(false, `Query ${index} error: ${message}`);
    }
  }

  lines.push('', '_Seq scans emit warnings only; query errors fail verification._');
  writeReport('PerformanceReport.md', lines.join('\n'));
  await endPool();
  exitWithStatus(failures);
}

main().catch(async (err) => {
  console.error('[verify:FAIL]', err);
  await endPool();
  process.exit(1);
});
