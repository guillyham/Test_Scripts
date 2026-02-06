import { defineConfig, devices } from '@playwright/test';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

export default defineConfig({
  retries: 5,
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
    { name: 'Blank', testMatch: ['**/blank.spec.ts'] },
    //teste da base: teste final
    { name: 'Ajax_Estoque', testMatch: ['**/TesteFinal/Ajax/validacaoAjaxEstoque.spec.ts'] },
    { name: 'Ajax_Pedidos', testMatch: ['**/TesteFinal/Ajax/validacaoAjaxPedidos.spec.ts'] },
    { name: 'Ajax_Planos', testMatch: ['**/TesteFinal/Ajax/validacaoAjaxPlanos.spec.ts'] },
    { name: 'Ajax_Cancelamento', testMatch: ['**/TesteFinal/Ajax/validacaoAjaxCancelarContrato.spec.ts'] },
    { name: 'Cad_Cliente', testMatch: ['**/Cad_cliente.spec.ts'], use: { headless: false, launchOptions: { slowMo: 200 } } },
    { name: 'Cad-Planos', testMatch: ['**/Cad_Planos.spec.ts'] },
    { name: 'Atend_Novo', testMatch: ['**/Atend_novo.spec.ts'] },
    { name: 'Faturamento', testMatch: ['**/Faturamento.spec.ts'] },

    // teste da base: deb12
    { name: 'Cad-Cliente-deb12', testMatch: ['**/Deb12/ClienteCadastro.spec.ts'], use: { headless: false, launchOptions: { slowMo: 200 } } },
  ],
});
