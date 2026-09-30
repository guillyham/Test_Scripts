import { test, expect, Page, Locator, FrameLocator } from '@playwright/test';
import { randomSelect, login, waitForAjax, validateFields, robustRandomSelect2 } from '../../lib/utils';

/*
Fluxo do teste:
1 - acessa dados gerais > estoque
2 - valida ajax da aba estoque mudando os campos e validando os valores
*/

const isInvalidText = (s: string) => {
  const v = (s ?? '').trim().toLowerCase();
  return v === '' || v === 'selecione' || v === '(selecione)' || v === 'padrão';
};

async function selectAndTrack(
  menu: FrameLocator,
  page: Page,
  ariaId: string,
  excludes: string[],
  name: string,
  originalValue: string,
  errorLabel: string,
  altered: Array<{ name: string; locator: Locator }>
): Promise<void> {
  const selector = `[aria-labelledby="${ariaId}"]`;
  const ctr = menu.locator(selector);
  await robustRandomSelect2(menu, page, selector, excludes);
  await waitForAjax(page);
  const newValue = (await ctr.textContent())?.trim() ?? '';
  if (isInvalidText(newValue)) throw new Error(`${errorLabel} inválido: "${newValue}"`);
  if (newValue !== originalValue) altered.push({ name, locator: ctr });
}

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

  const topfluxVlrOri = (await menu.locator('#select2-id_sc_field_retequip_topflux-container').textContent())?.trim() ?? '';
  const fluxItemVlrOri = (await menu.locator('#select2-id_sc_field_retequip_fluxitem-container').textContent())?.trim() ?? '';
  const designarAtdOri = await menu.locator('#id_sc_field_retequip_designar').inputValue();
  const designarAlvoOri = (await menu.locator('#select2-id_sc_field_retequip_designaralvo-container').textContent())?.trim() ?? '';

  const altered = [] as Array<{ name: string; locator: Locator }>;

  await waitForAjax(page);

  if (campoAtdVlrOri === 'T') {
    // Quando for Fluxo
    await menu.locator('input[name="retequip_atendtipo"][value="F"]').check();
    await waitForAjax(page);
    await expect(menu.locator('#id_label_retequip_fluxitem')).toBeVisible();

    await selectAndTrack(menu, page, 'select2-id_sc_field_retequip_topflux-container', ['(Selecione)'], 'topflux', topfluxVlrOri, 'TopFlux', altered);
    await selectAndTrack(menu, page, 'select2-id_sc_field_retequip_fluxitem-container', ['Selecione'], 'fluxitem', fluxItemVlrOri, 'Fluxo', altered);
  } else {
    // Quando for Topico
    await menu.locator('input[name="retequip_atendtipo"][value="T"]').check();
    await waitForAjax(page);

    await selectAndTrack(menu, page, 'select2-id_sc_field_retequip_topflux-container', ['Selecione'], 'topflux', topfluxVlrOri, 'TopFlux', altered);
  }

  // Campo designar atendimento (usa select padrão, não muda)
  await randomSelect(menu, '#id_sc_field_retequip_designar', ['N']);
  await waitForAjax(page);
  const designarAtdNew = await menu.locator('#id_sc_field_retequip_designar').inputValue();
  if (!designarAtdNew || designarAtdNew === 'N') throw new Error(`DesignarAtd inválido: "${designarAtdNew}"`);
  if (designarAtdNew !== designarAtdOri) altered.push({ name: 'designarAtd', locator: menu.locator('#id_sc_field_retequip_designar') });

  await selectAndTrack(menu, page, 'select2-id_sc_field_retequip_designaralvo-container', ['(selecione)', 'padrão'], 'designarAlvo', designarAlvoOri, 'DesignarAlvo', altered);

  for (const { locator } of altered) {
    await validateFields(locator);
  }
  await menu.locator('#sc_b_upd_t').click();
  await waitForAjax(page);

  //validação extra para o designar atendimento campo grupo/usuario
  
}

test('Testar Ajax Estoque', async ({ page }) => {
  const menu = page.frameLocator('iframe[name="app_menu_iframe"]');

  test.setTimeout(60000);

  await login(page);

  await acessarDadosGerais(page, menu);

  await validacaoAjaxEstoque(page, menu);
});