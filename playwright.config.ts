import { defineConfig, devices } from '@playwright/test';
import path from 'path';

const ROOT = path.resolve(__dirname, '..'); 

export default defineConfig({
  testDir: '.',
  outputDir: path.join(ROOT, 'test-results'), 
  reporter: [
    ['html', { outputFolder: path.join(ROOT, 'reports/html'), open: 'never' }], 
  ],
  use: {
    browserName: 'chromium',
    ...devices['Desktop Chrome'],
    //trace: 'on',
    //screenshot: 'on',
    //video: 'retain-on-failure',
  },

  projects: [
    //teste da base: teste final
    { name: '01-Ajax-Estoque',  testMatch: ['**/TesteFinal/Ajax/validacaoAjaxEstoque.spec.ts'] },
    { name: '02-Ajax-Pedidos',  testMatch: ['**/TesteFinal/Ajax/validacaoAjaxPedidos.spec.ts'], dependencies: ['01-Ajax-Estoque']   },
    { name: '03-Cad-Cliente',   testMatch: ['**/Cad_cliente.spec.ts'], dependencies: ['02-Ajax-Pedidos'], use: { headless: false, launchOptions: { slowMo: 200 } } },
    { name: '04-Cad-Planos',    testMatch: ['**/Cad_Planos.spec.ts'], dependencies: ['03-Cad-Cliente'] },

    // teste da base: deb12
    { name: '05-Cad-Cliente-deb12',  testMatch: ['**/Deb12/ClienteCadastro.spec.ts'], use: { headless: false, launchOptions: { slowMo: 200 } } },
  ],
});
