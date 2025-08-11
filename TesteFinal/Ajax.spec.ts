import { test, expect, Page } from '@playwright/test';
import { randomSelect2, login, waitForAjax, validateFields, randomSelect, retryUntil} from '../lib/utils';

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
  await waitForAjax(page);


  if (campoAtdVlrOri === 'T') {
    await page.locator('input[name="retequip_atendtipo"][value="F"]').check(); 
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
    const chosenFluxItemInput = page.locator(chosenFluxItem);
    await validateFields(chosenFluxItemInput);
  } 
  else {
    await page.locator('input[name="retequip_atendtipo"][value="T"]').check();
    await waitForAjax(page);

    const chosenTopFlux = await randomSelect2(page,'[aria-labelledby="select2-id_sc_field_retequip_topflux-container"]',['padrão']);
    await waitForAjax(page);
    const chosenTopFluxInput = page.locator(chosenTopFlux);
    await validateFields(chosenTopFluxInput);
  }
  await console.log('fora do if');
  await waitForAjax(page);
  //designar atd
    const designarAtd = await randomSelect(page,'#id_sc_field_retequip_designar',['N']);
    await waitForAjax(page);
    const designarAtdInput = page.locator(designarAtd);
    await validateFields(designarAtdInput);

    const designarAlvo = await randomSelect2(page,'[aria-labelledby="select2-id_sc_field_retequip_designaralvo-container"]',['selecione']);
    await waitForAjax(page);
    const designarAlvoInput = page.locator(designarAlvo);
    await validateFields(designarAlvoInput);
}

async function validacaoAjaxPedidos(page, menu) {
  await menu.locator('#id_cad_empresa_form4').click();
  await expect(menu.locator('#id_label_pedbancopadrao')).toBeVisible();

  const convenioContainer = menu.locator('#select2-id_sc_field_pedconveniopadrao-container');
  const convenioOrig = (await convenioContainer.textContent())?.trim() ?? '';

  const localCobr = await randomSelect2(menu,'[aria-labelledby="select2-id_sc_field_pedbancopadrao-container"]',['padrão']);
  await waitForAjax(page);
  const localCobrContainer = menu.locator('#select2-id_sc_field_pedbancopadrao-container');
  await expect(localCobrContainer).toHaveText(localCobr);
  await validateFields(localCobrContainer);

  await retryUntil(async () => {
    const txt = (await convenioContainer.textContent())?.trim().toLowerCase() ?? '';
    if (!txt) return false; // vazio
    if (txt === 'selecione' || txt === '(selecione)' || txt === 'padrão') return false; // placeholder
    return txt !== (convenioOrig.toLowerCase());
  }, { timeout: 20000, interval: 500 });

  const convenioPedido = await randomSelect2(menu,'[aria-labelledby="select2-id_sc_field_pedconveniopadrao-container"]',['padrão']);
  await waitForAjax(page);
  await expect(convenioContainer).toHaveText(convenioPedido);
  await validateFields(convenioContainer);

}

test('Testar Ajax', async ({ page }) => {
  const menu = page.frameLocator('iframe[name="app_menu_iframe"]');
  const item5 = menu.frameLocator('iframe[name="item_5"]');
  const tb = item5.frameLocator('iframe[name^="TB_iframeContent"]');

  test.setTimeout(50_000);

  await login(page);

  await acessarDadosGerais(page, menu);

  await validacaoAjaxEstoque(page,menu);

  await validacaoAjaxPedidos (page, menu);
});
