/**
 * Ysa Garimpo Automático (YGA) — Worker com Network Interception
 *
 * GRATUITO. Usa Playwright + sessão ML + interceptação de rede.
 * Funciona local ou no GitHub Actions (xvfb fornece display virtual).
 *
 * Local:          node garimpo-worker.js
 * GitHub Actions: automático via .github/workflows/garimpo.yml
 *
 * .env necessário:
 *   VITE_SUPABASE_URL=...
 *   VITE_SUPABASE_ANON_KEY=...
 */

import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

// ─────────────────────────────────────────────
// 1. CARREGA .env
// ─────────────────────────────────────────────
function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const [key, ...rest] = trimmed.split('=');
    const val = rest.join('=').trim().replace(/^["']|["']$/g, '');
    if (key && !process.env[key.trim()]) process.env[key.trim()] = val;
  }
}
loadEnv();

// ─────────────────────────────────────────────
// 2. VALIDA CONFIG
// ─────────────────────────────────────────────
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || '';
const SESSION_PATH = path.resolve(process.cwd(), 'ml-session.json');

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('\n❌ Faltam variáveis: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY\n');
  process.exit(1);
}
if (!fs.existsSync(SESSION_PATH)) {
  console.error('\n❌ Sessão não encontrada. Execute primeiro: node garimpo-login.js\n');
  process.exit(1);
}

// ─────────────────────────────────────────────
// 3. CONFIGURAÇÃO
// ─────────────────────────────────────────────
const DESCONTO_MINIMO = 15;

// Rotação diária — 1 keyword/dia para economizar recursos
const KEYWORDS = [
  'mop giratorio',
  'lixeira inox sensor',
  'escorredor louca inox',
  'organizador armario cozinha',
  'kit potes hermeticos',
  'dispenser sabao liquido',
  'suporte papel toalha inox'
];

// Aceita keyword forçada via argumento: node garimpo-worker.js "mop giratorio"
const forcedKeyword = process.argv[2];
const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
const todayKeyword = forcedKeyword || KEYWORDS[dayOfYear % KEYWORDS.length];

// ─────────────────────────────────────────────
// 4. HELPERS
// ─────────────────────────────────────────────
function formatBRL(val) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
}

function generateCopy(title, original, discount, pct, link) {
  return [
    '🔥 ACHADO INCRÍVEL DO MERCADO LIVRE!',
    title,
    '',
    '✨ Destaques do Garimpo:',
    '• Produto campeão de vendas e altamente avaliado',
    '• Qualidade garantida com preço de oportunidade no ML',
    '• Entrega rápida e compra 100% segura',
    '',
    `❌ De ${formatBRL(original)}`,
    `✅ Por apenas ${formatBRL(discount)} (-${pct}% OFF) 🚨`,
    '',
    '👇 CONFIRA O PRODUTO:',
    link
  ].join('\n');
}

function getHighRes(url = '') {
  return url.replace(/-I\.jpg$/i, '-O.jpg').replace(/-I\.webp$/i, '-O.webp').replace(/^http:\/\//i, 'https://');
}

// ─────────────────────────────────────────────
// 5. GARIMPO COM NETWORK INTERCEPTION
// ─────────────────────────────────────────────
async function garimparKeyword(context, keyword) {
  const page = await context.newPage();
  const produtos = [];

  // Intercepta ANTES de navegar — captura o JSON que o frontend do ML busca
  page.on('response', async (response) => {
    const url    = response.url();
    const status = response.status();
    if (status !== 200) return;

    // Qualquer endpoint JSON do domínio mercadolibre
    const isMlApi = url.includes('api.mercadolibre.com') || url.includes('api.mercadolivre.com');
    if (!isMlApi) return;

    const ct = response.headers()['content-type'] || '';
    if (!ct.includes('json')) return;

    try {
      const data = await response.json();
      const results = data?.results ?? [];
      if (!results.length) return;

      for (const item of results) {
        const original = item.original_price;
        const atual    = item.price;
        if (!original || original <= atual) continue;

        const pct = Math.round(((original - atual) / original) * 100);
        if (pct < DESCONTO_MINIMO) continue;

        produtos.push({
          ml_id:               item.id,
          title:               item.title,
          original_price:      original,
          discount_price:      atual,
          discount_percentage: pct,
          copy_text:           generateCopy(item.title, original, atual, pct, item.permalink),
          affiliate_link:      item.permalink,
          category:            'Utilidades do Lar',
          image_url:           getHighRes(item.thumbnail),
          status:              'pending',
          created_at:          new Date().toISOString()
        });
      }
    } catch (_) {}
  });

  // URL correta do ML Brasil (lista.mercadolivre.com.br)
  const slug = keyword.replace(/\s+/g, '-');
  const url  = `https://lista.mercadolivre.com.br/${slug}`;

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
    // Aguarda chamadas tardias
    await page.waitForTimeout(2000);
  } catch (e) {
    // networkidle timeout é comum em SPAs — continua normalmente
    if (!e.message.includes('Timeout')) throw e;
  }

  await page.close();
  return produtos;
}

