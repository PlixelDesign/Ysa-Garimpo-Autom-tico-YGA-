/**
 * YGA — Worker de Garimpo do Mercado Livre
 *
 * Raspa a busca do ML filtrando por desconto e grava no Supabase (tabela "products").
 * Execução local: node garimpo-worker.js   (lê o .env da raiz)
 * No GitHub Actions: .github/workflows/garimpo.yml
 *
 * Requer o schema de supabase/schema.sql aplicado no banco.
 */

import fs from 'fs';
import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { createClient } from '@supabase/supabase-js';

chromium.use(StealthPlugin());

try {
  process.loadEnvFile('.env');
} catch {
  // Sem .env local: usa só as variáveis de ambiente (caso do GitHub Actions)
}

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Faltam SUPABASE_URL e SUPABASE_KEY (ou VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY no .env).');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Termo de busca → categoria exibida no painel
const QUERIES = [
  { q: 'mop giratorio', category: 'Utilidades do Lar' },
  { q: 'lixeira cozinha', category: 'Utilidades do Lar' },
  { q: 'organizador guarda roupa', category: 'Utilidades do Lar' },
  { q: 'escorredor louça', category: 'Utilidades do Lar' },
  { q: 'dispenser sabao liquido', category: 'Utilidades do Lar' },
  { q: 'potes hermeticos', category: 'Utilidades do Lar' },
  { q: 'luminaria led decorativa', category: 'Decoração' },
  { q: 'tapete sala', category: 'Decoração' },
  { q: 'fone bluetooth', category: 'Tecnologia' },
  { q: 'robo aspirador', category: 'Tecnologia' }
];
const DESCONTO_MINIMO = 15;
const SESSION_FILE = './ml-session.json';

// A sessão é opcional: a busca do ML é pública. Um arquivo vazio/corrompido não pode derrubar o garimpo.
function loadSessionState() {
  try {
    const raw = fs.readFileSync(SESSION_FILE, 'utf8').trim();
    if (!raw) return undefined;
    JSON.parse(raw);
    return SESSION_FILE;
  } catch {
    return undefined;
  }
}

async function garimpar(browser, { q, category }) {
  const context = await browser.newContext({
    storageState: loadSessionState(),
    locale: 'pt-BR',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36'
  });

  try {
    const page = await context.newPage();
    const slug = q.trim().replace(/\s+/g, '-');

    // 'networkidle' nunca acontece no ML (analytics contínuo) e estourava o timeout
    await page.goto(`https://lista.mercadolivre.com.br/${encodeURI(slug)}_Discount_1-100`, {
      waitUntil: 'domcontentloaded',
      timeout: 45000
    });
    await page.waitForSelector('.poly-card', { timeout: 20000 });

    // Rola a página para o lazy-load trocar os placeholders pelas imagens reais
    for (let i = 0; i < 6; i++) {
      await page.mouse.wheel(0, 1500);
      await page.waitForTimeout(400);
    }

    const produtos = await page.evaluate((descontoMin) => {
      const parsePrice = (container) => {
        if (!container) return null;
        const fraction = container.querySelector('.andes-money-amount__fraction')?.textContent || '';
        const cents = container.querySelector('.andes-money-amount__cents')?.textContent || '00';
        const value = parseFloat(`${fraction.replace(/\D/g, '')}.${cents.replace(/\D/g, '') || '00'}`);
        return Number.isFinite(value) && value > 0 ? value : null;
      };

      const resultado = [];

      document.querySelectorAll('.poly-card').forEach(card => {
        const titleEl = card.querySelector('.poly-component__title');
        const titulo = titleEl?.textContent?.trim();
        const href = titleEl?.href || card.querySelector('a[href]')?.href;

        // Ignora anúncios pagos (mclics), que não têm ID de produto no link
        if (!titulo || !href || href.includes('mclics')) return;

        const mlIdMatch = href.match(/MLB-?(\d+)/i);
        if (!mlIdMatch) return;

        const img = card.querySelector('img.poly-component__picture') || card.querySelector('img');
        const imgSrc = [img?.getAttribute('data-src'), img?.getAttribute('src')]
          .find(src => src && !src.startsWith('data:'));

        const preco = parsePrice(card.querySelector('.poly-price__current'));
        const original = parsePrice(card.querySelector('.andes-money-amount--previous'));
        if (!preco || !original || original <= preco) return;

        const desconto = Math.round(((original - preco) / original) * 100);
        if (desconto < descontoMin) return;

        const rating = parseFloat(card.querySelector('.poly-reviews__rating')?.textContent?.replace(',', '.') || '');
        const reviews = parseInt(card.querySelector('.poly-reviews__total')?.textContent?.replace(/\D/g, '') || '', 10);

        const url = new URL(href);
        url.search = '';
        url.hash = '';

        resultado.push({
          mlId: `MLB${mlIdMatch[1]}`,
          titulo,
          preco,
          original,
          desconto,
          link: url.toString(),
          thumbnail: imgSrc || '',
          rating: Number.isFinite(rating) ? rating : null,
          reviews: Number.isFinite(reviews) ? reviews : null
        });
      });

      return resultado;
    }, DESCONTO_MINIMO);

    return produtos.map(p => ({ ...p, category }));
  } finally {
    await context.close();
  }
}

