import { test, expect, Page, Locator, FrameLocator } from '@playwright/test';
import { login, waitForAjax, contratoStart, contratoFinaliza, camposOpcionaisContratos, contratoAtiva } from '../../lib/utils';

import fs from 'fs';

async function acessarCadastro(page: Page, menu: FrameLocator) {
  await page.getByText('x', { exact: true }).click();
  await page.locator('img').first().click();
  await page.getByRole('link', { name: 'Empresa' }).click();
  await page.getByRole('link', { name: 'Clientes' }).click();
  await page.getByRole('link', { name: 'Cadastro' }).click();

  // Preenche o campo de busca com o código do cliente que retorna do json criado no cadastro de cliente
  const { clienteCodigo } = JSON.parse(fs.readFileSync('customerContext.json', 'utf-8'));
  await menu.locator('#SC_fast_search_top').fill(clienteCodigo);
  await waitForAjax(page);
  await page.keyboard.press('Enter');

  const rowSelector = () =>
    menu
      .locator('tr[id^="SC_ancor"]')
      .filter({
        has: menu.locator(
          'td.css_codigo_grid_line',
          { hasText: new RegExp(`^\\s*${clienteCodigo}\\s*$`) }
        )
      });
  //acessa o cadstro
  await rowSelector().locator('a.css_btneditar_grid_line').first().click();
}

async function gerarCliente(newPage: Page) {
  await newPage.goto('https://www.4devs.com.br/gerador_de_pessoas', { waitUntil: 'domcontentloaded' });
  await newPage.getByRole('button', { name: 'Gerar Pessoa' }).click();
}

async function contratoAcao(page: Page, menu: FrameLocator){

}

test('Contrato cancelamento', async ({ page, context }) => {
  const menu = page.frameLocator('iframe[name="app_menu_iframe"]');
  test.setTimeout(100000);

  await login(page);
  const newPage = await context.newPage();
  await gerarCliente(newPage);
  await page.bringToFront();
  await acessarCadastro(page, menu);

  await contratoStart(page, "8-Multa Cancelamento")
  await camposOpcionaisContratos(page, newPage);
  await contratoFinaliza (page);
  await contratoAtiva(page);

  await contratoAcao(page, menu);
});