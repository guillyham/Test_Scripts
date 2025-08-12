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

  // comentário: tipar coleção de campos alterados
  type ChangedField = { name: 'localCobr' | 'convenio'; locator: Locator };
  const altered: ChangedField[] = [];

  const isInvalidText = (s: string) => {
    const v = (s ?? '').trim().toLowerCase();
    return v === '' || v === 'selecione' || v === '(selecione)' || v === 'padrão';
  };

  // valores originais
  const localCobrContainer = menu.locator('#select2-id_sc_field_pedbancopadrao-container');
  const convenioContainer  = menu.locator('#select2-id_sc_field_pedconveniopadrao-container');
  const localCobrOrig = (await localCobrContainer.textContent())?.trim() ?? '';
  const convenioOrig  = (await convenioContainer.textContent())?.trim() ?? '';

  // 1) selecionar Local de Cobrança
  const localCobr = await randomSelect2(menu,'[aria-labelledby="select2-id_sc_field_pedbancopadrao-container"]',['padrão']);
  await waitForAjax(page);
  await expect(localCobrContainer).toHaveText(localCobr);
  await validateFields(localCobrContainer);

  // marcar como alterado se mudou e é válido
  const localCobrNew = (await localCobrContainer.textContent())?.trim() ?? '';
  if (!isInvalidText(localCobrNew) && localCobrNew !== localCobrOrig) {
    altered.push({ name: 'localCobr', locator: localCobrContainer });
  }

  // 2) aguardar Convenio resetar OU mudar para valor válido ≠ original
  await retryUntil(async () => {
    const raw  = await convenioContainer.textContent();
    const txt  = (raw ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
    const orig = convenioOrig.trim().toLowerCase();
    const isPlaceholder = txt === 'selecione' || txt === '(selecione)' || txt === 'padrão';
    if (txt === '') return true;                 // resetou
    if (!isPlaceholder && txt !== orig) return true; // mudou p/ válido
    return false;
  }, { timeout: 20000, interval: 500 });

  // 3) selecionar Convenio do Pedido
  const convenioPedido = await randomSelect2(menu,'[aria-labelledby="select2-id_sc_field_pedconveniopadrao-container"]',['padrão']);
  await waitForAjax(page);
  await expect(convenioContainer).toHaveText(convenioPedido);
  await validateFields(convenioContainer);

  const convenioNew = (await convenioContainer.textContent())?.trim() ?? '';
  if (!isInvalidText(convenioNew) && convenioNew !== convenioOrig) {
    altered.push({ name: 'convenio', locator: convenioContainer });
  }

  // PASS/FAIL: todo campo alterado precisa ser válido
  for (const { locator } of altered) {
    await validateFields(locator); // falha se vazio/placeholder
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
