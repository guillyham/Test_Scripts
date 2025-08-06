import { test, expect, Page, FrameLocator } from '@playwright/test';
import { randomSelect2, login, validateFields } from '../lib/utils';

async function acessarDadosGerais(page: Page, menu: FrameLocator) {
  await page.getByText('x', { exact: true }).click();
  await page.locator('img').first().click();
  await page.getByRole('link', { name: 'Empresa' }).click();
  await page.getByRole('link', { name: 'Parâmetros' }).click();
  await page.getByRole('link', { name: 'Dados Gerais' }).click();
  await menu.locator('#id_cad_empresa_form2').click();
}

async function validacaoAjax(page: Page, menu: FrameLocator) {
  await expect(page.locator('#id_label_retequip_atendtipo')).toBeVisible();

  // Get original radio value
  const checkedRadio = page.locator('input[type="radio"][name="retequip_atendtipo"]:checked');
  await expect(checkedRadio).toBeVisible();
  const originalValue = await checkedRadio.getAttribute('value');

  // Get original Select2 display text
  const topfluxText = await page.locator('#select2-id_sc_field_retequip_topflux-container').textContent();
  const topfluxOriginal = topfluxText?.trim();

  // Change radio selection
  const alternateRadio = page.locator('#id-opt-retequip_atendtipo-2');
  await alternateRadio.click();

  const newCheckedRadio = page.locator('input[type="radio"][name="retequip_atendtipo"]:checked');
  await expect(newCheckedRadio).toBeVisible();
  const newValue = await newCheckedRadio.getAttribute('value');

  // Ensure value actually changed
  expect(newValue).not.toBe(originalValue);

  // If it changed to 'F', continue with Select2
  if (newValue === 'F') {
    // Wait for dependent Fluxo field to become visible
    await page.locator('#id_label_retequip_fluxitem').waitFor({ state: 'visible' });

    // Handle 'Fluxo' Select2
    const fluxoTrigger = page.locator('#select2-id_sc_field_retequip_topflux-container');
    await expect(fluxoTrigger).toBeVisible();
    await expect(fluxoTrigger).toBeEnabled();

    const selectedFluxo = await randomSelect2(
      page,
      '#select2-id_sc_field_retequip_topflux-container',
      ['padrão']
    );

    await validateFields(fluxoTrigger);
    const displayedFluxo = (await fluxoTrigger.textContent())?.trim();
    expect(displayedFluxo).toBe(selectedFluxo);

    // Handle 'Item do Fluxo' Select2
    const fluxoItemTrigger = page.locator('#select2-id_sc_field_retequip_fluxitem-container');
    await expect(fluxoItemTrigger).toBeVisible();
    await fluxoItemTrigger.waitFor({ state: 'visible' });

    const selectedItem = await randomSelect2(
      page,
      '[aria-labelledby="select2-id_sc_field_retequip_fluxitem-container"]',
      ['padrão']
    );

    const displayedItem = (await fluxoItemTrigger.textContent())?.trim();
    expect(displayedItem).toBe(selectedItem);
  }
}

test('Testar Ajax', async ({ page }) => {
  test.setTimeout(20000);

  const menu = page.frameLocator('iframe[name="app_menu_iframe"]');

  await login(page);
  await acessarDadosGerais(page, menu);
  await validacaoAjax(page, menu);
});
