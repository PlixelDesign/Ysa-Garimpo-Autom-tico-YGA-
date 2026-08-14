import { isSupabaseConfigured, supabase } from '../src/services/supabase';

export interface MLRawItem {
  id: string;
  title: string;
  price: number;
  original_price: number | null;
  permalink: string;
  thumbnail: string;
  category_id?: string;
  available_quantity?: number;
}

/**
 * Converte imagens de baixa resolução do Mercado Livre (-I.jpg) para alta qualidade (-O.jpg ou -V.jpg)
 */
export function getHighResImageUrl(thumbnailUrl: string): string {
  if (!thumbnailUrl) return '';
  // Troca o sufixo -I.jpg por -O.jpg para imagem original em alta resolução
  return thumbnailUrl
    .replace(/-I\.jpg$/i, '-O.jpg')
    .replace(/-I\.webp$/i, '-O.webp')
    .replace('http://', 'https://');
}

/**
 * Gera texto persuasivo de vendas (Copy) com foco em conversão para Instagram / Telegram
 */
export function generatePersuasiveCopy(
  title: string,
  originalPrice: number,
  discountPrice: number,
  discountPercentage: number,
  affiliateLink: string
): string {
  const formatBRL = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return `🔥 ACHADO INCRÍVEL DO MERCADO LIVRE!
${title}

✨ Destaques do Garimpo:
• Produto altamente recomendado e campeão de vendas
• Qualidade garantida com preço de oportunidade no ML
• Entrega rápida e compra 100% segura

❌ De ${formatBRL(originalPrice)}
✅ Por apenas ${formatBRL(discountPrice)} (-${discountPercentage}% OFF) 🚨

👇 GARANTA O SEU COM FRETE GRÁTIS NO LINK DO PERFIL / STORY:
${affiliateLink}`;
}

/**
 * Lógica principal da Rota de API do Servidor (Serverless Function / API Route)
 */
export async function handleSearchMLOffers(query: string = 'organizador cozinha') {
  try {
    const mlApiUrl = `https://api.mercadolibre.com/sites/MLB/search?q=${encodeURIComponent(query)}&limit=20`;
    const response = await fetch(mlApiUrl);

    if (!response.ok) {
      throw new Error(`Erro na API do Mercado Livre: ${response.statusText}`);
    }

    const data = await response.json();
    const results: MLRawItem[] = data.results || [];

    // 1. Filtrar APENAS produtos onde price é MENOR que original_price (Desconto real)
    const discountedItems = results.filter(
      item => item.original_price && item.original_price > item.price
    );

    // 2. Tratar os dados, calcular porcentagens e montar a estrutura da tabela Supabase
    const formattedProducts = discountedItems.map(item => {
      const originalPrice = item.original_price!;
      const discountPrice = item.price;
      const discountPercentage = Math.round(
        ((originalPrice - discountPrice) / originalPrice) * 100
      );
      const imageUrl = getHighResImageUrl(item.thumbnail);
      const affiliateLink = item.permalink; // Em produção, injeta a tag de afiliado do ML
      const copyText = generatePersuasiveCopy(
        item.title,
        originalPrice,
        discountPrice,
        discountPercentage,
        affiliateLink
      );

      return {
        ml_id: item.id,
        title: item.title,
        original_price: originalPrice,
        discount_price: discountPrice,
        discount_percentage: discountPercentage,
        copy_text: copyText,
        affiliate_link: affiliateLink,
        category: 'Utilidades do Lar',
        image_url: imageUrl,
        status: 'pending',
        created_at: new Date().toISOString()
      };
    });

    // 3. Salvar os resultados diretamente na tabela "products" do Supabase (se configurado)
    if (isSupabaseConfigured() && supabase && formattedProducts.length > 0) {
      const { error } = await supabase
        .from('products')
        .upsert(formattedProducts, { onConflict: 'ml_id' });

      if (error) {
        console.error('[Supabase Upsert Error]:', error.message);
      }
    }

    return {
      success: true,
      total_found: results.length,
      discounted_count: formattedProducts.length,
      products: formattedProducts
    };
  } catch (err: any) {
    console.error('[Search ML API Route Error]:', err);
    return {
      success: false,
      error: err.message || 'Erro ao buscar ofertas no Mercado Livre'
    };
  }
}

// Handler padrão para compatibilidade com Vercel / Node Serverless API Route (HTTP POST/GET)
export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const query = req.query?.q || req.body?.q || 'organizador cozinha';
  const result = await handleSearchMLOffers(query);

  if (!result.success) {
    return res.status(500).json(result);
  }

  return res.status(200).json(result);
}
