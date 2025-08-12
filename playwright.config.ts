// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    //define o navegador padrão
    browserName: 'chromium',
    ...devices['Desktop Chrome'], 
    trace: 'on-first-retry',
  },
  projects: [
    //teste da base: teste final
    { name: '01-Ajax-Estoque',  testMatch: ['**/TesteFinal/Ajax/validacaoAjaxEstoque.spec.ts'] },
    { name: '02-Ajax-Pedidos',  testMatch: ['**/TesteFinal/Ajax/validacaoAjaxPedidos.spec.ts'], dependencies: ['01-Ajax-Estoque'] },
    { name: '03-Cad-Cliente',   testMatch: ['**/Cad_cliente.spec.ts'], dependencies: ['02-Ajax-Pedidos'], use: { headless: false, launchOptions: { slowMo: 200 } } },
    { name: '04-Cad-Planos',    testMatch: ['**/Cad_Planos.spec.ts'], dependencies: ['03-Cad-Cliente'] },

    // teste da base: deb12
    { name: '05-Cad-Cliente-deb12',  testMatch: ['**/deb12/ClienteCadastro.spec.ts'], dependencies: ['04-Cad-Planos'], use: { headless: false, launchOptions: { slowMo: 200 } } },
  ],
});
