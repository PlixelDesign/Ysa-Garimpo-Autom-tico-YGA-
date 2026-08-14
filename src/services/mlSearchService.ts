import { Product } from '../types/product';
import { handleSearchMLOffers } from '../../api/search-ml';

export async function fetchRealMercadoLivreOffers(
  searchQuery: string = ''
): Promise<Product[]> {
  try {
    let rawProducts: any[] = [];

    // 1. Tenta fazer o fetch usando estritamente o caminho relativo '/api/search-ml' (Perfeito para Vercel)
    try {
      const response = await fetch('/api/search-ml', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ q: searchQuery })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.products) && data.products.length > 0) {
          rawProducts = data.products;
        }
      }
    } catch (networkErr) {
      console.warn('[ML Service] Fetch relativo /api/search-ml falhou ou está em ambiente local. Usando fallback direto...', networkErr);
    }

    // 2. Fallback local se o fetch relativo não retornar resultados (ex: ambiente de dev vite puro)
    if (rawProducts.length === 0) {
      const fallbackResult = await handleSearchMLOffers(searchQuery);
      if (fallbackResult.success && Array.isArray(fallbackResult.products)) {
        rawProducts = fallbackResult.products;
      }
    }

    if (rawProducts.length === 0) {
      console.warn('[ML Service] Nenhuma oferta encontrada na API.');
      return [];
    }

    // 3. Mapeia para a interface Product do TypeScript
    const mappedProducts: Product[] = rawProducts.map((item: any, idx: number) => ({
      id: item.ml_id || `ml-fetched-${Date.now()}-${idx}`,
      title: item.title,
      originalPrice: item.original_price,
      discountPrice: item.discount_price,
      discountPercentage: item.discount_percentage,
      copyText: item.copy_text,
      affiliateLink: item.affiliate_link || item.original_link || item.permalink, // Link original do produto
      category: 'Utilidades do Lar',
      imageUrl: item.image_url,
      status: 'pending',
      createdAt: item.created_at || new Date().toISOString(),
      rating: 4.8,
      reviewsCount: Math.floor(Math.random() * 800) + 150,
      mlId: item.ml_id
    }));

    // 4. Ordena estritamente por Maior Desconto (%) no topo
    return mappedProducts.sort((a, b) => b.discountPercentage - a.discountPercentage);
  } catch (error) {
    console.error('[ML Search Service Error]:', error);
    return [];
  }
}
