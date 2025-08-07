import { test, expect, Locator, Page, Frame} from '@playwright/test';
import { randomSelect, randomSelect2, login, validateFields } from '../lib/utils';

async function novoPlano(page, menu) {
  await page.getByText('x', { exact: true }).click();
  await page.locator('img').first().click();
  await page.getByRole('link', { name: 'Empresa' }).click();
  await page.getByRole('link', { name: 'Clientes' }).click();
  await page.getByRole('link', { name: 'Planos' }).click();
  await page.locator('#item_11').click();

  await menu.locator('#sc_b_new_top').waitFor({ state: 'visible' });
  await menu.locator('#sc_b_new_top').click();
}

async function incluirRegistro(menu) {
  await menu.locator('#id_label_descricao').waitFor({ state: 'visible' });
  await menu.locator('#id_sc_field_descricao').fill('Plano Teste');
  const nomePlano = menu.locator('#id_sc_field_descricao');
  await validateFields(nomePlano);

  await menu.locator('#id_sc_field_valor').fill('150,00');
  const valorPlano = menu.locator('#id_sc_field_valor');
  await validateFields(valorPlano);

  await menu.locator('#id_sc_field_prorrogacaovencimento').fill('0');
  const PVenc = menu.locator('#id_sc_field_prorrogacaovencimento');
  await validateFields(PVenc);

  await menu.locator('#id_sc_field_vigencia').fill('12');
  const vigencia = menu.locator('#id_sc_field_vigencia');
  await validateFields(vigencia);

  await randomSelect(menu, '#id_sc_field_tipo');
  const tipoInput = menu.locator('#id_sc_field_tipo');
  await validateFields(tipoInput); 
    if (await tipoInput.inputValue() === 'T') {
      const qosSelector = '#select2-id_sc_field_qos-container';
      await randomSelect2(menu, qosSelector, ['selecione', '(selecione)']);
      const qosInput = menu.locator(qosSelector);
      await validateFields(qosInput);
      
      await menu.locator('#sc_b_ins_t').click( );//finaliza o cadastro
    }
  else {
      const qosSelector = '#select2-id_sc_field_qos-container';
      await randomSelect2(menu, qosSelector, ['selecione', '(selecione)']);
      const qosInput = menu.locator(qosSelector);
      await validateFields(qosInput);

      const tipoProdutoSelector = menu.locator('#id_sc_field_siciproduto');
      await randomSelect2(menu, tipoProdutoSelector, ['selecione', '(selecione)']);
      const tipoProdutoInput = menu.locator(tipoProdutoSelector);
      await validateFields(tipoProdutoInput);

      await menu.locator('#id-opt-sicitecnologia-0').check();
      const tecnologiaInput = menu.locator('#id-opt-sicitecnologia-0');
      await validateFields(tecnologiaInput);

      const tecnologiaSelector = menu.locator('#id_sc_field_sicitecnologiapadrao');
      await randomSelect2(menu, tecnologiaSelector, ['selecione', '(selecione)']);
      const tecnologiaSelectorInput = menu.locator(tecnologiaSelector);
      await validateFields(tecnologiaSelectorInput);
    }
}

// Fluxo principal do teste
test('Cadastro de planos', async ({ page, context }) => {
  // Gera o cache dos itens do inspetor.
  const menu = page.frameLocator('iframe[name="app_menu_iframe"]');
  const item5 = menu.frameLocator('iframe[name="item_5"]');
  const tb = item5.frameLocator('iframe[name^="TB_iframeContent"]');

  test.setTimeout(20000);

  await login(page);
  await novoPlano(page,menu);
  await incluirRegistro(menu);
  
});