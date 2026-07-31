/** Thin response shapes — Prisma models remain the source of truth. */
export type BrandEntity = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  country: string | null;
  website: string | null;
  sortOrder: number;
  logoFileId: string | null;
};

export type ProductListItem = {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  brand: { id: string; name: string; slug: string };
  category: { id: string; name: string; slug: string };
  isFeatured: boolean;
  isRefurbished: boolean;
  isNewArrival: boolean;
  ratingAvg: number;
  reviewCount: number;
  priceFrom: number | null;
  currency: string | null;
  stockStatus: string | null;
};
