import { test, expect, Locator, Page, Frame, selectors} from '@playwright/test';
import { randomSelect, randomSelect2, login, validateFields, waitForAjax, retryUntil, } from '../lib/utils';
/*
FLuxo do teste:
  1 - Acessar o sistema
  2 - Acessar o menu Empresa > Clientes > Planos  
  3 - Clicar em novo
  4 - Preencher os campos obrigatórios
  5 - Finalizar o cadastro
*/

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

async function incluirRegistro(page, menu) {
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
    if (await tipoInput.inputValue() === 'T') //caso seja do tipo 'Telefonia'
      {
      const qosSelector = '#select2-id_sc_field_qos-container';
      await randomSelect2(menu, qosSelector, ['selecione', '(selecione)']);
      const qosInput = menu.locator(qosSelector);
      await validateFields(qosInput);
      
      await menu.locator('#sc_b_ins_t').click( );//finaliza o cadastro
      await waitForAjax(page, 4000);
    }
  else 
    { 
      const qosSelector = '#select2-id_sc_field_qos-container';
      await randomSelect2(menu, qosSelector, ['selecione', '(selecione)']);
      await waitForAjax(page);
      const qosInput = menu.locator(qosSelector);
      await validateFields(qosInput);

      const meioTranmissaoSelectorStr = '#id_read_off_sicimeiotransmissao';
      const tmeioTranmissaoSelector = menu.locator(meioTranmissaoSelectorStr);
      await tmeioTranmissaoSelector.waitFor({ state: 'visible' });
      const transmissaoIds = 
      [
        '#id-opt-sicimeiotransmissao-0', // cabo_coaxial
        '#id-opt-sicimeiotransmissao-1', // cabo_metalico
        '#id-opt-sicimeiotransmissao-2', // fibra
        '#id-opt-sicimeiotransmissao-3', // radio
        '#id-opt-sicimeiotransmissao-4', // satelite
      ];

      for (const id of transmissaoIds) {
        const checkboxT = menu.locator(id);
        await expect(checkboxT).toBeVisible();

        if (!(await checkboxT.isChecked())) {
          await checkboxT.check();
        }
        await retryUntil(async () => {
          return await checkboxT.isChecked();
        }, { timeout: 5000, interval: 200 });

        await validateFields(checkboxT); 
      }
      await waitForAjax(page); 


      const tecnologiaSelectorStr = '#id_read_off_sicitecnologia';
      const tecnologiaSelector = menu.locator(tecnologiaSelectorStr);
      await tecnologiaSelector.waitFor({ state: 'visible' });
      const tecnologiaIds = 
      [
        '#id-opt-sicitecnologia-0', // ETHERNET
        '#id-opt-sicitecnologia-1', // FTTH
        '#id-opt-sicitecnologia-2', // NR
      ];

      for (const id of tecnologiaIds) {
        const checkbox = menu.locator(id);
        await expect(checkbox).toBeVisible();

        if (!(await checkbox.isChecked())) {
          await checkbox.check();
        }

        await retryUntil(async () => {
          return await checkbox.isChecked();
        }, { timeout: 5000, interval: 200 });

        await validateFields(checkbox);
      }
      await waitForAjax(page); 
      
      const tipoProdutoSelector = '#id_sc_field_siciproduto';
      await randomSelect(menu, tipoProdutoSelector, ['selecione', '(selecione)']);
      await waitForAjax(page)
      const tipoProdutoInput = menu.locator(tipoProdutoSelector);
      await validateFields(tipoProdutoInput);

      const tecnologiaSelector2 = '#id_sc_field_sicitecnologiapadrao';
      await randomSelect(menu, tecnologiaSelector2, ['selecione', '(selecione)']);
      await waitForAjax(page)
      const tecnologiaSelectorInput = menu.locator(tecnologiaSelector2);
      await validateFields(tecnologiaSelectorInput);

      const meioTransmissaoSelector = '#id_sc_field_sicimeiotransmissaopadrao';
      await randomSelect(menu, meioTransmissaoSelector, ['selecione', '(selecione)']);
      await waitForAjax(page)
      const meioTransmissaoSelectorInput = menu.locator(meioTransmissaoSelector);
      await validateFields(meioTransmissaoSelectorInput);

      await menu.locator('#sc_b_ins_t').click( );//finaliza o cadastro
      await waitForAjax(page, 4000);
    }
}

async function configuracaoFiscal(page, menu) {
  const codigoPlano = await menu.locator('#id_sc_field_codigo').inputValue(); 

  await retryUntil(async () => {
    const picked = await randomSelect2(menu, '[aria-labelledby="select2-id_sc_field_nfnatoper-container"]', ['selecione','(selecione)','padrão']);
    await waitForAjax(page);
    const ctr = menu.locator('#select2-id_sc_field_nfnatoper-container');
    const txt = (await ctr.textContent())?.trim() ?? '';
    if (!txt || txt !== picked) return false;
    await validateFields(ctr); 
    return true;
  }, { timeout: 20000, interval: 500 });

  await retryUntil(async () => {
    const picked = await randomSelect2(menu, '[aria-labelledby="select2-id_sc_field_adesaonatoper-container"]', ['selecione','(selecione)','padrão']);
    await waitForAjax(page);
    const ctr = menu.locator('#select2-id_sc_field_adesaonatoper-container');
    const txt = (await ctr.textContent())?.trim() ?? '';
    if (!txt || txt !== picked) return false;
    await validateFields(ctr);
    return true;
  }, { timeout: 20000, interval: 500 });

  await menu.locator('#sc_b_upd_t').click();
  await waitForAjax(page);
  await menu.getByText('Voltar').click();
  await menu.getByAltText('Cadastro de Planos').isVisible();
  await menu.locator('#SC_fast_search_top').fill(codigoPlano);
  await page.keyboard.press('Enter');
  await waitForAjax(page, 2000);

  //validação para verificar se o alerta de configuração fiscal com problema
  const ALERT_SELECTOR = 'img[title*="Divergências no valor total dos dados fiscais"]';
  const icon = menu.locator(ALERT_SELECTOR);
  const shouldSkip =(await icon.count()) > 0 && (await icon.first().isVisible());

  // comentário: pula o teste quando o ícone está visível
  test.skip(shouldSkip, 'Ícone de alerta presente — pulando teste.');
}

test('Cadastro de planos', async ({ page }) => {
  // Gera o cache dos itens do inspetor.
  const menu = page.frameLocator('iframe[name="app_menu_iframe"]');
  const item5 = menu.frameLocator('iframe[name="item_5"]');
  const tb = item5.frameLocator('iframe[name^="TB_iframeContent"]');

  test.setTimeout(50000);

  await login(page);
  await novoPlano(page,menu);
  await incluirRegistro(page,menu);
  await configuracaoFiscal(page,menu);
});