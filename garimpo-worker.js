import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { createClient } from '@supabase/supabase-js';

chromium.use(StealthPlugin());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const QUERIES = [
  'mop giratorio',
  'lixeira cozinha',
  'organizador guarda roupa',
  'escorredor louça',
  'dispenser sabao liquido'
];
const DESCONTO_MINIMO = 15;

async function garimpar(query) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: './ml-session.json',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36'
  });

  const page = await context.newPage();
  const slug = query.trim().replace(/\s+/g, '-');

  await page.goto(
    `https://lista.mercadolivre.com.br/${slug}_Discount_1-100`,
    { waitUntil: 'networkidle', timeout: 30000 }
  );

  const produtos = await page.evaluate((descontoMin) => {
    const cards = document.querySelectorAll('.poly-card');
    const resultado = [];

    cards.forEach(card => {
      // Seletores corretos extraídos do HTML real
      const titulo = card.querySelector('.poly-component__title')?.textContent?.trim();
      const link = card.querySelector('.poly-component__title')?.href;
      const thumb = card.querySelector('.poly-component__picture')?.src;

      const precoEl = card.querySelector('.poly-price__current .andes-money-amount__fraction');
      const originalEl = card.querySelector('.andes-money-amount--previous .andes-money-amount__fraction');

      const preco = precoEl
        ? parseFloat(precoEl.textContent.replace(/\./g, '').replace(',', '.'))
        : null;
      const original = originalEl
        ? parseFloat(originalEl.textContent.replace(/\./g, '').replace(',', '.'))
        : null;

      if (!preco || !original || original <= preco) return;

      const desconto = Math.round(((original - preco) / original) * 100);
      if (desconto < descontoMin) return;

      // Ignora anúncios pagos (mclics)
      if (!link || link.includes('mclics')) return;

      resultado.push({ titulo, preco, original, desconto, link, thumbnail: thumb });
    });

    return resultado;
  }, DESCONTO_MINIMO);

  await browser.close();
  return produtos;
}

async function main() {
  let todos = [];

  for (const q of QUERIES) {
    try {
      const resultado = await garimpar(q);
      console.log(`[${q}] → ${resultado.length} produtos com ≥${DESCONTO_MINIMO}% de desconto`);
      todos = todos.concat(resultado);
    } catch (err) {
      console.error(`Erro em "${q}":`, err.message);
    }
  }

  if (todos.length === 0) {
    console.log('⚠️ Nenhum produto encontrado. Renova a sessão: node garimpo-login.js');
    return;
  }

  const registros = todos.map(p => ({
    title: p.titulo,
    original_price: p.original,
    discount_price: p.preco,
    discount_percentage: p.desconto,
    affiliate_link: p.link,
    image_url: p.thumbnail,
    status: 'pending',
    created_at: new Date().toISOString()
  }));

  const { error } = await supabase.from('products').upsert(registros, {
    onConflict: 'affiliate_link',
    ignoreDuplicates: true
  });

  if (error) console.error('Supabase error:', error);
  else console.log(`✅ ${registros.length} produtos enviados ao Supabase`);
}

main();