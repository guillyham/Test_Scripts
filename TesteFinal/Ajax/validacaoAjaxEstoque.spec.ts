import { test, expect, Page, Locator, FrameLocator } from '@playwright/test';
import { randomSelect, login, waitForAjax, validateFields, robustRandomSelect2 } from '../../lib/utils';

/*
Fluxo do teste:
1 - acessa dados gerais > estoque
2 - valida ajax da aba estoque mudando os campos e validando os valores
*/

async function acessarDadosGerais(page: Page, menu: FrameLocator) {
  await page.getByText('x', { exact: true }).click();
  await page.locator('img').first().click();
  await page.getByRole('link', { name: 'Empresa' }).click();
  await page.getByRole('link', { name: 'Parâmetros' }).click();
  await page.getByRole('link', { name: 'Dados Gerais' }).click();
  await menu.locator('#id_cad_empresa_form2').click();
}

async function validacaoAjaxEstoque(page: Page, menu: FrameLocator) {
  await expect(menu.locator('#id_label_retequip_atendtipo')).toBeVisible();

  const tipoAtdOpt = menu.locator('input[type="radio"][name="retequip_atendtipo"]');
  await expect(tipoAtdOpt.first()).toBeVisible();

  const checkedRadio = menu.locator('input[type="radio"][name="retequip_atendtipo"]:checked');
  await expect(checkedRadio).toBeVisible();
  const campoAtdVlrOri = await checkedRadio.getAttribute('value');

  //Coleta valor original dos campos
  const topfluxVlrOri = (await menu.locator('#select2-id_sc_field_retequip_topflux-container').textContent())?.trim() ?? '';
  const fluxItemVlrOri = (await menu.locator('#select2-id_sc_field_retequip_fluxitem-container').textContent())?.trim() ?? '';
  const designarAtdOri = await menu.locator('#id_sc_field_retequip_designar').inputValue();
  const designarAlvoOri = (await menu.locator('#select2-id_sc_field_retequip_designaralvo-container').textContent())?.trim() ?? '';

  const altered = [] as Array<{ name: string; locator: Locator }>;

  const isInvalidText = (s: string) => {
    const v = (s ?? '').trim().toLowerCase();
    return v === '' || v === 'selecione' || v === '(selecione)' || v === 'padrão';
  };

  await waitForAjax(page);

  if (campoAtdVlrOri === 'T') {
    // Quando for Fluxo
    await menu.locator('input[name="retequip_atendtipo"][value="F"]').check();
    await waitForAjax(page);
    await expect(menu.locator('#id_label_retequip_fluxitem')).toBeVisible();

    // Selecionador do fluxo
    const topFluxCtr = menu.locator('[aria-labelledby="select2-id_sc_field_retequip_topflux-container"]');
    await robustRandomSelect2(menu, '[aria-labelledby="select2-id_sc_field_retequip_topflux-container"]', ['padrão']);
    await waitForAjax(page);
    const topfluxVlrNovo = (await topFluxCtr.textContent())?.trim() ?? '';
    if (isInvalidText(topfluxVlrNovo)) throw new Error(`TopFlux inválido: "${topfluxVlrNovo}"`);
    if (topfluxVlrNovo !== topfluxVlrOri) altered.push({ name: 'topflux', locator: topFluxCtr });

    // Selecionador do fluxo item
    const fluxCtr = menu.locator('[aria-labelledby="select2-id_sc_field_retequip_fluxitem-container"]');
    await robustRandomSelect2(menu, '[aria-labelledby="select2-id_sc_field_retequip_fluxitem-container"]', ['Selecione']);
    await waitForAjax(page);
    const fluxItemVlrNovo = (await fluxCtr.textContent())?.trim() ?? '';
    if (isInvalidText(fluxItemVlrNovo)) throw new Error(`Fluxo inválido: "${fluxItemVlrNovo}"`);
    if (fluxItemVlrNovo !== fluxItemVlrOri) altered.push({ name: 'fluxitem', locator: fluxCtr });

  } else {
    // Quando for Topico
    await menu.locator('input[name="retequip_atendtipo"][value="T"]').check();
    await waitForAjax(page);

    // Selecionador do Topico
    const topFluxCtr = menu.locator('[aria-labelledby="select2-id_sc_field_retequip_topflux-container"]');
    await robustRandomSelect2(menu, '[aria-labelledby="select2-id_sc_field_retequip_topflux-container"]', ['Selecione']);
    await waitForAjax(page);
    const topfluxVlrNovo = (await topFluxCtr.textContent())?.trim() ?? '';
    if (isInvalidText(topfluxVlrNovo)) throw new Error(`TopFlux inválido: "${topfluxVlrNovo}"`);
    if (topfluxVlrNovo !== topfluxVlrOri) altered.push({ name: 'topflux', locator: topFluxCtr });
  }

  // Campo designar atendimento (usa select padrão, não muda)
  await randomSelect(menu, '#id_sc_field_retequip_designar', ['N']);
  await waitForAjax(page);
  const designarAtdNew = await menu.locator('#id_sc_field_retequip_designar').inputValue();
  if (!designarAtdNew || designarAtdNew === 'N') throw new Error(`DesignarAtd inválido: "${designarAtdNew}"`);
  if (designarAtdNew !== designarAtdOri) altered.push({ name: 'designarAtd', locator: menu.locator('#id_sc_field_retequip_designar') });

  // Designar alvo 
  const designarAlvoCtr = menu.locator('[aria-labelledby="select2-id_sc_field_retequip_designaralvo-container"]');
  await robustRandomSelect2(menu, '[aria-labelledby="select2-id_sc_field_retequip_designaralvo-container"]', ['selecione', 'padrão']);
  await waitForAjax(page);
  const designarAlvoNew = (await designarAlvoCtr.textContent())?.trim() ?? '';
  if (isInvalidText(designarAlvoNew)) throw new Error(`DesignarAlvo inválido: "${designarAlvoNew}"`);
  if (designarAlvoNew !== designarAlvoOri) altered.push({ name: 'designarAlvo', locator: designarAlvoCtr });

  // Validação final (antes de salvar)
  for (const { locator } of altered) {
    await validateFields(locator);
  }
  await menu.locator('#sc_b_upd_t').click();
  await waitForAjax(page);
}

test('Testar Ajax Estoque', async ({ page }) => {
  const menu = page.frameLocator('iframe[name="app_menu_iframe"]');

  test.setTimeout(60_000);

  await login(page);

  await acessarDadosGerais(page, menu);

  await validacaoAjaxEstoque(page, menu);
});