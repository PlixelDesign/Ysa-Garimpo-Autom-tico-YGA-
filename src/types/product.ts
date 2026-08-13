export type CategoryType = 'Utilidades do Lar' | 'Decoração' | 'Tecnologia';

export type FilterCategoryType = CategoryType | 'Todas';

export type ProductStatus = 'pending' | 'published';

export interface Product {
  id: string;
  title: string;
  originalPrice: number;
  discountPrice: number;
  discountPercentage: number;
  copyText: string;
  affiliateLink: string;
  category: CategoryType;
  imageUrl: string;
  status: ProductStatus;
  createdAt: string;
  publishedAt?: string;
  rating?: number;
  reviewsCount?: number;
  mlId?: string;
}

export interface MetricSummary {
  totalRadar: number;
  highestDiscount: number;
  publishedToday: number;
  avgDiscount: number;
}
