import { rowsToCsv, rowsToPdfText, rowsToXlsxXml } from '../utils/export.util';

describe('export utils', () => {
  const rows = [
    { a: 1, b: 'x' },
    { a: 2, b: 'y,z' },
  ];

  it('renders csv', () => {
    const csv = rowsToCsv(rows);
    expect(csv.split('\n')[0]).toContain('a');
    expect(csv).toContain('"y,z"');
  });

  it('renders xlsx xml', () => {
    const xml = rowsToXlsxXml(rows);
    expect(xml).toContain('Workbook');
    expect(xml).toContain('<Cell>');
  });

  it('renders pdf text', () => {
    expect(rowsToPdfText(rows)).toContain('Electronics Cart');
  });
});
