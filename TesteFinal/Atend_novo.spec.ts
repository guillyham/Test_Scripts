import { test, expect, Locator, Page, Frame} from '@playwright/test';
import { randomSelect, randomSelect2, login, validateFields, waitForAjax } from '../lib/utils';

async function acessarCadastro(page) {
  await page.getByText('x', { exact: true }).click();
  await page.locator('img').first().click();
  await page.getByRole('link', { name: 'Empresa' }).click();
  await page.getByRole('link', { name: 'Clientes' }).click();
  await page.locator('#item_13').click();
}

async function novoAtendimentoClientesCad(page, menu){
    await waitForAjax(page);
    const atdNovoBtn =  menu.locator('#id_sc_field_btnatendnovo_1').first();
    await expect(atdNovoBtn).toBeVisible();
    await atdNovoBtn.click();
    await waitForAjax(page);
}


async function novoAtendimentoForm(page, menu){
    
}












test('Abertura de atendimentos', async ({ page, context }) => {
  // Gera o cache dos itens do inspetor.
    const menu = page.frameLocator('iframe[name="app_menu_iframe"]');
    const item5 = menu.frameLocator('iframe[name="item_5"]');
    const tb = item5.frameLocator('iframe[name^="TB_iframeContent"]');

    test.setTimeout(20000);

    await login(page);

    await acessarCadastro(page);

    await novoAtendimentoClientesCad(page, menu);

    await novoAtendimentoForm(page, menu);
});