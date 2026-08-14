import { createClient } from '@supabase/supabase-js';

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

// Termos de busca com alta liquidez de desconto real no Mercado Livre
const HIGH_LIQUIDITY_KEYWORDS = [
  'mop giratorio',
  'lixeira inox sensor',
  'escorredor louca inox',
  'organizador armario cozinha',
  'kit potes hermeticos'
];

/**
 * Utilitário universal para obter variáveis de ambiente no Node.js/Vercel Serverless
 */
function getEnv(key: string): string {
  if (typeof process !== 'undefined' && process.env) {
    if (process.env[key]) return process.env[key]!;
    if (key === 'VITE_SUPABASE_URL' && process.env.SUPABASE_URL) return process.env.SUPABASE_URL;
    if (key === 'VITE_SUPABASE_ANON_KEY') {
      if (process.env.SUPABASE_ANON_KEY) return process.env.SUPABASE_ANON_KEY;
      if (process.env.SUPABASE_KEY) return process.env.SUPABASE_KEY;
    }
  }
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      // @ts-ignore
      return import.meta.env[key];
    }
  } catch (e) {}
  return '';
}

// Inicializa o cliente Supabase Serverless
function getSupabaseServerClient() {
  const url = getEnv('VITE_SUPABASE_URL');
  const key = getEnv('VITE_SUPABASE_ANON_KEY');

  if (!url || !key || url === 'https://your-project-id.supabase.co') {
    console.warn('[Server Supabase Warning] Credenciais VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY ausentes em process.env.');
    return null;
  }

  return createClient(url, key);
}

/**
 * 1. Autenticação Oficial OAuth 2.0 com Mercado Livre Developers (Client Credentials)
 */
async function getMercadoLivreAccessToken(): Promise<string | null> {
  const appId = getEnv('ML_APP_ID') || getEnv('VITE_ML_APP_ID');
  const clientSecret = getEnv('ML_CLIENT_SECRET') || getEnv('VITE_ML_CLIENT_SECRET');

  if (!appId || !clientSecret) {
    console.warn('[ML OAuth Warning] ML_APP_ID ou ML_CLIENT_SECRET não configurados nas variáveis da Vercel. Tentando requisição não autenticada...');
    return null;
  }

  try {
    console.log('[ML OAuth] Solicitando access_token oficial em https://api.mercadolibre.com/oauth/token...');
    
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', appId);
    params.append('client_secret', clientSecret);

    const tokenResponse = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: params.toString()
    });

    if (!tokenResponse.ok) {
      const errBody = await tokenResponse.text();
      console.error(`[ML OAuth Error] Falha na autenticação (Status ${tokenResponse.status}): ${errBody}`);
      return null;
    }

    const tokenData = await tokenResponse.json();
    if (tokenData.access_token) {
      console.log('[ML OAuth] ✅ Token obtido com sucesso!');
      return tokenData.access_token;
    } else {
      console.error('[ML OAuth Error] Resposta sem access_token:', tokenData);
      return null;
    }
  } catch (oauthErr: any) {
    console.error('[ML OAuth Exception] Exceção ao obter token:', oauthErr.message || oauthErr);
    return null;
  }
}

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
 * Lógica principal da Rota de API do Servidor (OAuth Token + ML Search + Supabase Upsert)
 */
