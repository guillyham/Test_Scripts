import { test, expect, Page, Locator, FrameLocator } from '@playwright/test';
import { randomSelect, login, waitForAjax, validateFields, retryUntil } from '../../lib/utils';

/*
FLuxo do teste:
  1 - Acessar o sistema
  2 - Acessar o menu Empresa > cobrador virutal
  3 - Aacessar uma regra/criar uma regra
  4 - Testar os campos de select e criação de regra
*/

async function acessarPlanos(page: Page, menu: FrameLocator) {
  await page.getByText('x', { exact: true }).click();
  await page.locator('img').first().click();
  await page.getByRole('link', { name: 'Empresa' }).click();
  await page.getByRole('link', { name: 'Cobrador Virtual' }).click();
  await expect(page.locator('#item_11')).toBeVisible({ timeout: 10000 });
  await page.locator('#item_11').click();
}

async function validacaoAjaxCobrV(page: Page, menu: FrameLocator) {



}

test('Testar Ajax Planos', async ({ page }) => {
  // Gera o cache dos itens do inspetor.
  const menu = page.frameLocator('iframe[name="app_menu_iframe"]');
  test.setTimeout(80000);

  await login(page);
  await acessarPlanos(page, menu);
  await validacaoAjaxCobrV(page, menu);
});