// ─────────────────────────────────────────────
// 6. MAIN
// ─────────────────────────────────────────────
async function runGarimpoWorker() {
  console.log('\n══════════════════════════════════════════════════');
  console.log('  🚀  YGA WORKER — Network Interception');
  console.log('══════════════════════════════════════════════════');
  console.log(`  📅  Keyword: "${todayKeyword}"`);
  console.log('══════════════════════════════════════════════════\n');

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // Em CI (GitHub Actions), roda headful com xvfb. Local, headless.
  const isCI = !!process.env.CI;

  const browser = await chromium.launch({
    headless: !isCI, // headless local, headful no CI com xvfb
    args: [
      '--no-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-infobars',
      '--lang=pt-BR',
      ...(isCI ? ['--disable-gpu', '--disable-dev-shm-usage'] : [])
    ]
  });

  const context = await browser.newContext({
    storageState: SESSION_PATH,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    viewport:    { width: 1366, height: 768 },
    locale:      'pt-BR',
    timezoneId:  'America/Sao_Paulo',
    extraHTTPHeaders: { 'Accept-Language': 'pt-BR,pt;q=0.9' }
  });

  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    if (!window.chrome) window.chrome = { runtime: {} };
    Object.defineProperty(navigator, 'languages', { get: () => ['pt-BR', 'pt', 'en'] });
  });

  console.log(`🍪 Sessão ML carregada${isCI ? ' (GitHub Actions)' : ' (local)'}\n`);
  console.log(`🔍 Garimpando: "${todayKeyword}"...`);

  let found = [];
  try {
    found = await garimparKeyword(context, todayKeyword);
  } catch (err) {
    console.error(`\n❌ Erro: ${err.message}`);
    await browser.close();
    process.exit(1);
  }

  await browser.close();

  console.log(`   ➜ ${found.length} com desconto ≥${DESCONTO_MINIMO}% aprovado.`);

  if (found.length === 0) {
    console.warn('\n⚠️  Nenhuma oferta interceptada.');
    console.warn('   Se isso persistir, renove a sessão: node garimpo-login.js\n');
    process.exit(0);
  }

  // Deduplica e ordena
  const uniqueMap = new Map();
  found.forEach(p => uniqueMap.set(p.ml_id, p));
  const finalList = Array.from(uniqueMap.values())
    .sort((a, b) => b.discount_percentage - a.discount_percentage);

  console.log(`\n💾 Gravando ${finalList.length} ofertas no Supabase...`);

  const { error } = await supabase
    .from('products')
    .upsert(finalList, { onConflict: 'ml_id' });

  if (error) {
    console.error('\n❌ ERRO Supabase:', error.message, error.details ?? '');
    process.exit(1);
  }

  console.log('\n══════════════════════════════════════════════════');
  console.log('  ✅  GARIMPO CONCLUÍDO!');
  console.log(`  • Ofertas gravadas: ${finalList.length}`);
  console.log(`  • 🏆 Top: ${finalList[0].title.slice(0, 50)}...`);
  console.log(`  • 🔥 Desconto: ${finalList[0].discount_percentage}% OFF`);
  console.log('══════════════════════════════════════════════════\n');
}

runGarimpoWorker();