async function salvar(produtos) {
  // Um mesmo produto pode aparecer em várias buscas
  const porId = new Map();
  for (const p of produtos) {
    if (!porId.has(p.mlId)) porId.set(p.mlId, p);
  }
  const unicos = [...porId.values()];

  const { data: existentes, error: selectError } = await supabase
    .from('products')
    .select('ml_id')
    .in('ml_id', unicos.map(p => p.mlId));

  if (selectError) throw new Error(`Falha ao consultar produtos existentes: ${selectError.message}`);

  const idsExistentes = new Set((existentes || []).map(r => r.ml_id));

  const camposDePreco = p => ({
    ml_id: p.mlId,
    title: p.titulo,
    original_price: p.original,
    discount_price: p.preco,
    discount_percentage: p.desconto,
    original_link: p.link,
    ...(p.thumbnail ? { image_url: p.thumbnail } : {}),
    rating: p.rating,
    reviews_count: p.reviews
  });

  // Novos: entram no Radar. copy_text vazio = o painel gera a copy com o preço atual.
  const novos = unicos
    .filter(p => !idsExistentes.has(p.mlId))
    .map(p => ({
      ...camposDePreco(p),
      affiliate_link: p.link,
      image_url: p.thumbnail,
      copy_text: '',
      category: p.category,
      status: 'pending',
      created_at: new Date().toISOString()
    }));

  // Já existentes: atualiza só preço/imagem, preservando status, copy editada e link de afiliado da Ysa
  const atualizados = unicos.filter(p => idsExistentes.has(p.mlId)).map(camposDePreco);

  if (novos.length > 0) {
    const { error } = await supabase.from('products').insert(novos);
    if (error) throw new Error(`Falha ao inserir novos produtos: ${error.message}`);
  }

  // Update linha a linha: um upsert parcial violaria as colunas NOT NULL omitidas
  const resultados = await Promise.all(
    atualizados.map(({ ml_id, ...campos }) =>
      supabase.from('products').update(campos).eq('ml_id', ml_id)
    )
  );
  const erroUpdate = resultados.find(r => r.error)?.error;
  if (erroUpdate) throw new Error(`Falha ao atualizar preços: ${erroUpdate.message}`);

  console.log(`✅ Supabase: ${novos.length} novos, ${atualizados.length} com preço atualizado`);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  let todos = [];
  let falhas = 0;

  try {
    for (const query of QUERIES) {
      try {
        const resultado = await garimpar(browser, query);
        console.log(`[${query.q}] → ${resultado.length} produtos com ≥${DESCONTO_MINIMO}% de desconto`);
        todos = todos.concat(resultado);
      } catch (err) {
        falhas++;
        console.error(`Erro em "${query.q}":`, err.message);
      }
    }
  } finally {
    await browser.close();
  }

  if (todos.length === 0) {
    console.error(
      falhas === QUERIES.length
        ? '❌ Todas as buscas falharam (bloqueio do ML ou seletores mudaram). Se persistir, renove a sessão: node garimpo-login.js'
        : '⚠️ Nenhum produto com desconto suficiente encontrado.'
    );
    process.exit(falhas === QUERIES.length ? 1 : 0);
  }

  await salvar(todos);
}

main().catch(err => {
  console.error('❌', err.message);
  process.exit(1);
});
