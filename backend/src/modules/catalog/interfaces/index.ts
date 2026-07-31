export interface CategoryTreeNode {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  sortOrder: number;
  children: CategoryTreeNode[];
}

export interface ProductSearchFilters {
  q?: string;
  brandId?: string;
  brandSlug?: string;
  categoryId?: string;
  categorySlug?: string;
  collectionId?: string;
  collectionSlug?: string;
  minPrice?: number;
  maxPrice?: number;
  condition?: string;
  availability?: string;
  attributes?: string[]; // attributeValueIds
  minRating?: number;
  featured?: boolean;
  refurbished?: boolean;
  newArrival?: boolean;
  sort?: string;
  page?: number;
  limit?: number;
}
