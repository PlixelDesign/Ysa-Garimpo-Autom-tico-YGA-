import { Product } from '../types/product';
import { handleSearchMLOffers } from '../../api/search-ml';

export async function fetchRealMercadoLivreOffers(
  searchQuery: string = 'organizador cozinha'
): Promise<Product[]> {
  try {
    // 1. Tenta chamar a API route local ou remota
    const result = await handleSearchMLOffers(searchQuery);

    if (!result.success || !result.products || result.products.length === 0) {
      console.warn('[ML Service] Nenhuma oferta com desconto real encontrada.');
      return [];
    }

    // 2. Mapeia a resposta para a interface Product do TypeScript
    const mappedProducts: Product[] = result.products.map((item: any, idx: number) => ({
      id: item.ml_id || `ml-fetched-${Date.now()}-${idx}`,
      title: item.title,
      originalPrice: item.original_price,
      discountPrice: item.discount_price,
      discountPercentage: item.discount_percentage,
      copyText: item.copy_text,
      affiliateLink: item.affiliate_link,
      category: 'Utilidades do Lar',
      imageUrl: item.image_url,
      status: 'pending',
      createdAt: item.created_at || new Date().toISOString(),
      rating: 4.8,
      reviewsCount: Math.floor(Math.random() * 800) + 150,
      mlId: item.ml_id
    }));

    // 3. Garante a ordenação por maior desconto (%)
    return mappedProducts.sort((a, b) => b.discountPercentage - a.discountPercentage);
  } catch (error) {
    console.error('[ML Search Service Error]:', error);
    return [];
  }
}
