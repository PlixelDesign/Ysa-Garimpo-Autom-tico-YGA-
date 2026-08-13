import { createClient } from '@supabase/supabase-js';
import { Product, ProductStatus } from '../types/product';

// Configuração das variáveis de ambiente para o Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

/**
 * Instância oficial do cliente Supabase.
 * Para conectar ao seu banco real:
 * 1. Preencha o arquivo .env na raiz com VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.
 * 2. Crie a tabela "products" no Supabase com o esquema documentado abaixo.
 */
export const supabase = isSupabaseConfigured() 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export function isSupabaseConfigured(): boolean {
  return Boolean(
    supabaseUrl && 
    supabaseAnonKey && 
    supabaseUrl !== 'https://your-project-id.supabase.co'
  );
}

/**
 * Esquema recomendado para a tabela "products" no Supabase PostgreSQL:
 * 
 * CREATE TABLE products (
 *   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *   title TEXT NOT NULL,
 *   original_price NUMERIC(10,2) NOT NULL,
 *   discount_price NUMERIC(10,2) NOT NULL,
 *   discount_percentage INT NOT NULL,
 *   copy_text TEXT NOT NULL,
 *   affiliate_link TEXT NOT NULL,
 *   category TEXT NOT NULL,
 *   image_url TEXT NOT NULL,
 *   status TEXT DEFAULT 'pending' NOT NULL,
 *   created_at TIMESTAMPTZ DEFAULT now(),
 *   published_at TIMESTAMPTZ,
 *   ml_id TEXT
 * );
 */

export async function fetchProductsFromSupabase(): Promise<Product[] | null> {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('discount_percentage', { ascending: false });

    if (error) {
      console.error('[Supabase Error] Falha ao carregar produtos:', error.message);
      return null;
    }

    if (!data) return [];

    // Mapeamento dos campos snake_case do Postgres para camelCase do TypeScript
    return data.map((item: any) => ({
      id: item.id,
      title: item.title,
      originalPrice: Number(item.original_price),
      discountPrice: Number(item.discount_price),
      discountPercentage: Number(item.discount_percentage),
      copyText: item.copy_text,
      affiliateLink: item.affiliate_link,
      category: item.category,
      imageUrl: item.image_url,
      status: item.status as ProductStatus,
      createdAt: item.created_at,
      publishedAt: item.published_at,
      rating: item.rating ? Number(item.rating) : 4.8,
      reviewsCount: item.reviews_count ? Number(item.reviews_count) : 100,
      mlId: item.ml_id
    }));
  } catch (err) {
    console.error('[Supabase Error]', err);
    return null;
  }
}

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
      console.error('[Supabase Error] Falha ao atualizar status:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[Supabase Error]', err);
    return false;
  }
}
