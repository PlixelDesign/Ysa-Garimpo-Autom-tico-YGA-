/**
 * Ysa Garimpo Automático (YGA) - Worker Local de Extração & Garimpo
 * 
 * Execução: node garimpo-worker.js
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Carregador simples de arquivo .env local
function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [key, ...valueParts] = trimmed.split('=');
        const val = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
        if (key && !process.env[key.trim()]) {
          process.env[key.trim()] = val;
        }
      }
    });
  }
}

loadEnv();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || '';

const isConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('your-project-id')
);

const KEYWORDS = [
  'mop giratorio',
  'lixeira inox sensor',
  'escorredor louca inox',
  'organizador armario cozinha',
  'kit potes hermeticos'
];

function getHighResImageUrl(thumbnailUrl) {
  if (!thumbnailUrl) return '';
  return thumbnailUrl
    .replace(/-I\.jpg$/i, '-O.jpg')
    .replace(/-I\.webp$/i, '-O.webp')
    .replace('http://', 'https://');
}

function generatePersuasiveCopy(title, originalPrice, discountPrice, discountPercentage, originalLink) {
  const formatBRL = (val) =>
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

async function runGarimpoWorker() {
  console.log('\n==================================================');
  console.log('🚀 INICIANDO WORKER LOCAL DE GARIMPO (YGA)');
  console.log('==================================================');

  if (!isConfigured) {
    console.warn('\n⚠️ ATENÇÃO: Credenciais do Supabase não encontradas no arquivo .env!');
    console.warn('   Crie o arquivo .env na raiz do projeto com:');
    console.warn('   VITE_SUPABASE_URL=https://seu-projeto.supabase.co');
    console.warn('   VITE_SUPABASE_ANON_KEY=sua-chave-anon-aqui\n');
    console.warn('   Executando varredura no terminal...\n');
  }

  let totalItemsFound = 0;
  let allFormattedProducts = [];

  for (const queryTerm of KEYWORDS) {
    try {
      console.log(`🔍 Buscando na API pública do Mercado Livre: "${queryTerm}"...`);
      const mlApiUrl = `https://api.mercadolibre.com/sites/MLB/search?q=${encodeURIComponent(queryTerm)}&limit=50`;
      
      const response = await fetch(mlApiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        console.error(`⚠️ Erro ao consultar "${queryTerm}": Status HTTP ${response.status}`);
        continue;
      }

      const data = await response.json();
      const results = data.results || [];
      totalItemsFound += results.length;

      // Filtro de Desconto Real (price < original_price)
      const discountedItems = results.filter(
        item => item.original_price && Number(item.price) < Number(item.original_price)
      );

      console.log(`   ➜ ${results.length} produtos analisados, ${discountedItems.length} com desconto real aprovado.`);

      const formatted = discountedItems.map(item => {
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
          affiliate_link: originalLink,
          category: 'Utilidades do Lar',
          image_url: imageUrl,
          status: 'pending',
          created_at: new Date().toISOString()
        };
      });

      allFormattedProducts.push(...formatted);
    } catch (err) {
      console.error(`❌ Erro ao processar "${queryTerm}":`, err.message);
    }
  }

  if (allFormattedProducts.length === 0) {
    console.warn('\n⚠️ Nenhuma oferta com desconto real encontrada nesta rodada.');
    return;
  }

  // Eliminar duplicatas por ml_id
  const uniqueProductsMap = new Map();
  allFormattedProducts.forEach(p => uniqueProductsMap.set(p.ml_id, p));
  const finalProducts = Array.from(uniqueProductsMap.values());

  console.log(`\n✅ Garimpo concluído! ${finalProducts.length} ofertas exclusivas com desconto encontradas.`);

  if (isConfigured) {
    console.log(`💾 Persistindo ${finalProducts.length} ofertas no Supabase...`);
    try {
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      const { error } = await supabase
        .from('products')
        .upsert(finalProducts, { onConflict: 'ml_id' });

      if (error) {
        console.error('❌ ERRO AO GRAVAR NO SUPABASE:', error.message, error.details);
      } else {
        console.log('\n==================================================');
        console.log('🎉 BANCO SUPABASE ATUALIZADO COM SUCESSO!');
        console.log(`• Total de itens analisados: ${totalItemsFound}`);
        console.log(`• Ofertas gravadas: ${finalProducts.length}`);
        console.log('==================================================\n');
      }
    } catch (sbErr) {
      console.error('❌ EXCEÇÃO SUPABASE:', sbErr.message);
    }
  } else {
    console.log('\nExemplo da primeira oferta garimpada:');
    console.log(JSON.stringify(finalProducts[0], null, 2));
    console.log('\n💡 Para gravar no Supabase real, configure seu .env e execute novamente `node garimpo-worker.js`!\n');
  }
}

runGarimpoWorker();
