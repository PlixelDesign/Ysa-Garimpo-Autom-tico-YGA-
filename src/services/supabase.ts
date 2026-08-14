import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Product, ProductStatus } from '../types/product';

// Lê variáveis de ambiente para a conexão Supabase no Front-end (Browser)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export function isSupabaseConfigured(): boolean {
  return Boolean(
    supabaseUrl && 
    supabaseAnonKey && 
    supabaseUrl !== 'https://your-project-id.supabase.co'
  );
}

// Instância oficial do cliente Supabase para o Client-Side
export const supabase: SupabaseClient | null = isSupabaseConfigured() 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Busca produtos salvos no Supabase ordenados por maior desconto (%)
 */
export async function fetchProductsFromSupabase(): Promise<Product[] | null> {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('discount_percentage', { ascending: false });

    if (error) {
      console.error('[Supabase Client Error] Falha ao carregar produtos:', error.message);
      return null;
    }

    if (!data) return [];

    return data.map((item: any) => ({
      id: item.id || item.ml_id,
      title: item.title,
      originalPrice: Number(item.original_price),
      discountPrice: Number(item.discount_price),
      discountPercentage: Number(item.discount_percentage),
      copyText: item.copy_text,
      affiliateLink: item.affiliate_link || item.original_link || item.permalink,
      category: item.category || 'Utilidades do Lar',
      imageUrl: item.image_url,
      status: (item.status as ProductStatus) || 'pending',
      createdAt: item.created_at,
      publishedAt: item.published_at,
      rating: item.rating ? Number(item.rating) : 4.8,
      reviewsCount: item.reviews_count ? Number(item.reviews_count) : 120,
      mlId: item.ml_id
    }));
  } catch (err: any) {
    console.error('[Supabase Fetch Exception]:', err);
    return null;
  }
}

/**
 * Faz o upsert direto dos produtos garimpados no Client-Side para a tabela products
 */
export async function upsertProductsToSupabase(formattedProducts: any[]): Promise<boolean> {
  if (!supabase || formattedProducts.length === 0) return false;

  try {
    console.log(`[Supabase Client-Side] Gravando ${formattedProducts.length} produtos na tabela "products"...`);
    const { error } = await supabase
      .from('products')
      .upsert(formattedProducts, { onConflict: 'ml_id' });

    if (error) {
      console.error('[Supabase Upsert Error]:', error.message, error.details);
      return false;
    }

    console.log('[Supabase Client-Side] ✅ Gravação concluída com sucesso!');
    return true;
  } catch (err: any) {
    console.error('[Supabase Upsert Exception]:', err);
    return false;
  }
}

/**
 * Atualiza o status do produto (pending -> published) no Supabase
 */
export async function updateProductStatusInSupabase(
  productId: string, 
  status: ProductStatus
): Promise<boolean> {
  if (!supabase) return false;

  try {
    const updateData: any = { status };
    if (status === 'published') {
      updateData.published_at = new Date().toISOString();
    } else {
      updateData.published_at = null;
    }

    const { error } = await supabase
      .from('products')
      .update(updateData)
      .or(`id.eq.${productId},ml_id.eq.${productId}`);

    if (error) {
      console.error('[Supabase Update Status Error]:', error.message);
      return false;
    }

    return true;
  } catch (err: any) {
    console.error('[Supabase Update Exception]:', err);
    return false;
  }
}
