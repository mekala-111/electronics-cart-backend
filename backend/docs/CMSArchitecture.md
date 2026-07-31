# CMS Architecture

Models: `CmsPage`, `CmsSection`, `PageRevision`, `Banner`/`BannerGroup`, `Blog*`, `BuyingGuide`, `HomepageLayout`.

Public: `GET /api/cms/pages/:slug`, `/blog`, `/guides`, `/banners`, `/navigation`.  
Admin: create/patch pages, banners, popups, blogs.

Sections store reusable config in `config_json` (no visual page builder).
