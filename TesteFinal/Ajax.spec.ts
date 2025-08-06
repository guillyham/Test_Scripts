import { test, expect, Locator, Page, Frame} from '@playwright/test';

import { seletorRandomSelct, seletorRandomSelct2, login, validaCampoPreenchidos } from '../lib/utils';

async function acessarDadosGerais(page) {
  await page.getByText('x', { exact: true }).click();
  await page.locator('img').first().click();
  await page.getByRole('link', { name: 'Empresa' }).click();
  await page.getByRole('link', { name: 'Dados Gerais' }).click();

}



test('Testar Ajax', async ({ page, context }) => {
  // Gera o cache dos itens do inspetor.
  const menu = page.frameLocator('iframe[name="app_menu_iframe"]');
  const item5 = menu.frameLocator('iframe[name="item_5"]');
  const tb = item5.frameLocator('iframe[name^="TB_iframeContent"]');

  test.setTimeout(70000);

  await login(page);

  await acessarDadosGerais(page);
});