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

// Termos com altíssima liquidez de descontos reais no Mercado Livre
const HIGH_LIQUIDITY_KEYWORDS = [
  'mop giratorio',
  'lixeira inox sensor',
  'escorredor louca inox',
  'organizador armario cozinha',
  'kit potes hermeticos'
];

/**
 * Converte imagens de baixa resolução do Mercado Livre (-I.jpg) para alta qualidade (-O.jpg ou -V.jpg)
 */
export function getHighResImageUrl(thumbnailUrl: string): string {
  if (!thumbnailUrl) return '';
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
export async function handleSearchMLOffers(requestedQuery?: string) {
  try {
    // Escolhe uma palavra-chave de alta liquidez se a busca não for especificada
    const queryTerm = requestedQuery || 
      HIGH_LIQUIDITY_KEYWORDS[Math.floor(Math.random() * HIGH_LIQUIDITY_KEYWORDS.length)];

    // 1. Busca 50 itens para garantir alta amostragem de descontos
    const mlApiUrl = `https://api.mercadolibre.com/sites/MLB/search?q=${encodeURIComponent(queryTerm)}&limit=50`;
    const response = await fetch(mlApiUrl);

    if (!response.ok) {
      throw new Error(`Erro na API do Mercado Livre: ${response.statusText}`);
    }

    const data = await response.json();
    let results: MLRawItem[] = data.results || [];

    // 2. Valida rigorosamente se item.original_price existe e se item.price < item.original_price
    let discountedItems = results.filter(
      item => item.original_price && Number(item.price) < Number(item.original_price)
    );

    // Fallback: Se o termo escolhido tiver poucos descontos, tenta com 'mop giratorio'
    if (discountedItems.length < 3 && queryTerm !== 'mop giratorio') {
      const fallbackUrl = `https://api.mercadolibre.com/sites/MLB/search?q=mop%20giratorio&limit=50`;
      const fbResponse = await fetch(fallbackUrl);
      if (fbResponse.ok) {
        const fbData = await fbResponse.json();
        const fbResults: MLRawItem[] = fbData.results || [];
        const fbDiscounted = fbResults.filter(
          item => item.original_price && Number(item.price) < Number(item.original_price)
        );
        discountedItems = [...discountedItems, ...fbDiscounted];
      }
    }

    // 3. Trata os dados, calcula a porcentagem de desconto e formata para o Supabase
    const formattedProducts = discountedItems.map(item => {
      const originalPrice = Number(item.original_price);
      const discountPrice = Number(item.price);
      const discountPercentage = Math.round(
        ((originalPrice - discountPrice) / originalPrice) * 100
      );
      const imageUrl = getHighResImageUrl(item.thumbnail);
      const affiliateLink = item.permalink;
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

    // Ordenar do maior para o menor desconto (%)
    formattedProducts.sort((a, b) => b.discount_percentage - a.discount_percentage);

    // 4. Salvar os resultados diretamente na tabela "products" do Supabase (se configurado)
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
      query_used: queryTerm,
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

  const query = req.query?.q || req.body?.q || '';
  const result = await handleSearchMLOffers(query);

  if (!result.success) {
    return res.status(500).json(result);
  }

  return res.status(200).json(result);
}
