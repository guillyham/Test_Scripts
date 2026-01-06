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
    { name: '00-Blank',         testMatch: ['**/blank.spec.ts']},
    //teste da base: teste final
    { name: '01-Ajax-Estoque',  testMatch: ['**/TesteFinal/Ajax/validacaoAjaxEstoque.spec.ts']},
    { name: '02-Ajax-Pedidos',  testMatch: ['**/TesteFinal/Ajax/validacaoAjaxPedidos.spec.ts']},
    { name: '03-Ajax-Planos',   testMatch: ['**/TesteFinal/Ajax/validacaoAjaxPlanos.spec.ts']},
    { name: '04-Cad-Cliente',   testMatch: ['**/Cad_cliente.spec.ts'], use: { headless: false, launchOptions: { slowMo: 200 } } },
    { name: '05-Cad-Planos',    testMatch: ['**/Cad_Planos.spec.ts']},
    { name: '06-Atend_novo',    testMatch: ['**/Atend_novo.spec.ts']},

    // teste da base: deb12
    { name: '01-Cad-Cliente-deb12',  testMatch: ['**/Deb12/ClienteCadastro.spec.ts'], use: { headless: false, launchOptions: { slowMo: 200 } } },
  ],
});
