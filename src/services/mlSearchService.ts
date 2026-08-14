import { Product } from '../types/product';
import { isSupabaseConfigured, upsertProductsToSupabase } from './supabase';

export interface MLRawItem {
  id: string;
  title: string;
  price: number;
  original_price: number | null;
  permalink: string;
  thumbnail: string;
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
 * Converte miniaturas do Mercado Livre (-I.jpg) em imagens de alta resolução (-O.jpg)
 */
export function getHighResImageUrl(thumbnailUrl: string): string {
  if (!thumbnailUrl) return '';
  return thumbnailUrl
    .replace(/-I\.jpg$/i, '-O.jpg')
    .replace(/-I\.webp$/i, '-O.webp')
    .replace('http://', 'https://');
}

/**
 * Gera Copy Persuasiva usando a URL original do produto no Mercado Livre
 */
export function generatePersuasiveCopy(
  title: string,
  originalPrice: number,
  discountPrice: number,
  discountPercentage: number,
  originalLink: string
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

👇 CONFIRA O PRODUTO NO LINK:
${originalLink}`;
}

/**
 * Serviço Client-Side Puro: Fetch público direto na API do ML via IP do navegador
 */
export async function fetchRealMercadoLivreOffers(
  customQuery?: string
): Promise<Product[]> {
  try {
    const queryTerm = customQuery || 
      HIGH_LIQUIDITY_KEYWORDS[Math.floor(Math.random() * HIGH_LIQUIDITY_KEYWORDS.length)];

    console.log(`[ML Client-Side Fetch] Garimpando termo: "${queryTerm}"...`);

    // 1. Fetch direto da API pública do ML (sem headers de autorização)
    const mlApiUrl = `https://api.mercadolibre.com/sites/MLB/search?q=${encodeURIComponent(queryTerm)}&limit=50`;
    const response = await fetch(mlApiUrl);

    if (!response.ok) {
      throw new Error(`Erro na API do Mercado Livre (Status ${response.status})`);
    }

    const data = await response.json();
    let results: MLRawItem[] = data.results || [];

    // 2. Filtro no Front-end: Apenas itens onde price < original_price
    let discountedItems = results.filter(
      item => item.original_price && Number(item.price) < Number(item.original_price)
    );

    console.log(`[ML Client-Side Fetch] ${results.length} encontrados, ${discountedItems.length} com desconto real.`);

    // Fallback se houver poucos descontos
    if (discountedItems.length < 3 && queryTerm !== 'mop giratorio') {
      console.log('[ML Client-Side Fetch] Descontos insuficientes. Executando fallback com "mop giratorio"...');
      const fallbackRes = await fetch(`https://api.mercadolibre.com/sites/MLB/search?q=mop%20giratorio&limit=50`);
      if (fallbackRes.ok) {
        const fbData = await fallbackRes.json();
        const fbResults: MLRawItem[] = fbData.results || [];
        const fbDiscounted = fbResults.filter(
          item => item.original_price && Number(item.price) < Number(item.original_price)
        );
        discountedItems = [...discountedItems, ...fbDiscounted];
      }
    }

    if (discountedItems.length === 0) {
      console.warn('[ML Client-Side Fetch] Nenhum produto com desconto encontrado.');
      return [];
    }

    // 3. Montar a estrutura de dados no formato do banco Supabase
    const formattedForSupabase = discountedItems.map(item => {
      const originalPrice = Number(item.original_price);
      const discountPrice = Number(item.price);
      const discountPercentage = Math.round(
        ((originalPrice - discountPrice) / originalPrice) * 100
      );
      const imageUrl = getHighResImageUrl(item.thumbnail);
      const originalLink = item.permalink;
      const copyText = generatePersuasiveCopy(
        item.title,
        originalPrice,
        discountPrice,
        discountPercentage,
        originalLink
      );

      return {
        ml_id: item.id,
        title: item.title,
        original_price: originalPrice,
        discount_price: discountPrice,
        discount_percentage: discountPercentage,
        copy_text: copyText,
        affiliate_link: originalLink, // Salva o link original do produto
        category: 'Utilidades do Lar',
        image_url: imageUrl,
        status: 'pending',
        created_at: new Date().toISOString()
      };
    });

    // 4. Executar o upsert diretamente pelo Supabase Client do navegador
    if (isSupabaseConfigured()) {
      await upsertProductsToSupabase(formattedForSupabase);
    }

    // 5. Mapear para o formato do estado React do Front-end
    const mappedProducts: Product[] = formattedForSupabase.map((item, idx) => ({
      id: item.ml_id || `ml-${Date.now()}-${idx}`,
      title: item.title,
      originalPrice: item.original_price,
      discountPrice: item.discount_price,
      discountPercentage: item.discount_percentage,
      copyText: item.copy_text,
      affiliateLink: item.affiliate_link,
      category: 'Utilidades do Lar',
      imageUrl: item.image_url,
      status: 'pending',
      createdAt: item.created_at,
      rating: 4.8,
      reviewsCount: Math.floor(Math.random() * 800) + 150,
      mlId: item.ml_id
    }));

    // Ordenar do maior para o menor desconto (%)
    return mappedProducts.sort((a, b) => b.discountPercentage - a.discountPercentage);
  } catch (err) {
    console.error('[ML Client-Side Fetch Exception]:', err);
    return [];
  }
}
