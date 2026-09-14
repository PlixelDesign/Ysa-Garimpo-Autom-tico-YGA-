/**
 * YGA — Salva Sessão do ML (roda UMA VEZ ou quando a sessão expirar)
 *
 * Execução: node garimpo-login.js
 *
 * Abre um Chrome VISÍVEL. Faça login no ML.
 * Pressione ENTER no terminal quando estiver logado.
 * A sessão é salva em ml-session.json.
 */

import { chromium } from 'playwright';
import * as readline from 'readline';

const SESSION_PATH = './ml-session.json';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const waitEnter = () => new Promise(resolve => {
  rl.question('', () => { rl.close(); resolve(); });
});

(async () => {
  console.log('\n════════════════════════════════════════════');
  console.log('  🔐  YGA LOGIN — Salvar Sessão do ML');
  console.log('════════════════════════════════════════════\n');
  console.log('📌 Um Chrome VISÍVEL vai abrir agora.');
  console.log('   1. Faça login normalmente no Mercado Livre');
  console.log('   2. Quando a página principal carregar, volte aqui');
  console.log('   3. Pressione ENTER para salvar a sessão\n');

  const browser = await chromium.launch({
    headless: false,
    args: ['--start-maximized', '--lang=pt-BR']
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    viewport: null,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo'
  });

  const page = await context.newPage();
  await page.goto('https://www.mercadolivre.com.br/', { waitUntil: 'domcontentloaded' });

  console.log('⏳ Faça login no browser aberto e pressione ENTER aqui quando terminar...\n');
  await waitEnter();

  await context.storageState({ path: SESSION_PATH });

  console.log(`\n✅ Sessão salva em: ${SESSION_PATH}`);
  console.log('🚀 Agora rode: node garimpo-worker.js\n');

  await browser.close();
})();
