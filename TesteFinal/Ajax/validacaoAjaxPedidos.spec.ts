import { test, expect, Page, Locator } from '@playwright/test';
import { randomSelect, randomSelect2, login, waitForAjax, validateFields, retryUntil } from '../../lib/utils';

/*
Fluxo do teste:
1 - acessa dados gerais > pedidos
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

async function validacaoAjaxPedidos(page, menu) {
  await menu.locator('#id_cad_empresa_form4').click();
  await expect(menu.locator('#id_label_pedbancopadrao')).toBeVisible();

  type ChangedField = { name: 'localCobr' | 'convenio' | 'cobranca'; locator: Locator };
  const altered: ChangedField[] = [];

  const isInvalidText = (s: string) => {
    const v = (s ?? '').trim().toLowerCase();
    return v === '' || v === 'selecione' || v === '(selecione)' || v === 'padrão';
  };

  const localCobrContainer = menu.locator('#select2-id_sc_field_pedbancopadrao-container');
  const convenioContainer  = menu.locator('#select2-id_sc_field_pedconveniopadrao-container');
  const cobrancaPadraoContainer = menu.locator('#select2-id_sc_field_pedcobrancapadrao-container');
  const localCobrOrig = (await localCobrContainer.textContent())?.trim() ?? '';
  const convenioOrig  = (await convenioContainer.textContent())?.trim() ?? '';
  const cobrancaPadraoOrig  = (await cobrancaPadraoContainer.textContent())?.trim() ?? '';

  //Banco
  const localCobr = await randomSelect2(menu,'[aria-labelledby="select2-id_sc_field_pedbancopadrao-container"]',['padrão']);
  await waitForAjax(page);
  await expect(localCobrContainer).toHaveText(localCobr);
  await validateFields(localCobrContainer);

  const localCobrNew = (await localCobrContainer.textContent())?.trim() ?? '';
  if (!isInvalidText(localCobrNew) && localCobrNew !== localCobrOrig) {
    altered.push({ name: 'localCobr', locator: localCobrContainer });
  }

  //Convenio
  await retryUntil(async () => {
    const raw  = await convenioContainer.textContent();
    const txt  = (raw ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
    const orig = convenioOrig.trim().toLowerCase();
    const isPlaceholder = txt === 'selecione' || txt === '(selecione)' || txt === 'padrão';
    if (txt === '') return true;
    if (!isPlaceholder && txt !== orig) return true; 
    return false;
  }, { timeout: 20000, interval: 500 });

  const convenioPedido = await randomSelect2(menu,'[aria-labelledby="select2-id_sc_field_pedconveniopadrao-container"]',['padrão']);
  await waitForAjax(page);
  await expect(convenioContainer).toHaveText(convenioPedido);
  await validateFields(convenioContainer);

  const convenioNew = (await convenioContainer.textContent())?.trim() ?? '';
  if (!isInvalidText(convenioNew) && convenioNew !== convenioOrig) {
    altered.push({ name: 'convenio', locator: convenioContainer });
  }

  //Cobranca Padrão
  const cobrancaPadrao = await randomSelect2(menu,'[aria-labelledby="select2-id_sc_field_pedcobrancapadrao-container"]');
  await waitForAjax(page);
  await expect(cobrancaPadraoContainer).toHaveText(cobrancaPadrao);
  await validateFields(cobrancaPadraoContainer);

  const cobrancaPadraoNew = (await cobrancaPadraoContainer.textContent())?.trim() ?? '';
  if (!isInvalidText(cobrancaPadraoNew) && cobrancaPadraoNew !== cobrancaPadraoOrig) {
    altered.push({ name: 'cobranca', locator: cobrancaPadraoContainer });
  }

  for (const { locator } of altered) {
    await validateFields(locator);
  }
  await waitForAjax(page);
  await menu.locator('#sc_b_upd_t').click();
}

test('Testar Ajax Pedidos', async ({ page }) => {
  const menu = page.frameLocator('iframe[name="app_menu_iframe"]');
  const item5 = menu.frameLocator('iframe[name="item_5"]');
  const tb = item5.frameLocator('iframe[name^="TB_iframeContent"]');

  test.setTimeout(50_000);

  await login(page);

  await acessarDadosGerais(page, menu);

  await validacaoAjaxPedidos (page, menu);
});
