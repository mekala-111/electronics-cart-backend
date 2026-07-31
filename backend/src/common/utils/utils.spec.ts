import { generateUuid } from './uuid.util';
import { buildPaginationMeta, parsePaginationQuery } from './pagination.util';
import { slugify } from './slug.util';

describe('foundation utils', () => {
  it('generates uuid', () => {
    expect(generateUuid()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it('normalizes pagination', () => {
    const p = parsePaginationQuery({ page: 2, limit: 20 });
    expect(p.skip).toBe(20);
    expect(p.take).toBe(20);
    expect(buildPaginationMeta(p.page, p.limit, 55).totalPages).toBe(3);
  });

  it('slugifies text', () => {
    expect(slugify('MacBook Pro 16')).toContain('macbook');
  });
});
