import { test, expect, Page, Locator } from '@playwright/test';
import { randomSelect, randomSelect2, login, waitForAjax, validateFields, retryUntil } from '../../lib/utils';

/*
FLuxo do teste:
  1 - Acessar o sistema
  2 - Acessar o menu Empresa > Clientes > Planos  
  3 - Aacessar um dos planos
  4 - Na aba terceiros configurar os campos e validar ajax
*/

async function acessarPlanos(page, menu) {

  await page.getByText('x', { exact: true }).click();
  await page.locator('img').first().click();
  await page.getByRole('link', { name: 'Empresa' }).click();
  await page.getByRole('link', { name: 'Clientes' }).click();
  await page.getByRole('link', { name: 'Planos' }).click();
  await page.locator('#item_11').click();
}

async function validacaoAjaxPlanos(page, menu) {
  const isInvalidText = (s: string) => {
    const v = (s ?? '').trim().toLowerCase();
    return v === '' || v === 'selecione' || v === '(selecione)' || v === 'padrão';
  };

  type ChangedField = { name: 'cobrPTerceiro' | 'cobrDTerceiro'; locator: Locator };
  const altered: ChangedField[] = [];

  await waitForAjax(page);
  await expect(menu.getByText('Cadastro de Planos')).toBeVisible();

  const editBtn = menu.locator('tr:has(td:has-text("TESTE TIP")) a#bedit').first();
  await expect(editBtn).toBeVisible();
  await editBtn.click();
  await waitForAjax(page);

  await menu.locator('#id_cad_planos_cadastro_form4').click();
  await waitForAjax(page);

  const cobrancaPTerceiro = menu.locator('#id_sc_field_cobrpt');
  const cobrancaDTerceiro = menu.locator('#id_sc_field_cobrdt');

  // originais (valor do option selecionado)
  const cobrancaPTerceiroOri = await cobrancaPTerceiro.inputValue();
  const cobrancaDTerceiroOri = await cobrancaDTerceiro.inputValue();

  //cobrança por terceiros
  const cobrancaPTerceiroSelector = await randomSelect(menu, '#id_sc_field_cobrpt');
  await waitForAjax(page);
  await expect(cobrancaPTerceiro).toHaveValue(cobrancaPTerceiroSelector);
  await validateFields(cobrancaPTerceiro);
  
  const cobrancaPTerceiroNew = await cobrancaPTerceiro.inputValue();
  if (cobrancaPTerceiroNew && cobrancaPTerceiroNew !== cobrancaPTerceiroOri) {
    altered.push({ name: 'cobrPTerceiro', locator: cobrancaPTerceiro });
    await waitForAjax(page, 500);

    const cobrPtercSecond = await randomSelect(menu, '#id_sc_field_cobrptp');
    const cobrPtercSecondSelector = await menu.locator('#id_sc_field_cobrptp').inputValue();  
    await waitForAjax(page);
      if(cobrPtercSecondSelector === 'S') {
        await waitForAjax(page);
        const icon = menu.locator('.icon_fa.fas.fa-forward').first();
        await expect(icon).toBeVisible();
        await icon.click();
        await waitForAjax(page);

        const cobrPTerceirosContratos = randomSelect(menu, '#id_sc_field_ptcon', ['(Selecione um Terceiro para inicializar os contratos deste plano)']);
        const cobrPTerceirosPacotes = randomSelect(menu, '#id_sc_field_ptpac', ['(Selecione um Terceiro para inicializar os pacotes que contém este plano)']);
        await waitForAjax(page);

        await menu.locator('#sc_b_upd_t').click();
      }
        else{
        const cobrPTerceirosContratos = randomSelect(menu, '#id_sc_field_ptcon', ['(Selecione um Terceiro para inicializar os contratos deste plano)']);
        const cobrPTerceirosPacotes = randomSelect(menu, '#id_sc_field_ptpac', ['(Selecione um Terceiro para inicializar os pacotes que contém este plano)']);
        await waitForAjax(page);

        await menu.locator('#sc_b_upd_t').click();
        }
  }
  else
  {
    const sel = menu.locator('#id_sc_field_cobrpt');
    await sel.selectOption({ index: 0 });
    await waitForAjax(page);
    const firstLabel = (await sel.locator('option').nth(0).textContent())?.trim() ?? '';
    await expect(sel.locator('option:checked')).toHaveText(firstLabel);
    await menu.locator('#sc_b_upd_t').click();
  }
  await waitForAjax(page);

  //cobrança por Terceiro 
  const dPickedVal = await randomSelect(menu, '#id_sc_field_cobrdt');
  await waitForAjax(page);
  await expect(cobrancaDTerceiro).toHaveValue(dPickedVal);
  await validateFields(cobrancaDTerceiro);

  const dNewVal = await cobrancaDTerceiro.inputValue();
  if (dNewVal && dNewVal !== cobrancaDTerceiroOri) {
    altered.push({ name: 'cobrDTerceiro', locator: cobrancaDTerceiro });

    const cobrDtercSecond = await randomSelect(menu, '#id_sc_field_cobrdtp');
    const cobrDtercSecondSelector = await menu.locator('#id_sc_field_cobrdtp').inputValue();  
    await waitForAjax(page);
    if(cobrDtercSecondSelector === 'S')
    {
        await waitForAjax(page);
        await page.locator('iframe[name="app_menu_iframe"]').contentFrame().getByRole('cell', { name: '   ', exact: true }).locator('#Bbpassfld_rightall').click();
        await waitForAjax(page);

        const cobrPTerceirosContratos = randomSelect(menu, '#id_sc_field_dtcon', ['(Selecione um Terceiro para inicializar os contratos deste plano)']);
        const cobrPTerceirosPacotes = randomSelect(menu, '#id_sc_field_dtpac', ['(Selecione um Terceiro para inicializar os pacotes que contém este plano)']);
        await waitForAjax(page);
        await menu.locator('#sc_b_upd_t').click();
    }
    else
    {
        await waitForAjax(page);
        const cobrPTerceirosContratos = randomSelect(menu, '#id_sc_field_dtcon', ['(Selecione um Terceiro para inicializar os contratos deste plano)']);
        const cobrPTerceirosPacotes = randomSelect(menu, '#id_sc_field_dtpac', ['(Selecione um Terceiro para inicializar os pacotes que contém este plano)']);
        await waitForAjax(page);
        await menu.locator('#sc_b_upd_t').click();
    }
  }
  else
  {
    const sel = menu.locator('#id_sc_field_cobrdt');
    await sel.selectOption({ index: 0 });
    await waitForAjax(page);
    const firstLabel = (await sel.locator('option').nth(0).textContent())?.trim() ?? '';
    await expect(sel.locator('option:checked')).toHaveText(firstLabel);
    await menu.locator('#sc_b_upd_t').click();

  }
  for (const { locator } of altered) {
    await validateFields(locator);
  }
}

test('Testar Ajax Planos', async ({ page }) => {
  // Gera o cache dos itens do inspetor.
  const menu = page.frameLocator('iframe[name="app_menu_iframe"]');
  const item5 = menu.frameLocator('iframe[name="item_5"]');
  const tb = item5.frameLocator('iframe[name^="TB_iframeContent"]');

  test.setTimeout(50000);

  await login(page);
  await acessarPlanos(page, menu);
  await validacaoAjaxPlanos(page, menu);
});