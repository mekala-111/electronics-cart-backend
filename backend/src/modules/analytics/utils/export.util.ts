/** Minimal CSV / spreadsheet / text exporters (no exceljs/pdfkit dependency). */

export function rowsToCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return '';
  const keys = Array.from(
    rows.reduce((set, row) => {
      Object.keys(row).forEach((k) => set.add(k));
      return set;
    }, new Set<string>()),
  );
  const escape = (v: unknown) => {
    const s =
      v === null || v === undefined
        ? ''
        : typeof v === 'object'
          ? JSON.stringify(v)
          : String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  return [
    keys.join(','),
    ...rows.map((r) => keys.map((k) => escape(r[k])).join(',')),
  ].join('\n');
}

/** SpreadsheetML XML — opens in Excel; avoids adding exceljs. */
export function rowsToXlsxXml(rows: Record<string, unknown>[]): string {
  const keys = rows.length
    ? Array.from(
        rows.reduce((set, row) => {
          Object.keys(row).forEach((k) => set.add(k));
          return set;
        }, new Set<string>()),
      )
    : ['value'];
  const cell = (v: unknown) =>
    `<Cell><Data ss:Type="String">${escapeXml(
      v === null || v === undefined
        ? ''
        : typeof v === 'object'
          ? JSON.stringify(v)
          : String(v),
    )}</Data></Cell>`;
  const header = `<Row>${keys.map((k) => cell(k)).join('')}</Row>`;
  const body = rows
    .map((r) => `<Row>${keys.map((k) => cell(r[k])).join('')}</Row>`)
    .join('');
  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Worksheet ss:Name="Report"><Table>${header}${body}</Table></Worksheet>
</Workbook>`;
}

export function rowsToPdfText(rows: Record<string, unknown>[]): string {
  const lines = [
    'Electronics Cart Analytics Export',
    `Generated: ${new Date().toISOString()}`,
    '',
    rowsToCsv(rows),
  ];
  return lines.join('\n');
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
