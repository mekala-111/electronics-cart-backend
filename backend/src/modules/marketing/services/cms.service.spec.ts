import { CmsService } from './cms.service';

describe('CmsService', () => {
  it('loads published page by slug', async () => {
    const repo = {
      client: {
        cmsPage: {
          findFirst: jest.fn(async () => ({
            id: 'p1',
            slug: 'home',
            title: 'Home',
            page_type: 'page',
            published_at: new Date(),
            sections: [
              {
                id: 's1',
                section_key: 'hero',
                section_type: 'hero',
                title: 'Hero',
                config_json: {},
                sort_order: 0,
              },
            ],
          })),
        },
      },
      audit: jest.fn(),
    };
    const cache = {
      getOrSet: jest.fn((_k: string, fn: () => Promise<unknown>) => fn()),
    };
    const service = new CmsService(repo as never, cache as never);
    const page = await service.getPageBySlug('home');
    expect(page.slug).toBe('home');
    expect(page.sections).toHaveLength(1);
  });
});
