/**
 * Ysa Garimpo Automático (YGA) — Worker Local com Apify
 *
 * Execução: node garimpo-worker.js
 *
 * Requisitos no .env:
 *   APIFY_TOKEN=apify_api_xxxxxxxxxxxxxxxxxxxx
 *   VITE_SUPABASE_URL=https://seu-projeto.supabase.co
 *   VITE_SUPABASE_ANON_KEY=sua-chave-anon-aqui
 */

import fs from 'fs';
import path from 'path';
import { ApifyClient } from 'apify-client';
import { createClient } from '@supabase/supabase-js';

// ─────────────────────────────────────────────
// 1. CARREGA .env LOCAL
// ─────────────────────────────────────────────
function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const [key, ...rest] = trimmed.split('=');
    const val = rest.join('=').trim().replace(/^["']|["']$/g, '');
    if (key && !process.env[key.trim()]) process.env[key.trim()] = val;
  }
}

loadEnv();

// ─────────────────────────────────────────────
// 2. VALIDA VARIÁVEIS DE AMBIENTE
// ─────────────────────────────────────────────
const APIFY_TOKEN     = process.env.APIFY_TOKEN || '';
const SUPABASE_URL    = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_KEY    = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

const missingVars = [];
if (!APIFY_TOKEN)                          missingVars.push('APIFY_TOKEN');
if (!SUPABASE_URL || SUPABASE_URL.includes('your-project-id')) missingVars.push('VITE_SUPABASE_URL');
if (!SUPABASE_KEY)                         missingVars.push('VITE_SUPABASE_ANON_KEY');

if (missingVars.length > 0) {
  console.error('\n❌ ERRO: Variáveis de ambiente ausentes no arquivo .env:');
  missingVars.forEach(v => console.error(`   • ${v}`));
  console.error('\nCrie ou complete o arquivo .env na raiz do projeto e tente novamente.\n');
  process.exit(1);
}

// ─────────────────────────────────────────────
// 3. CONFIGURAÇÃO DO GARIMPO
// ─────────────────────────────────────────────
// Actor do Mercado Livre Brasil na Apify Store.
// Página pública: https://apify.com/karamelo/mercadolivre-scraper-brasil-portugues
const APIFY_ACTOR_ID = 'karamelo/mercadolivre-scraper-brasil-portugues';

// Termos de busca com alta taxa de descontos reais
const SEARCH_KEYWORDS = [
  'mop giratorio',
  'lixeira inox sensor',
  'escorredor louca inox',
  'organizador armario cozinha',
  'kit potes hermeticos'
];

// ─────────────────────────────────────────────
// 4. HELPERS
// ─────────────────────────────────────────────
function getHighResImageUrl(url = '') {
  return url
    .replace(/-I\.jpg$/i, '-O.jpg')
    .replace(/-I\.webp$/i, '-O.webp')
    .replace(/^http:\/\//i, 'https://');
}

function formatBRL(val) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
}

function generateCopy(title, originalPrice, discountPrice, discountPct, link) {
  return `🔥 ACHADO INCRÍVEL DO MERCADO LIVRE!\n${title}\n\n✨ Destaques do Garimpo:\n• Produto campeão de vendas e altamente avaliado\n• Qualidade garantida com preço de oportunidade no ML\n• Entrega rápida e compra 100% segura\n\n❌ De ${formatBRL(originalPrice)}\n✅ Por apenas ${formatBRL(discountPrice)} (-${discountPct}% OFF) 🚨\n\n👇 CONFIRA O PRODUTO:\n${link}`;
}

// ─────────────────────────────────────────────
// 5. MAIN
// ─────────────────────────────────────────────
async function runGarimpoWorker() {
  console.log('\n════════════════════════════════════════════════');
  console.log('  🚀  YGA WORKER — Garimpo via Apify + Supabase');
  console.log('════════════════════════════════════════════════\n');

  const apify    = new ApifyClient({ token: APIFY_TOKEN });
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  const allProducts = [];

  for (const keyword of SEARCH_KEYWORDS) {
    console.log(`🔍  Garimpando: "${keyword}"...`);

    try {
      // Dispara o Actor e aguarda conclusão
      const run = await apify.actor(APIFY_ACTOR_ID).call({
        keyword,       // termo de busca
        maxPages: 1    // 1 página = ~50 produtos
      });

      // Lê os itens do dataset gerado
      const { items } = await apify.dataset(run.defaultDatasetId).listItems();

      // Filtra apenas ofertas com desconto real
      const discounted = items.filter(item => {
        const price    = Number(item.price         ?? item.currentPrice ?? 0);
        const original = Number(item.originalPrice ?? item.priceBeforeDiscount ?? 0);
        return original > 0 && price > 0 && price < original;
      });

      console.log(`   ➜ ${items.length} produtos retornados, ${discounted.length} com desconto real aprovado.`);

      for (const item of discounted) {
        const price    = Number(item.price         ?? item.currentPrice);
        const original = Number(item.originalPrice ?? item.priceBeforeDiscount);
        const pct      = Math.round(((original - price) / original) * 100);
        const image    = getHighResImageUrl(item.imageUrl ?? item.thumbnail ?? '');
        const link     = item.url ?? item.permalink ?? '';
        const title    = item.title ?? item.name ?? 'Produto sem título';

        allProducts.push({
          ml_id:               item.id ?? item.mlId ?? `apify-${Date.now()}-${Math.random()}`,
          title,
          original_price:      original,
          discount_price:      price,
          discount_percentage: pct,
          copy_text:           generateCopy(title, original, price, pct, link),
          affiliate_link:      link,
          category:            'Utilidades do Lar',
          image_url:           image,
          status:              'pending',
          created_at:          new Date().toISOString()
        });
      }
    } catch (err) {
      console.error(`   ❌ Erro ao processar "${keyword}":`, err.message);
    }
  }

  // Deduplica por ml_id
  const uniqueMap = new Map();
  allProducts.forEach(p => uniqueMap.set(p.ml_id, p));
  const finalList = Array.from(uniqueMap.values());

  if (finalList.length === 0) {
    console.warn('\n⚠️  Nenhuma oferta com desconto real encontrada. Nada foi gravado.\n');
    return;
  }

  // Ordena por maior desconto para exibição no log
  finalList.sort((a, b) => b.discount_percentage - a.discount_percentage);

  console.log(`\n💾  Gravando ${finalList.length} ofertas no Supabase...`);

  const { error } = await supabase
    .from('products')
    .upsert(finalList, { onConflict: 'ml_id' });

  if (error) {
    console.error('\n❌  ERRO no upsert do Supabase:', error.message, error.details ?? '');
    return;
  }

  console.log('\n════════════════════════════════════════════════');
  console.log('  ✅  GARIMPO CONCLUÍDO COM SUCESSO!');
  console.log(`  • Ofertas garimpadas e gravadas: ${finalList.length}`);
  console.log(`  • Top desconto: ${finalList[0].title.slice(0, 50)}... (${finalList[0].discount_percentage}% OFF)`);
  console.log('  • Abra o painel e clique em "🔄 Atualizar Tela" para ver os cards.');
  console.log('════════════════════════════════════════════════\n');
}

runGarimpoWorker();
