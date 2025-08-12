// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '././tests',
  fullyParallel: false, // comentário: evita paralelismo dentro do arquivo
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    browserName: 'chromium',       // comentário: define o navegador padrão
    ...devices['Desktop Chrome'],  // comentário: viewport/UA padrão
    trace: 'on-first-retry',
  },
  projects: [
    { name: '01-Ajax-Estoque',  testMatch: ['**/TesteFinal/Ajax/validacaoAjaxEstoque.spec.ts'] },
    { name: '02-Ajax-Pedidos',  testMatch: ['**/TesteFinal/Ajax/validacaoAjaxPedidos.spec.ts'], dependencies: ['01-Ajax-Estoque'] },
    { name: '03-Cad-Cliente',   testMatch: ['**/Cad_cliente.spec.ts'], dependencies: ['02-Ajax-Pedidos'], use: { headless: false, launchOptions: { slowMo: 200 } } }, // comentário: headed
    { name: '04-Cad-Planos',    testMatch: ['**/Cad_Planos.spec.ts'], dependencies: ['03-Cad-Cliente'] },
    { name: '05-Cad-Produtos',  testMatch: ['**/deb12/ClienteCadastro.spec.ts'], dependencies: ['04-Cad-Planos'], use: { headless: false, launchOptions: { slowMo: 200 } } }, // comentário: headed} 
  ],
});
