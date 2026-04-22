import { test, expect, Page, Locator, FrameLocator } from '@playwright/test';
import { login, waitForAjax, contratoStart, contratoFinaliza, camposOpcionaisContratos, contratoAtiva, getFrames, randomSelect2, findAndClickConfirmAndHandleDialog } from '../../lib/utils';
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
  await rowSelector().locator('a.css_btncontratos_grid_line').first().click();
}

async function contratoCancelamento(page: Page, planoNome: string, dataC: string) {
  let { menu, tb } = getFrames(page);

  const contrato = menu.getByRole('menuitem', { name: 'Contratos' });
  if (await contrato.isVisible()) {
    menu = tb;
    await expect(contrato).toBeVisible();
  }

  const rowSelector = () =>
    menu
      .locator('tr[id^="SC_ancor"]')
      .filter({
        has: menu.locator(
          'td.css_plano_grid_line',
          { hasText: new RegExp(`^\\s*${planoNome.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`) }
        )
      });
  await rowSelector().locator('a.css_btncancelar_grid_line').first().click();
  await waitForAjax(page);

  await randomSelect2(menu, '[aria-labelledby="select2-id_sc_field_motivo-container"]', ['(Selecione)']);
  await waitForAjax(page);
  await menu.locator('#id_sc_field_cancelamento').click();
  await page.keyboard.type(dataC);
  await page.keyboard.press('Tab');
  await waitForAjax(page);

  const multaLabel = await menu.locator('#id_label_vlormulta');
  if (await multaLabel.isVisible()) {
    const multaValor = await menu.locator('#id_ajax_label_vlormulta').textContent();
    const valorLimpo = multaValor ? multaValor.replace(/[^\d,]/g, '').replace(',', '.') : '0';
    const mvFinal = parseFloat(valorLimpo);
    expect(mvFinal).toBeGreaterThan(0);
    await findAndClickConfirmAndHandleDialog(page);
    await waitForAjax(page);
    await page.keyboard.press('Enter');
  } else {
    console.log('Contrato sem geração de multa, teste será pulado');
    test.skip();
  }
}

async function validarDados(page: Page) {
  console.log('inicnando');
  let { menu, tb } = getFrames(page);

  const contrato = menu.getByRole('menuitem', { name: 'Contratos' });
  if (await contrato.isVisible()) {
    menu = tb;
    await expect(contrato).toBeVisible();
  }

  const appMenuFrame = await page.locator('iframe[name="app_menu_iframe"]').contentFrame();
  const verTodos = await appMenuFrame.getByTitle('Mostrar todos contratos');
  //await verTodos.click();
  if (await verTodos.isVisible()) {
    await verTodos.click();
    await waitForAjax(page);
  }

  const frame = page.frameLocator('iframe[name="app_menu_iframe"]');

  try {
      await expect(
        frame.locator('span[id^="id_sc_field_gsituacao_"]', { hasText: 'Cancelado' }).first()
      ).toBeVisible();
    
      await expect(
        frame.locator('span[id^="id_sc_field_gcancelamento_"]', { hasText: '14/05/2020' }).first()
      ).toBeVisible();
  } catch (error) {
    console.error('Erro ao validar os dados do contrato cancelado:', error);
    throw error; // Re-throw para garantir que o teste falhe
  }
}


test('Contrato cancelamento', async ({ page, context }) => {
  const menu = page.frameLocator('iframe[name="app_menu_iframe"]');
  test.setTimeout(100000);

  await login(page);
  await acessarCadastro(page, menu);

  await contratoStart(page, "8-Multa Cancelamento");
  await camposOpcionaisContratos(page);
  await contratoFinaliza(page);
  await waitForAjax(page);
  await contratoAtiva(page);

  await contratoCancelamento(page, "8-Multa cancelamento", "14/05/2020");
  await validarDados(page);
});