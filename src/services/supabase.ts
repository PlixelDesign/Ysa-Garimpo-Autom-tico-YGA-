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
      id: item.id || item.ml_id || '',
      title: item.title || 'Produto sem título',
      originalPrice: Number(item.original_price) || 0,
      discountPrice: Number(item.discount_price) || 0,
      discountPercentage: Number(item.discount_percentage) || 0,
      copyText: item.copy_text || '',
      affiliateLink: item.affiliate_link || item.original_link || '',
      originalLink: item.original_link || item.affiliate_link || '',
      category: item.category || 'Utilidades do Lar',
      imageUrl: item.image_url || '',
      status: (item.status as ProductStatus) || 'pending',
      createdAt: item.created_at || new Date().toISOString(),
      lastSeenAt: item.last_seen_at || item.created_at || new Date().toISOString(),
      publishedAt: item.published_at,
      rating: item.rating ? Number(item.rating) : undefined,
      reviewsCount: item.reviews_count ? Number(item.reviews_count) : undefined,
      mlId: item.ml_id || ''
    }));
  } catch (err: any) {
    console.error('[Supabase Fetch Exception]:', err);
    return null;
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
      .eq('id', productId);

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

/**
 * Salva a copy editada e o link de afiliado colado pela Ysa
 */
export async function updateProductContentInSupabase(
  productId: string,
  fields: { copyText: string; affiliateLink: string }
): Promise<boolean> {
  if (!supabase) return false;

  const { error } = await supabase
    .from('products')
    .update({ copy_text: fields.copyText, affiliate_link: fields.affiliateLink })
    .eq('id', productId);

  if (error) {
    console.error('[Supabase Update Content Error]:', error.message);
    return false;
  }

  return true;
}
