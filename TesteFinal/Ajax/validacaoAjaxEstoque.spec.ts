import { test, expect, Page, Locator } from '@playwright/test';
import { randomSelect, randomSelect2, login, waitForAjax, validateFields, retryUntil } from '../../lib/utils';

/*
Fluxo do teste:
1 - acessa dados gerais > estoque
2 - valida ajax da aba estoque mudando os campos e validando os valores
*/

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
  const campoAtdVlrOri = await checkedRadio.getAttribute('value');

  //Coleta valor original dos campos
  const topfluxVlrOri = (await page.locator('#select2-id_sc_field_retequip_topflux-container').textContent())?.trim() ?? '';
  const fluxItemVlrOri = (await page.locator('#select2-id_sc_field_retequip_fluxitem-container').textContent())?.trim() ?? '';
  const designarAtdOri = await page.locator('#id_sc_field_retequip_designar').inputValue();
  const designarAlvoOri = (await page.locator('#select2-id_sc_field_retequip_designaralvo-container').textContent())?.trim() ?? '';

  const altered = [] as Array<{ name: string; locator: Locator }>; 

  const isInvalidText = (s) => {
    const v = (s ?? '').trim().toLowerCase();
    return v === '' || v === 'selecione' || v === '(selecione)' || v === 'padrão';
  };

  await waitForAjax(page);

  if (campoAtdVlrOri === 'T') {
    //Qaundo for Fluxo
    await page.locator('input[name="retequip_atendtipo"][value="F"]').check(); 
    await waitForAjax(page);

    await expect(page.locator('#id_label_retequip_fluxitem')).toBeVisible();

    //Selecionador do fluxo
    const chosenTopFlux = await randomSelect2(page,'[aria-labelledby="select2-id_sc_field_retequip_topflux-container"]',['padrão']);
    await waitForAjax(page);
    const topFluxCtr = page.locator('#select2-id_sc_field_retequip_topflux-container');
    const topfluxVlrNovo = (await topFluxCtr.textContent())?.trim() ?? '';
    if (isInvalidText(topfluxVlrNovo)) throw new Error(`TopFlux inválido: "${topfluxVlrNovo}"`); 
    if (topfluxVlrNovo !== topfluxVlrOri) altered.push({ name: 'topflux', locator: topFluxCtr });

    //Selecionador do fluxo item
    await waitForAjax(page);
    await retryUntil(async () => {
      const picked = await randomSelect2(page,'[aria-labelledby="select2-id_sc_field_retequip_fluxitem-container"]',['padrão']);
      await waitForAjax(page);
      const fluxCtr = page.locator('#select2-id_sc_field_retequip_fluxitem-container');
      const txt = (await fluxCtr.textContent())?.trim() ?? '';
      if (!txt || txt !== picked) return false;
      if (isInvalidText(txt)) throw new Error(`Fluxo inválido: "${txt}"`);

      if (txt !== fluxItemVlrOri) altered.push({ name: 'fluxitem', locator: fluxCtr });
      return true;
    }, { timeout: 20000, interval: 500 });

    //Validação final (antes de salvar)
    for (const { locator } of altered) await validateFields(locator);
    await page.locator('#sc_b_upd_t').click(); 
    await waitForAjax(page);

  } else {
    //Qunado for Topico
    await page.locator('input[name="retequip_atendtipo"][value="T"]').check();
    await waitForAjax(page);

    //Selecionador do Topico
    const chosenTopFlux = await randomSelect2(page,'[aria-labelledby="select2-id_sc_field_retequip_topflux-container"]',['padrão']);
    await waitForAjax(page);
    const topFluxCtr = page.locator('#select2-id_sc_field_retequip_topflux-container');
    const topfluxVlrNovo = (await topFluxCtr.textContent())?.trim() ?? '';
    if (isInvalidText(topfluxVlrNovo)) throw new Error(`TopFlux inválido: "${topfluxVlrNovo}"`);
    if (topfluxVlrNovo !== topfluxVlrOri) altered.push({ name: 'topflux', locator: topFluxCtr });

    //Validação final (antes de salvar)
    for (const { locator } of altered) await validateFields(locator);
    await page.locator('#sc_b_upd_t').click();
    await waitForAjax(page);
  }

  //Campo designar atendimento
  const designarAtdVal = await randomSelect(page,'#id_sc_field_retequip_designar',['N']);
  await waitForAjax(page);
  const designarAtdNew = await page.locator('#id_sc_field_retequip_designar').inputValue();
  if (!designarAtdNew || designarAtdNew === 'N') throw new Error(`DesignarAtd inválido: "${designarAtdNew}"`);
  if (designarAtdNew !== designarAtdOri) altered.push({ name: 'designarAtd', locator: page.locator('#id_sc_field_retequip_designar') });

  //designar alvo
  const designarAlvo = await randomSelect2(page,'[aria-labelledby="select2-id_sc_field_retequip_designaralvo-container"]',['selecione','padrão']);
  await waitForAjax(page);
  const designarAlvoCtr = page.locator('#select2-id_sc_field_retequip_designaralvo-container');
  const designarAlvoNew = (await designarAlvoCtr.textContent())?.trim() ?? '';
  if (isInvalidText(designarAlvoNew)) throw new Error(`DesignarAlvo inválido: "${designarAlvoNew}"`);
  if (designarAlvoNew !== designarAlvoOri) altered.push({ name: 'designarAlvo', locator: designarAlvoCtr });

  //Validação final (antes de salvar)
  for (const { locator } of altered) await validateFields(locator);
  await page.locator('#sc_b_upd_t').click();
}

test('Testar Ajax Estoque', async ({ page }) => {
  const menu = page.frameLocator('iframe[name="app_menu_iframe"]');
  const item5 = menu.frameLocator('iframe[name="item_5"]');
  const tb = item5.frameLocator('iframe[name^="TB_iframeContent"]');

  test.setTimeout(50_000);

  await login(page);

  await acessarDadosGerais(page, menu);

  await validacaoAjaxEstoque(page,menu);
});
