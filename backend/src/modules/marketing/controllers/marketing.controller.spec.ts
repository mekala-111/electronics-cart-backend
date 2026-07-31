import { CmsPublicController } from '../controllers/marketing.controller';

describe('CmsPublicController', () => {
  it('delegates page lookup', async () => {
    const cms = {
      getPageBySlug: jest.fn(async () => ({ slug: 'x' })),
      listBlogs: jest.fn(async () => []),
      getBlog: jest.fn(),
      listGuides: jest.fn(async () => []),
      listBanners: jest.fn(async () => []),
      getNavigation: jest.fn(async () => ({ items: [] })),
    };
    const ctrl = new CmsPublicController(cms as never);
    await ctrl.page('x');
    expect(cms.getPageBySlug).toHaveBeenCalledWith('x');
  });
});
