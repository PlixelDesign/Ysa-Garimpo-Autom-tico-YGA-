import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Product, ProductStatus } from '../types/product';

// Função utilitária universal para ler variáveis tanto em Node.js (Vercel Serverless) quanto no Vite (Browser)
function getEnvVar(key: string): string {
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key] || '';
  }
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      // @ts-ignore
      return import.meta.env[key] || '';
    }
  } catch (e) {
    // Ignora erro se import.meta não existir
  }
  return '';
}

const supabaseUrl = 
  getEnvVar('VITE_SUPABASE_URL') || 
  getEnvVar('SUPABASE_URL') || 
  '';

const supabaseAnonKey = 
  getEnvVar('VITE_SUPABASE_ANON_KEY') || 
  getEnvVar('SUPABASE_ANON_KEY') || 
  getEnvVar('SUPABASE_KEY') || 
  '';

export function isSupabaseConfigured(): boolean {
  return Boolean(
    supabaseUrl && 
    supabaseAnonKey && 
    supabaseUrl !== 'https://your-project-id.supabase.co'
  );
}

// Instância singleton do cliente Supabase
export const supabase: SupabaseClient | null = isSupabaseConfigured() 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

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
 *   ml_id TEXT UNIQUE
 * );
 */

export async function fetchProductsFromSupabase(): Promise<Product[] | null> {
  const client = supabase || (isSupabaseConfigured() ? createClient(supabaseUrl, supabaseAnonKey) : null);
  if (!client) {
    console.warn('[Supabase Warning] Cliente Supabase não configurado.');
    return null;
  }

  try {
    const { data, error } = await client
      .from('products')
      .select('*')
      .order('discount_percentage', { ascending: false });

    if (error) {
      console.error('[Supabase Fetch Error] Falha ao carregar produtos:', error.message, error.details);
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
      reviewsCount: item.reviews_count ? Number(item.reviews_count) : 100,
      mlId: item.ml_id
    }));
  } catch (err: any) {
    console.error('[Supabase Fetch Exception]:', err);
    return null;
  }
}

export async function updateProductStatusInSupabase(
  productId: string, 
  status: ProductStatus
): Promise<boolean> {
  const client = supabase || (isSupabaseConfigured() ? createClient(supabaseUrl, supabaseAnonKey) : null);
  if (!client) return false;

  try {
    const updateData: any = { status };
    if (status === 'published') {
      updateData.published_at = new Date().toISOString();
    } else {
      updateData.published_at = null;
    }

    const { error } = await client
      .from('products')
      .update(updateData)
      .or(`id.eq.${productId},ml_id.eq.${productId}`);

    if (error) {
      console.error('[Supabase Update Error] Falha ao atualizar status:', error.message, error.details);
      return false;
    }

    return true;
  } catch (err: any) {
    console.error('[Supabase Update Exception]:', err);
    return false;
  }
}