export async function handleSearchMLOffers(requestedQuery?: string) {
  const queryTerm = requestedQuery || 
    HIGH_LIQUIDITY_KEYWORDS[Math.floor(Math.random() * HIGH_LIQUIDITY_KEYWORDS.length)];

  console.log(`[Search ML API] Iniciando busca com termo: "${queryTerm}"...`);

  // 1. Obter Access Token Oficial do Mercado Livre
  const accessToken = await getMercadoLivreAccessToken();

  let discountedItems: MLRawItem[] = [];
  let rawResults: MLRawItem[] = [];

  // 2. GET em https://api.mercadolibre.com/sites/MLB/search com Authorization Header
  try {
    const mlApiUrl = `https://api.mercadolibre.com/sites/MLB/search?q=${encodeURIComponent(queryTerm)}&limit=50`;
    const headers: Record<string, string> = {
      'Accept': 'application/json'
    };

    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    console.log(`[Search ML API] Fetching ${mlApiUrl} com ${accessToken ? 'Authorization: Bearer <token>' : 'sem token'}...`);
    const response = await fetch(mlApiUrl, { headers });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[ML API HTTP Error] Status ${response.status}: ${errText}`);
      throw new Error(`Falha na API do Mercado Livre (Status ${response.status})`);
    }

    const data = await response.json();
    rawResults = data.results || [];

    // Filtrar apenas itens com desconto real (original_price && price < original_price)
    discountedItems = rawResults.filter(
      item => item.original_price && Number(item.price) < Number(item.original_price)
    );

    console.log(`[Search ML API] "${queryTerm}": ${rawResults.length} itens encontrados, ${discountedItems.length} com desconto real.`);

    // Fallback com 'mop giratorio' se houver poucos descontos
    if (discountedItems.length < 3 && queryTerm !== 'mop giratorio') {
      console.log('[Search ML API] Descontos insuficientes. Executando fallback com "mop giratorio"...');
      const fallbackUrl = `https://api.mercadolibre.com/sites/MLB/search?q=mop%20giratorio&limit=50`;
      const fbRes = await fetch(fallbackUrl, { headers });
      if (fbRes.ok) {
        const fbData = await fbRes.json();
        const fbResults: MLRawItem[] = fbData.results || [];
        const fbDiscounted = fbResults.filter(
          item => item.original_price && Number(item.price) < Number(item.original_price)
        );
        discountedItems = [...discountedItems, ...fbDiscounted];
      }
    }
  } catch (mlErr: any) {
    console.error('[ML Fetch Exception] Erro crítico ao conectar na API do Mercado Livre:', mlErr.message || mlErr);
    return {
      success: false,
      error: `Erro de comunicação com a API do Mercado Livre: ${mlErr.message}`
    };
  }

  if (discountedItems.length === 0) {
    console.warn('[Search ML API] Nenhum item com desconto real encontrado.');
    return {
      success: true,
      query_used: queryTerm,
      total_found: rawResults.length,
      discounted_count: 0,
      authenticated: Boolean(accessToken),
      products: []
    };
  }

  // 3. Mapeamento de dados sem fakes
  const formattedProducts = discountedItems.map(item => {
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
      affiliate_link: originalLink, // Salva a URL original
      category: 'Utilidades do Lar',
      image_url: imageUrl,
      status: 'pending',
      created_at: new Date().toISOString()
    };
  });

  // Ordenar do maior para o menor desconto (%)
  formattedProducts.sort((a, b) => b.discount_percentage - a.discount_percentage);

  // 4. Upsert no Supabase usando o cliente Serverless
  const supabaseServer = getSupabaseServerClient();
  let supabaseUpsertSuccess = false;
  let supabaseErrorMsg = null;

  if (supabaseServer) {
    try {
      console.log(`[Supabase Server] Executando upsert de ${formattedProducts.length} produtos na tabela "products"...`);
      const { error } = await supabaseServer
        .from('products')
        .upsert(formattedProducts, { onConflict: 'ml_id' });

      if (error) {
        supabaseErrorMsg = error.message;
        console.error('[Supabase Upsert Error] Falha ao gravar no banco:', error.message, error.details, error.code);
      } else {
        supabaseUpsertSuccess = true;
        console.log('[Supabase Server] ✅ Upsert concluído com sucesso!');
      }
    } catch (sbErr: any) {
      supabaseErrorMsg = sbErr.message;
      console.error('[Supabase Upsert Exception] Exceção ao gravar no banco:', sbErr);
    }
  }

  return {
    success: true,
    query_used: queryTerm,
    authenticated: Boolean(accessToken),
    total_found: rawResults.length,
    discounted_count: formattedProducts.length,
    supabase_persisted: supabaseUpsertSuccess,
    supabase_error: supabaseErrorMsg,
    products: formattedProducts
  };
}

// Handler HTTP Serverless para Vercel Functions
export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    let query = '';
    if (req.query && req.query.q) {
      query = req.query.q;
    } else if (req.body) {
      if (typeof req.body === 'string') {
        try {
          const parsed = JSON.parse(req.body);
          query = parsed.q || '';
        } catch (e) {}
      } else if (typeof req.body === 'object') {
        query = req.body.q || '';
      }
    }

    const result = await handleSearchMLOffers(query);
    return res.status(200).json(result);
  } catch (err: any) {
    console.error('[API Route Handler Crash]:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Erro interno na Rota de API'
    });
  }
}
