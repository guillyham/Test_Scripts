import { test, expect, FrameLocator, Page, Frame } from '@playwright/test';
import { randomSelect, randomSelect2, login, waitForAjax} from '../lib/utils';


async function selectContratoNative(menu: Page | Frame | FrameLocator, blacklist: string[] = []): Promise<string> {
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

async function selectContatosNative(menu: Page | Frame | FrameLocator, blacklist: string[] = []): Promise<string> {
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

function getAtendimentoFrame(page: Page) {
  const appMenu = page.frameLocator('iframe[name="app_menu_iframe"]');
  return appMenu.frameLocator('iframe[name^="atend_Novo"]');
}

type ResolveOpts = {
  waitForAtend?: boolean;
  timeoutMs?: number;
};

async function resolveAtendimentoScope(
  page: Page,
  appMenuFrame: FrameLocator,
  opts: ResolveOpts = {}
): Promise<FrameLocator> {
  const { waitForAtend = false, timeoutMs = 8000 } = opts;
  const findAtend = () => page.frames().find(f => (f.name() || '').startsWith('atend_Novo'));
  if (findAtend()) {
    return appMenuFrame.frameLocator('iframe[name^="atend_Novo"]');
  }

  if (waitForAtend) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (findAtend()) {
        return appMenuFrame.frameLocator('iframe[name^="atend_Novo"]');
      }
      await page.waitForTimeout(150);
    }
  }
  return appMenuFrame;
}

async function runNovoAtendimentoFlow(
  page: Page,
  appMenuFrame: FrameLocator,
  opts: ResolveOpts = {}
) {
  const scope = await resolveAtendimentoScope(page, appMenuFrame, opts);

  await novoAtendimentoForm(page, scope);
  await camposOpcionaisNovoAtendimento(page, scope);
  await novoAtendimentoExecFinalizar(page, scope);
}

async function informativo(page: Page) {
  await page.getByText('x', { exact: true }).click();
  await page.locator('img').first().click();
}

async function novoAtendimentoClientesCad(page: Page, menu: FrameLocator) {
  await page.getByRole('link', { name: 'Empresa' }).click();
  await page.getByRole('link', { name: 'Clientes' }).click();
  await page.locator('#item_13').click();

  await waitForAjax(page);
  const atdNovoBtn = menu.locator('#id_sc_field_btnatendnovo_1').first();
  await expect(atdNovoBtn).toBeVisible();
  await atdNovoBtn.click();
}

async function novoAtendimentoExecucao(page: Page, menu: FrameLocator) {
  await page.locator('img').first().click();
  await page.getByRole('link', { name: 'Atendimento' }).click();
  await page.locator('#item_59').click();
  await waitForAjax(page, 1000);

  const appMenuFrame = page.frameLocator('iframe[name="app_menu_iframe"]');
  const initTabFrame = appMenuFrame.frameLocator('iframe[name="init_tab"]');

  const atdNovoBtn = initTabFrame.getByTitle('Incluir um novo atendimento');
  await expect(atdNovoBtn).toBeVisible();
  await atdNovoBtn.click();
  await waitForAjax(page);

  const atend = getAtendimentoFrame(page);
  await atend.locator('#id_sc_field_tipocli').selectOption({ value: 'C' })
  await waitForAjax(page);

  await expect(atend.locator('#id_label_cliente_codigo')).toBeVisible();
  const clienteCodigo = atend.locator('#id_sc_field_cliente_codigo');
  await clienteCodigo.click();
  await page.keyboard.type("1");
  await page.keyboard.press('Tab');
  await waitForAjax(page);
}

async function novoAtendimentoForm(page: Page, menu: FrameLocator) {
  await waitForAjax(page);

  await expect(menu.getByText('Novo Atendimento')).toBeVisible();
  await selectContratoNative(menu, ['-c', '-t', '-s']);
  await waitForAjax(page);

  await randomSelect(menu, '#id_sc_field_situacao');

  const informarSelector = await randomSelect(menu, '#id_sc_field_topflux', ['selecione', '(selecione)']);
  await waitForAjax(page, 500);

  if (informarSelector === 'F') {
    await randomSelect2(menu, '#select2-id_sc_field_fluxo-container', ['selecione', '(selecione)']);
    await waitForAjax(page);
  }
  else {
    await randomSelect(menu, '#id_sc_field_tipo', ['selecione', '(selecione)']);
    await waitForAjax(page);

    await randomSelect2(menu, '[role="combobox"][aria-labelledby="select2-id_sc_field_topico-container"]');
    await waitForAjax(page);
  }

  const atdAssunto = await menu.locator('#id_sc_field_assunto');
  await atdAssunto.click();
  await page.keyboard.type("Atendimento aberto pelo teste automatizado.");
}

async function camposOpcionaisNovoAtendimento(page: Page, menu: FrameLocator) {
  {//Campo contato
    const contatoLabel = menu.locator("#id_label_cliente_contato");
    await expect(contatoLabel).toBeVisible();
    const contato = (await contatoLabel.textContent())?.trim() ?? '';
    if (contato && contato.includes("*")) {
      await selectContatosNative(menu);
      await waitForAjax(page);
    } else {
      console.log('Erro selecionado um contato')
    }
  }

  {//campo estimulo de markeing
    const l1 = menu.locator('#id_label_estmark');
    const l2 = menu.locator('#id_label_estmarkfluxo');

    const target = (await l1.isVisible()) ? l1 : l2;
    const required = ((await target.textContent()) ?? '').includes('*');
    const visible = await target.isVisible();

    if (required && visible) {
      await randomSelect2(menu, '[role="combobox"][aria-labelledby="select2-id_sc_field_estmarkfluxo-container"]')
    }
  }
}

async function novoAtendimentoFinalizar(page: Page, menu: FrameLocator) {
  await menu.locator('#sub_form_b').click();
  await waitForAjax(page);

  const appMenuFrame = page.frameLocator('iframe[name="app_menu_iframe"]');
  await expect(appMenuFrame.getByText('Assunto/Solução')).toBeVisible();

  const assunto = menu.locator('#id_sc_field_assunto');
  await expect(assunto).toBeVisible();
  await expect(assunto).toHaveValue('Atendimento aberto pelo teste automatizado.');
  await expect(menu.locator('#id_sc_field_ndesignar')).toHaveValue('N');
}

async function novoAtendimentoExecFinalizar(page: Page, menu: FrameLocator) {
  await menu.locator('#sub_form_b').click();
  await waitForAjax(page);
}

test('Abertura de atendimentos', async ({ page }) => {
  // Gera o cache dos itens do inspetor.
  const menu = page.frameLocator('iframe[name="app_menu_iframe"]');
  const item5 = menu.frameLocator('iframe[name="item_5"]');
  const tb = item5.frameLocator('iframe[name^="TB_iframeContent"]');

  test.setTimeout(80000);

  await login(page);

  await informativo(page);

  const appMenu = page.frameLocator('iframe[name="app_menu_iframe"]');

  await novoAtendimentoClientesCad(page, menu);
    await novoAtendimentoForm(page, menu);
    await camposOpcionaisNovoAtendimento(page, menu);
    await novoAtendimentoFinalizar(page, menu);
  
    await novoAtendimentoExecucao(page, appMenu);
    await runNovoAtendimentoFlow(page, appMenu, { waitForAtend: true });
});