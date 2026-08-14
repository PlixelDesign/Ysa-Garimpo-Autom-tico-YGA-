import { Product } from '../types/product';
import { fetchProductsFromSupabase } from './supabase';

/**
 * Serviço Read-Only do Front-end:
 * O Front-end não faz requisições diretas ao Mercado Livre.
 * Ele consulta estritamente os produtos salvos na tabela "products" do Supabase pelo garimpo-worker.js.
 */
export async function fetchRealMercadoLivreOffers(): Promise<Product[]> {
  try {
    const products = await fetchProductsFromSupabase();
    if (!products) return [];
    return products.sort((a, b) => b.discountPercentage - a.discountPercentage);
  } catch (err) {
    console.error('[ML Search Service Error]:', err);
    return [];
  }
}
