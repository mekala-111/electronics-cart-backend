import { buildCategoryTree, mapBrand } from './catalog.mapper';

describe('catalog.mapper', () => {
  it('builds nested category tree from parent_id', () => {
    const rows = [
      { id: '1', parent_id: null, name: 'Laptops', slug: 'laptops', sort_order: 10 },
      { id: '2', parent_id: '1', name: 'Gaming', slug: 'gaming', sort_order: 1 },
      { id: '3', parent_id: '1', name: 'Business', slug: 'business', sort_order: 2 },
    ] as never[];

    const tree = buildCategoryTree(rows);
    expect(tree).toHaveLength(1);
    expect(tree[0].children).toHaveLength(2);
    expect(tree[0].children[0].slug).toBe('gaming');
  });

  it('maps brand fields', () => {
    const mapped = mapBrand({
      id: 'b1',
      name: 'Apple',
      slug: 'apple',
      description: null,
      country: 'USA',
      website: null,
      sort_order: 1,
      logo_file_id: null,
      status: 'active',
    } as never);
    expect(mapped.slug).toBe('apple');
    expect(mapped.sortOrder).toBe(1);
  });
});
