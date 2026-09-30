import { test, expect, Page, Locator, FrameLocator } from '@playwright/test';
import { randomSelect, login, waitForAjax, validateFields, retryUntil } from '../../lib/utils';

/*
FLuxo do teste:
  1 - Acessar o sistema
  2 - Acessar o menu Empresa > Clientes > Planos  
  3 - Aacessar um dos planos
  4 - Na aba terceiros configurar os campos e validar ajax
*/

async function acessarPlanos(page: Page, menu: FrameLocator) {
  await page.getByText('x', { exact: true }).click();
  await page.locator('img').first().click();
  await page.getByRole('link', { name: 'Empresa' }).click();
  await page.getByRole('link', { name: 'Clientes' }).click();
  await page.getByRole('link', { name: 'Planos' }).click();
  await expect(page.locator('#item_11')).toBeVisible({ timeout: 10000 });
  await page.locator('#item_11').click();
}

async function validacaoAjaxPlanos(page: Page, menu: FrameLocator) {
  type ChangedField = { name: 'cobrPTerceiro' | 'cobrDTerceiro'; locator: Locator };
  const altered: ChangedField[] = [];

  await waitForAjax(page);
  await expect(menu.getByText('Cadastro de Planos')).toBeVisible();

  const allEditButtons = menu.locator('a#bedit');
  const count = await allEditButtons.count();
  if (count === 0) {
    throw new Error("No plans found to edit. Cannot proceed with the test.");
  }
  const randomIndex = Math.floor(Math.random() * count);
  const chosenEditButton = allEditButtons.nth(randomIndex);
  await expect(chosenEditButton).toBeVisible({ timeout: 10000 });
  await chosenEditButton.click();
  await waitForAjax(page);

  const cadastroForm4 = menu.locator('#id_cad_planos_cadastro_form4');
  await expect(cadastroForm4).toBeVisible({ timeout: 10000 });
  await cadastroForm4.click();
  await waitForAjax(page);

  const cobrancaPTerceiro = menu.locator('#id_sc_field_cobrpt');
  await expect(cobrancaPTerceiro).toBeVisible({ timeout: 10000 });
  const cobrancaDTerceiro = menu.locator('#id_sc_field_cobrdt');
  await expect(cobrancaDTerceiro).toBeVisible({ timeout: 10000 });

  // originais (valor do option selecionado)
  const cobrancaPTerceiroOri = await cobrancaPTerceiro.inputValue();
  const cobrancaDTerceiroOri = await cobrancaDTerceiro.inputValue();

  //cobrança por terceiros
  const cobrancaPTerceiroSelector = await randomSelect(menu, '#id_sc_field_cobrpt');
  await waitForAjax(page);
  await expect(cobrancaPTerceiro).toHaveValue(cobrancaPTerceiroSelector);
  await validateFields(cobrancaPTerceiro);

  const cobrancaPTerceiroNew = await cobrancaPTerceiro.inputValue();
  if (cobrancaPTerceiroNew && cobrancaPTerceiroNew !== cobrancaPTerceiroOri) {
    altered.push({ name: 'cobrPTerceiro', locator: cobrancaPTerceiro });
    await waitForAjax(page, 500);

    await randomSelect(menu, '#id_sc_field_cobrptp');
    await waitForAjax(page);
    const cobrPtercSecondSelector = await menu.locator('#id_sc_field_cobrptp').inputValue();
    if (cobrPtercSecondSelector === 'S') {
      await waitForAjax(page);
      const icon = menu.locator('.icon_fa.fas.fa-forward').first();
      await expect(icon).toBeVisible();
      await icon.click();
      await waitForAjax(page);

      await randomSelect(menu, '#id_sc_field_ptcon', ['(Selecione um Terceiro para inicializar os contratos deste plano)']);
      await randomSelect(menu, '#id_sc_field_ptpac', ['(Selecione um Terceiro para inicializar os pacotes que contém este plano)']);
      await waitForAjax(page);

      await menu.locator('#sc_b_upd_t').click();
    }
    else {
      await randomSelect(menu, '#id_sc_field_ptcon', ['(Selecione um Terceiro para inicializar os contratos deste plano)']);
      await randomSelect(menu, '#id_sc_field_ptpac', ['(Selecione um Terceiro para inicializar os pacotes que contém este plano)']);
      await waitForAjax(page);

      await menu.locator('#sc_b_upd_t').click();
    }
  }
  else {
    const sel = menu.locator('#id_sc_field_cobrpt');
    await sel.selectOption({ index: 0 });
    await waitForAjax(page);
    const firstLabel = (await sel.locator('option').nth(0).textContent())?.trim() ?? '';
    await expect(sel.locator('option:checked')).toHaveText(firstLabel);
    await menu.locator('#sc_b_upd_t').click();
  }
  await waitForAjax(page);

  //cobrança de Terceiro 
  const dPickedVal = await randomSelect(menu, '#id_sc_field_cobrdt');
  await waitForAjax(page);
  await expect(cobrancaDTerceiro).toHaveValue(dPickedVal);
  await validateFields(cobrancaDTerceiro);

  const dNewVal = await cobrancaDTerceiro.inputValue();
  if (dNewVal && dNewVal !== cobrancaDTerceiroOri) {
    altered.push({ name: 'cobrDTerceiro', locator: cobrancaDTerceiro });

    const cobrDtercSecondSelector = await randomSelect(menu, '#id_sc_field_cobrdtp');
    await expect(menu.locator('#id_sc_field_cobrdtp')).toHaveValue(cobrDtercSecondSelector);
    await waitForAjax(page);

    if (cobrDtercSecondSelector === 'S') {
      await waitForAjax(page);
      const icon = menu.locator('.Bbpassfld_rightall').first();
      await expect(icon).toBeVisible();
      await icon.click();
      await waitForAjax(page);

      await randomSelect(menu, '#id_sc_field_dtcon', ['(Selecione um Terceiro para inicializar os contratos deste plano)']);
      await randomSelect(menu, '#id_sc_field_dtpac', ['(Selecione um Terceiro para inicializar os pacotes que contém este plano)']);
      await waitForAjax(page);
      await expect(menu.locator('#sc_b_upd_t')).toBeVisible({ timeout: 10000 });
      await menu.locator('#sc_b_upd_t').click();
    }
    else {
      await waitForAjax(page);
      await randomSelect(menu, '#id_sc_field_dtcon', ['(Selecione um Terceiro para inicializar os contratos deste plano)']);
      await randomSelect(menu, '#id_sc_field_dtpac', ['(Selecione um Terceiro para inicializar os pacotes que contém este plano)']);
      await waitForAjax(page);
      await expect(menu.locator('#sc_b_upd_t')).toBeVisible({ timeout: 10000 });
      await menu.locator('#sc_b_upd_t').click();
    }
  }
  else {
    const sel = menu.locator('#id_sc_field_cobrdt');
    await sel.selectOption({ index: 0 });
    await waitForAjax(page);
    const firstLabel = (await sel.locator('option').nth(0).textContent())?.trim() ?? '';
    await expect(sel.locator('option:checked')).toHaveText(firstLabel);
    await menu.locator('#sc_b_upd_t').click();

  }
  for (const { locator } of altered) {
    await validateFields(locator);
  }
}

test('Testar Ajax Planos', async ({ page }) => {
  // Gera o cache dos itens do inspetor.
  const menu = page.frameLocator('iframe[name="app_menu_iframe"]');
  const item5 = menu.frameLocator('iframe[name="item_5"]');
  const tb = item5.frameLocator('iframe[name^="TB_iframeContent"]');

  test.setTimeout(80000);

  await login(page);
  await acessarPlanos(page, menu);
  await validacaoAjaxPlanos(page, menu);
});