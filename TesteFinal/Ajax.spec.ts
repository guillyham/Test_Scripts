import { test, expect, Page } from '@playwright/test';
import { randomSelect2, login, waitForAjax, validateFields} from '../lib/utils';

// comentário: tipar menu corretamente
async function acessarDadosGerais(page, menu) {
  await page.getByText('x', { exact: true }).click();
  await page.locator('img').first().click();
  await page.getByRole('link', { name: 'Empresa' }).click();
  await page.getByRole('link', { name: 'Parâmetros' }).click();
  await page.getByRole('link', { name: 'Dados Gerais' }).click();
  await menu.locator('#id_cad_empresa_form2').click();
}

async function validacaoAjaxEstoque(menu, page) {
  await expect(page.locator('#id_label_retequip_atendtipo')).toBeVisible();
 
  const tipoAtdOpt = page.locator('input[type="radio"][name="retequip_atendtipo"]');
  await expect(tipoAtdOpt.first()).toBeVisible();
 
  const checkedRadio = page.locator('input[type="radio"][name="retequip_atendtipo"]:checked');
  await expect(checkedRadio).toBeVisible();
  const value = await checkedRadio.getAttribute('value');
  const campoAtdVlrOri = await checkedRadio.inputValue();
 
  const topflux = await page.locator('#select2-id_sc_field_retequip_topflux-container').textContent();
  const topfluxVlrOri = topflux?.trim();

  if (campoAtdVlrOri === 'T') {
    await page.locator('input[name="retequip_atendtipo"][value="F"]').check(); // comentário: seletor semântico
    await waitForAjax(page);

    await expect(page.locator('#id_label_retequip_fluxitem')).toBeVisible();

    //topico
    const chosenTopFlux = await randomSelect2(page,'[aria-labelledby="select2-id_sc_field_retequip_topflux-container"]',['padrão']);
    await waitForAjax(page);
    const chosenTopFluxInput = page.locator(chosenTopFlux);
    await validateFields(chosenTopFluxInput);

    //fluxo
    const chosenFluxItem = await randomSelect2(page,'[aria-labelledby="select2-id_sc_field_retequip_fluxitem-container"]',['padrão']);
    await waitForAjax(page);
    const chosenFluxItemInput = page.locator(chosenTopFlux);
    await validateFields(chosenFluxItemInput);

    await page.locator('#sc_b_upd_t').click(); 

  } 
  else {
    await page.locator('input[name="retequip_atendtipo"][value="T"]').check();
    await waitForAjax(page);

    const chosenTopFlux = await randomSelect2(page,'[aria-labelledby="select2-id_sc_field_retequip_topflux-container"]',['padrão']);
    await waitForAjax(page);
    const chosenTopFluxInput = page.locator(chosenTopFlux);
    await validateFields(chosenTopFluxInput);

    await page.locator('#sc_b_upd_t').click();
  }
}

test('Testar Ajax', async ({ page }) => {
  const menu = page.frameLocator('iframe[name="app_menu_iframe"]');
  const item5 = menu.frameLocator('iframe[name="item_5"]');
  const tb = item5.frameLocator('iframe[name^="TB_iframeContent"]');

  test.setTimeout(50_000);

  await login(page);

  await acessarDadosGerais(page, menu);

  await validacaoAjaxEstoque(page,menu);

  //validacaoAjaxPedidos (implementar ou remover chamada)
});
