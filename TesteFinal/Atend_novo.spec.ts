import { test, expect, Locator, Page, Frame} from '@playwright/test';
import { randomSelect, randomSelect2, login, validateFields, waitForAjax } from '../lib/utils';


async function selectContratoNative(menu: Page | Frame, blacklist: string[] = []): Promise<string> {
  const native = menu.locator('#id_sc_field_cliente_contrato'); 
  await native.waitFor({ state: 'attached', timeout: 10_000 });

  const options = native.locator('option');
  const count = await options.count();
  const valid: { value: string; label: string }[] = [];

  for (let i = 0; i < count; i++) {
    const opt = options.nth(i);
    const value = (await opt.getAttribute('value')) ?? '';
    const label = (await opt.textContent())?.trim() ?? '';
    const disabled = await opt.isDisabled();
    if (value && label && !disabled && !blacklist.some(b => label.toLowerCase().includes(b.toLowerCase()))) {
      valid.push({ value, label });
    }
  }

  if (!valid.length) throw new Error('Sem opções válidas no select cliente_contrato');

  const choice = valid[Math.floor(Math.random() * valid.length)];

  await native.selectOption({ value: choice.value }, { force: true });

  const display = menu.locator('#select2-id_sc_field_cliente_contrato-container');
  await expect(display).toBeVisible({ timeout: 10_000 });
  await expect(display).toHaveText(choice.label, { timeout: 10_000 });

  return choice.label;
}

async function selectContatosNative(menu: Page | Frame, blacklist: string[] = []): Promise<string> {
  const native = menu.locator('#id_sc_field_cliente_contato');
  await native.waitFor({ state: 'attached', timeout: 10_000 });

  const options = native.locator('option');
  const count = await options.count();
  const valid: { value: string; label: string }[] = [];

  for (let i = 0; i < count; i++) {
    const opt = options.nth(i);
    const value = (await opt.getAttribute('value')) ?? '';
    const label = (await opt.textContent())?.trim() ?? '';
    const disabled = await opt.isDisabled();
    if (value && label && !disabled && !blacklist.some(b => label.toLowerCase().includes(b.toLowerCase()))) {
      valid.push({ value, label });
    }
  }

  if (!valid.length) throw new Error('Sem opções válidas no select cliente_contrato');

  const choice = valid[Math.floor(Math.random() * valid.length)];

  await native.selectOption({ value: choice.value }, { force: true });

  const display = menu.locator('#select2-id_sc_field_cliente_contato-container');
  await expect(display).toBeVisible({ timeout: 10_000 });
  await expect(display).toHaveText(choice.label, { timeout: 10_000 });

  return choice.label;
}

async function acessarCadastro(page) {
  await page.getByText('x', { exact: true }).click();
  await page.locator('img').first().click();
  await page.getByRole('link', { name: 'Empresa' }).click();
  await page.getByRole('link', { name: 'Clientes' }).click();
  await page.locator('#item_13').click();
}

async function novoAtendimentoClientesCad(page, menu){
    await waitForAjax(page);
    const atdNovoBtn =  menu.locator('#id_sc_field_btnatendnovo_1').first();
    await expect(atdNovoBtn).toBeVisible();
    await atdNovoBtn.click();
}

async function novoAtendimentoForm(page, menu){
  await waitForAjax(page);

  await expect(menu.getByText('Novo Atendimento')).toBeVisible();
  const contratoSelector = await selectContratoNative(menu, ['-c','-t', '-s']);   
  await waitForAjax(page);

  const contatoSelector = await selectContatosNative(menu);
  await waitForAjax(page);

  const situcaoSelector = await randomSelect(menu, '#id_sc_field_situacao');
}

test('Abertura de atendimentos', async ({ page, context }) => {
  // Gera o cache dos itens do inspetor.
    const menu = page.frameLocator('iframe[name="app_menu_iframe"]');
    const item5 = menu.frameLocator('iframe[name="item_5"]');
    const tb = item5.frameLocator('iframe[name^="TB_iframeContent"]');

    test.setTimeout(20000);

    await login(page);

    await acessarCadastro(page);

    await novoAtendimentoClientesCad(page, menu);

    await novoAtendimentoForm(page, menu);
});