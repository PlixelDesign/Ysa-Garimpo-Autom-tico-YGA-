/**
 * YGA — Login e Captura de Sessão do Mercado Livre
 *
 * Abre um Chrome isolado (não conflita com seu Chrome pessoal aberto).
 * Você só faz o login uma vez.
 *
 * Execução: node garimpo-login.js
 */

import path from 'path';
import { chromium } from 'playwright';
import * as readline from 'readline';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const waitEnter = () => new Promise(resolve => {
  rl.question('', () => { rl.close(); resolve(); });
});

(async () => {
  console.log('\n════════════════════════════════════════════');
  console.log('  🔐  YGA LOGIN — Sessão do Mercado Livre');
  console.log('════════════════════════════════════════════\n');
  console.log('📌 Abrindo janela dedicada do Chrome...');
  console.log('💡 DICA: Você NÃO precisa fechar seu Chrome pessoal!\n');

  // Usa uma pasta de perfil própria do projeto para NUNCA conflitar com seu Chrome pessoal
  const projectProfileDir = path.resolve(process.cwd(), '.ml-profile');

  const context = await chromium.launchPersistentContext(projectProfileDir, {
    channel: 'chrome',
    headless: false,
    args: [
      '--start-maximized',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-blink-features=AutomationControlled'
    ]
  });

  const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();

  console.log('🌐 Abrindo Mercado Livre...');
  await page.goto('https://www.mercadolivre.com.br/', { waitUntil: 'domcontentloaded' });

  console.log('\n👉 Na janela do Chrome que abriu:');
  console.log('   1. Faça o login na sua conta do Mercado Livre');
  console.log('   2. Quando a página inicial carregar com você logado...');
  console.log('   3. Volte aqui neste terminal e pressione ENTER.\n');

  await waitEnter();

  // Salva os cookies e sessão para uso no worker e no GitHub Actions
  await context.storageState({ path: './ml-session.json' });

  console.log('\n✅ Sessão capturada com sucesso em: ./ml-session.json');
  console.log('🚀 Agora você pode rodar: node garimpo-worker.js\n');

  await context.close();
  process.exit(0);
})();
