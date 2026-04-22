import { expect, Locator, Page, Frame, FrameLocator } from '@playwright/test';
import {fakerPT_BR as faker} from '@faker-js/faker';
import { cpf } from 'cpf-cnpj-validator';
require('dotenv').config();

export async function randomSelect(
  menu: Page | Frame | FrameLocator,
  selectSelector: string,
  blacklist: string[] = ['0']
): Promise<string> {
  const select = menu.locator(selectSelector);
  await expect(select).toBeVisible({ timeout: 10000 });

  const currentValue = await select.inputValue().catch(() => '');
  const options = select.locator('option');
  const count = await options.count();

  const validOptions: string[] = [];

  for (let i = 0; i < count; i++) {
    const option = options.nth(i);
    const value = await option.getAttribute('value');
    const isDisabled = await option.isDisabled();

    if (
      value &&
      !blacklist.includes(value) &&
      !isDisabled
    ) {
      validOptions.push(value);
    }
  }

  if (validOptions.length === 0) {
    throw new Error(`Erro: Sem valor selecionável para ${selectSelector}`);
  }

  const candidates = validOptions.filter((value) => value !== currentValue);
  const pickList = candidates.length > 0 ? candidates : validOptions;
  const randomValue = pickList[Math.floor(Math.random() * pickList.length)];

  await select.selectOption({ value: randomValue });
  await expect(select).toHaveValue(randomValue, { timeout: 5000 });

  return randomValue;
}

export async function randomSelect2(
  menu: Page | Frame | FrameLocator,
  dropdownTriggerSelector: string,
  blacklist: string[] = []
): Promise<string> {
  const trigger = menu.locator(dropdownTriggerSelector);
  await expect(trigger).toBeVisible({ timeout: 10000 });
  await trigger.click();

  const optionsContainer = menu.locator('.select2-results__options');
  await expect(optionsContainer).toBeVisible({ timeout: 10000 });

  const options = optionsContainer.locator('.select2-results__option');
  const count = await options.count();

  const validOptions: { index: number; text: string }[] = [];

  for (let i = 0; i < count; i++) {
    const option = options.nth(i);
    const text = (await option.textContent())?.trim() ?? '';

    if (
      text.length > 0 &&
      !blacklist.some((bad) => text.toLowerCase().includes(bad.toLowerCase())) &&
      !(await option.getAttribute('aria-disabled'))
    ) {
      validOptions.push({ index: i, text });
    }
  }

  if (validOptions.length === 0) {
    throw new Error(`Nenhuma opção válida encontrada para "${dropdownTriggerSelector}".`);
  }

  const random = validOptions[Math.floor(Math.random() * validOptions.length)];
  await options.nth(random.index).click();

  const selectedText = (await trigger.textContent())?.trim() ?? '';
  expect(selectedText).toBe(random.text);

  return random.text;
}

export async function robustRandomSelect2(
  menu: Page | Frame | FrameLocator,
  dropdownTriggerSelector: string,
  blacklist: string[] = []
): Promise<string> {
  let selectedText = '';

  await retryUntil(async () => {
    const trigger = menu.locator(dropdownTriggerSelector);
    await expect(trigger).toBeVisible({ timeout: 5000 });

    const currentText = (await trigger.textContent())?.trim() ?? '';
    const isExpanded = await trigger.getAttribute('aria-expanded');
    if (isExpanded !== 'true') {
      await trigger.click();
    }

    const optionsContainer = menu.locator('.select2-results__options');
    if (!await optionsContainer.isVisible()) {
      await trigger.click();
    }

    await expect(optionsContainer).toBeVisible({ timeout: 5000 });

    const options = optionsContainer.locator('.select2-results__option:not([aria-disabled="true"])');
    const count = await options.count();

    if (count === 0) {
      await menu.keyboard.press('Escape');
      throw new Error('No options available to select, retrying...');
    }

    const validOptions: { index: number; text: string }[] = [];
    for (let i = 0; i < count; i++) {
      const option = options.nth(i);
      const text = (await option.textContent())?.trim() ?? '';

      if (text.length > 0 && !blacklist.some(b => text.toLowerCase().includes(b.toLowerCase()))) {
        validOptions.push({ index: i, text });
      }
    }

    if (validOptions.length === 0) {
      await menu.keyboard.press('Escape');
      throw new Error('No valid (non-blacklisted) options available, retrying...');
    }

    let candidates = validOptions;
    if (currentText && validOptions.length > 1) {
      const different = validOptions.filter((option) => option.text !== currentText);
      if (different.length > 0) {
        candidates = different;
      }
    }

    const random = candidates[Math.floor(Math.random() * candidates.length)];
    await options.nth(random.index).click();

    await retryUntil(async () => {
      const selectedDisplay = (await trigger.textContent())?.trim() ?? '';
      return selectedDisplay === random.text && selectedDisplay !== currentText;
    }, { timeout: 5000, interval: 250 });

    selectedText = random.text;
    return true;
  }, { timeout: 20000, interval: 1000 });

  if (selectedText === '') {
    throw new Error(`Failed to select an option for "${dropdownTriggerSelector}" after multiple retries.`);
  }

  return selectedText;
}

export type ValidationOptions = {
  timeout?: number;
  allowEmpty?: boolean;
  customPattern?: RegExp;
  rejectPlaceholders?: string[]; // NEW
};

export async function validateFields(
  locator: Locator,
  options: ValidationOptions = {}
): Promise<void> {
  const {
    timeout = 10000,
    allowEmpty = false,
    customPattern = /.+/,
    rejectPlaceholders = ['selecione', '(selecione)'], // Valor pardão para campos de select e select2
  } = options;

  try {
    const tag = await locator.evaluate((el) => el.tagName.toLowerCase());

    const isDisabled = await locator.evaluate((el) =>
      el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true'
    );
    if (isDisabled) return;

    const validationPattern = allowEmpty ? /.*/ : customPattern;

    if (['input', 'textarea', 'select'].includes(tag)) {
      const inputType = await locator.evaluate(el =>
        el.tagName === 'INPUT' ? (el as HTMLInputElement).type : null
      );

      if (inputType === 'checkbox' || inputType === 'radio') {
        await expect(locator).toBeChecked({ timeout });
        return;
      }

      await expect(locator).toHaveValue(validationPattern, { timeout });
      return;
    }

    const text = (await locator.textContent())?.trim().toLowerCase() ?? '';
    if (rejectPlaceholders.some(p => text === p.toLowerCase())) {
      throw new Error(`Campo ainda com valor placeholder: "${text}"`);
    }

    await expect(locator).toHaveText(validationPattern, { timeout });
  } catch (error) {
    const elementDescription = await locator.evaluate((el) =>
      `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${el.className ? `.${el.className.split(' ').join('.')}` : ''}`
    );
    throw new Error(
      `Validation failed for element ${elementDescription}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

export async function login(page: Page) {
  const usuario = process.env.USUARIO;
  const senha = process.env.SENHA;

  await page.goto('https://desenvtestfinal.rbxsoft.com/routerbox/app_login/index.php');
  //await page.goto('https://desenvtest-deb12.rbxsoft.com/routerbox/app_login/index.php');
  await page.getByRole('textbox', { name: 'Usuário' }).fill(usuario);
  await page.getByRole('textbox', { name: 'Senha' }).fill(senha);
  await page.getByRole('textbox', { name: 'Senha' }).press('Enter');
}

export async function waitForAjax(
  page: Page,
  minDelay: number = 1000,
  spinnerSelectors: string[] = ['.ajax-loader', '.blockUI', '.loading']
): Promise<void> {
  const start = Date.now();
  const initialTimeout = 1000; // timeout for spinner to become visible
  const hiddenTimeout = 5000;  // timeout for spinner to disappear

  for (const selector of spinnerSelectors) {
    const spinner = page.locator(selector);

    await retryUntil(async () => {
      try {
        await spinner.waitFor({ state: 'visible', timeout: initialTimeout }).catch(() => {});
        await spinner.waitFor({ state: 'hidden', timeout: hiddenTimeout });
        return true;
      } catch (e) {
        console.warn(`Spinner '${selector}' did not behave as expected: ${e}`);
        return false;
      }
    }, { timeout: initialTimeout + hiddenTimeout + 1000, interval: 250 }).catch(() => {
      // If the spinner never appeared, continue; this is a best-effort wait.
    });
  }

  // Best-effort network idle after spinner handling.
  await page.waitForLoadState('networkidle', { timeout: 2000 }).catch(() => {});

  const elapsed = Date.now() - start;
  const remaining = minDelay - elapsed;
  if (remaining > 0) {
    await page.waitForTimeout(remaining);
  }
}

export async function retryUntil(
  fn: () => Promise<boolean>,
  options: { timeout?: number; interval?: number } = {}
): Promise<void> {
  const { timeout = 10000, interval = 250 } = options;
  const start = Date.now();

  while (Date.now() - start < timeout) {
    try {
      const result = await fn();
      if (result) return;
    } catch {
      // Ignore errors during retry
    }
    await new Promise((res) => setTimeout(res, interval));
  }

  throw new Error('retryUntil: condition not met within timeout');
}

function framePath(frame: Frame): string {
  const names: string[] = [];
  let f: Frame | null = frame;
  while (f) {
    names.push(f.name() || '(no-name)');
    f = f.parentFrame();
  }
  return names.reverse().join(' → ');
}

export async function debugSelectorCounts(page: Page, selector: string) {
  // Top-level page
  const pageCount = await page.locator(selector).count().catch(() => 0);
  console.log(`page '${selector}' = ${pageCount}`);

  // All frames (includes nested)
  const frames = page.frames();
  for (const f of frames) {
    // skip main frame; we already printed "page"
    if (f === page.mainFrame()) continue;

    let count = 0;
    try { count = await f.locator(selector).count(); } catch {}
    const label = framePath(f); // e.g., "(no-name) → app_menu_iframe → init_tab"
    console.log(`frame[${label}] '${selector}' = ${count}`);
  }
}

export function normalizeText(text: string | null) {
  if (!text) return '0';
  // Remove R$, remove spaces, remove dots (thousands), replace comma with dot
  const clean = text.replace('R$', '').replace(/\s+/g, '').replace(/\./g, '').replace(',', '.');
  return clean.trim();
}

export function gerarCliente() {
  const primeiroNome = faker.person.firstName();
  const sobrenome = faker.person.lastName();
  return {
    nomeCompleto: `${primeiroNome} ${sobrenome}`,
    email: faker.internet.email({ firstName: primeiroNome, lastName: sobrenome }),
    cpf: cpf.generate(),
    cpfLimpo: cpf.generate(false), 
  };
}

export function getFrames(page: Page) {
  const menu = page.frameLocator('iframe[name="app_menu_iframe"]');
  const item5 = menu.frameLocator('iframe[name="item_5"]');
  const tb = item5.frameLocator('iframe[name^="TB_iframeContent"]');
  const iframe = page
    .frameLocator('iframe[name="app_menu_iframe"]')
    .frameLocator('iframe[name^="TB_iframeContent"]');
  let itb = iframe;
  
  return { menu, item5, tb, itb };
}

//Cadastro de contrato por parametro
export async function contratoStart(page: Page,  planName: string) {
  let { menu, tb, itb, item5 } = getFrames(page);

  await waitForAjax(page);
  const contrato = menu.getByRole('menuitem', { name: 'Contratos' });
  let Newcontrato = menu.getByTitle('Adicionar Novo Contrato para o Cliente');
  if(await contrato.isVisible()){
    itb = tb;
    await expect(contrato).toBeVisible();
    await contrato.click();
    Newcontrato = item5.getByTitle('Adicionar Novo Contrato para o Cliente');
  }

  await waitForAjax(page);
  await expect(Newcontrato).toBeVisible();
  await Newcontrato.click();

  await itb.locator('#id_sc_field_incluir').click({ force: true });
  await itb.locator('#id_sc_field_incluir').selectOption('P');

  const planos = itb.getByText('Plano *');
  await expect(planos).toBeVisible();

  await itb.getByRole('combobox', { name: '(Escolha o plano)' }).click();
  const searchInput = itb.locator('input[type="search"]');
  await searchInput.waitFor({ state: 'visible' });

  await searchInput.fill(planName);

  const options = itb.locator('.select2-results__option', {
    hasText: planName
  });

  await expect(options.first()).toBeVisible();
  await options.first().click();

  await itb.locator('#id_sc_field_assinatura').fill('14/05/2020');
  await itb.locator('#id_sc_field_inicio').fill('14/05/2020');
}

//Cadastro de contrato aleatório
export async function contratoDinamico(page: Page) {
  let { menu, tb, itb, item5 } = getFrames(page);

  await waitForAjax(page);
  const contrato = menu.getByRole('menuitem', { name: 'Contratos' });
  let Newcontrato = menu.getByTitle('Adicionar Novo Contrato para o Cliente');
  if(await contrato.isVisible()){
    itb = tb;
    await expect(contrato).toBeVisible();
    await contrato.click();
    Newcontrato = item5.getByTitle('Adicionar Novo Contrato para o Cliente');
  }

  await waitForAjax(page);
  await expect(Newcontrato).toBeVisible();
  await Newcontrato.click();

  await waitForAjax(page);
  await itb.locator('#id_sc_field_incluir').click({ force: true });
  await itb.locator('#id_sc_field_incluir').selectOption('P');

  const planos = itb.getByText('Plano *');
  await expect(planos).toBeVisible();

  await itb.getByRole('combobox', { name: '(Escolha o plano)' }).click();

  const realTrigger = itb.locator('#select2-id_sc_field_plano-container');
  await expect(realTrigger).toBeVisible();
  await realTrigger.click();

  const selectedValue = await randomSelect2(itb, '#select2-id_sc_field_plano-container', ['padrão', 'Escolha o Plano', 'Inativo']);
  const displayed = await itb.locator('#select2-id_sc_field_plano-container').textContent();
  expect(displayed?.trim()).toBe(selectedValue);

  await itb.locator('#id_sc_field_assinatura').fill('14/05/2020');
  await itb.locator('#id_sc_field_inicio').fill('14/05/2020');
}

// Cadastro finalização
export async function contratoFinaliza(page: Page) {
  let { menu, tb, itb } = getFrames(page);

  const contrato = menu.getByRole('menuitem', { name: 'Contratos' });
  if(await contrato.isVisible()){
    itb = tb;
    await expect(contrato).toBeVisible();
  }

  await expect(itb.locator('#sc_Confirmar_bot')).toBeVisible({ timeout: 10000 });
  await itb.locator('#sc_Confirmar_bot').click();

  await expect.soft(itb.getByText('Confirma inclusão do(s)')).toBeVisible();
  if (await itb.getByText('Confirma inclusão do(s)').isVisible()) {
    await page.keyboard.press('Enter');
  }

  await itb.getByText('Contrato incluído com sucesso!').waitFor({ state: 'visible' });
  await page.keyboard.press('Enter');

  const contratoSair = itb.getByTitle('Sair da página');
  await expect(contratoSair).toBeVisible();
  await contratoSair.click();  
}

// Valida campos opcionais
export async function camposOpcionaisContratos(page: Page) {
  let { menu, tb, itb } = getFrames(page);

  const contrato = menu.getByRole('menuitem', { name: 'Contratos' });
  if(await contrato.isVisible()){
    itb = tb;
    await expect(contrato).toBeVisible();
  }
  //Endereço de Instalação
  {
    const edInstLabel = itb.locator('#div_hidden_bloco_14').getByText('Endereço de Instalação');
    await expect(edInstLabel).toBeVisible();
    const edInst = (await edInstLabel.textContent())?.trim() ?? '';
    if (edInst && edInst.includes("*")) {
      await itb.locator('#id-opt-enderecoinstalacao-1').check();
      await page.waitForLoadState('networkidle');
      await expect(itb.locator('#id_label_cep')).toBeVisible();

      await itb.locator('#id_sc_field_cep').click();
      await page.keyboard.type('20011000');

      const CEPInput = itb.locator('#id_sc_field_cep');
      await validateFields(CEPInput);

      const contrNumeroTxt = itb.locator('#id_sc_field_numend');
      await contrNumeroTxt.click();
      await page.keyboard.type('123');

      const contrCidadeInput = itb.locator('#id_sc_field_cidade');
      await validateFields(contrCidadeInput);
    }
  }
  //Endereço cobrança
  {
    const edInstLabel = itb.locator("#hidden_bloco_16").getByText('Endereço de Cobrança');
    await expect(edInstLabel).toBeVisible();
    const edInst = (await edInstLabel.textContent())?.trim() ?? '';
    if (edInst && edInst.includes("*")) {
      await itb.locator('#id-opt-enderecocobranca-1').check();
      await page.waitForLoadState('networkidle');
      await expect(itb.locator('#id_sc_field_cobr_cep')).toBeVisible();

      await itb.locator('#id_sc_field_cobr_cep').click();
      await page.keyboard.type('20011000');

      const CEPInput = itb.locator('#id_sc_field_cobr_cep');
      await validateFields(CEPInput);

      const contrNumeroTxt = itb.locator('#id_sc_field_cobr_numend');
      await contrNumeroTxt.click();
      await page.keyboard.type('321');

      const contrCidadeInput = itb.locator('#id_sc_field_cobr_cidade');
      await validateFields(contrCidadeInput);
    }
  }
  //Terceiros
  {
    const cptLocator = itb.locator('#id_label_pterceiro');
    if (await cptLocator.isVisible()) {
      await randomSelect(itb, '#id_sc_field_pterceiro', ['Selecione um Terceiro','(Selecione um Terceiro)']);
    }

    const cdtLocator = itb.locator('#id_label_dterceiro');
    if (await cdtLocator.isVisible()) {
      await randomSelect(itb, '#id_sc_field_dterceiro', ['Selecione um Terceiro','(Selecione um Terceiro)']);
    }
  }
}

// Processo de ativação dos contratos
export async function contratoAtiva(page: Page){
  let { menu, item5 } = getFrames(page);
  const contrato = menu.getByRole('menuitem', { name: 'Contratos' });
  if(await contrato.isVisible()){
    menu = item5;
    await expect(contrato).toBeVisible();
  }
  const allBtns = '[id^="id_sc_field_btnativar_"]';
  while (true) {
    const btn = menu.locator(allBtns).first();
    if (await btn.count() === 0) {
      break;
    }

    if (!(await btn.isVisible())) {
      break;
    }
    await btn.click();

    await menu.getByTitle('Confirmar alterações').click();
    await waitForAjax(page);
  }
}

// Usado no processo de cancelamento dos contratos, para clicrar no salvar e tratar os prompts de confirmação.
export async function findAndClickConfirmAndHandleDialog(page: Page, timeout: number = 5000) {
  const sel = '#sc_Confirmar_bot';

  // 1) print frames (diagnostic)
  console.log('Frames on page:');
  for (const f of page.frames()) {
    console.log(`- name: "${f.name() || '(no-name)'}", url: ${f.url()}`);
  }

  // 2) find the frame that contains the button
  let frameWithBtn: import('playwright').Frame | undefined;
  for (const f of page.frames()) {
    try {
      const handle = await f.$(sel);
      if (handle) {
        frameWithBtn = f;
        await handle.dispose();
        console.log('Found selector in frame:', f.name() || '(no-name)', f.url());
        break;
      }
    } catch (e) {
      console.warn('Frame query failed for frame', f.name(), e);
    }
  }

  if (!frameWithBtn) {
    throw new Error(`Selector ${sel} not found in any frame.`);
  }

  // 3) Attach dialog handler BEFORE the click so native confirm/alert will be captured.
  let dialogHandled = false;
  const dialogPromise = new Promise<{ type: string; message: string }>((resolve) => {
    const handler = async (dialog: import('playwright').Dialog) => {
      try {
        console.log('Dialog appeared:', dialog.type(), dialog.message());
        // Accept by default (change if you need to dismiss)
        await dialog.accept();
        dialogHandled = true;
        resolve({ type: dialog.type(), message: dialog.message() });
      } catch (err) {
        console.warn('Error while handling dialog', err);
        resolve({ type: 'error', message: String(err) });
      } finally {
        page.off('dialog', handler);
      }
    };
    page.on('dialog', handler);
  });

  // 4) Dump function source of scBtnFn_Confirmar for inspection (if exists)
  try {
    const src = await frameWithBtn.evaluate(() => {
      // @ts-ignore
      const fn = (window as any).scBtnFn_Confirmar;
      return fn ? fn.toString() : null;
    });
    console.log('scBtnFn_Confirmar source (truncated):', src ? src.slice(0, 1000) : 'NOT FOUND');
  } catch (e) {
    console.warn('Could not evaluate scBtnFn_Confirmar source:', e);
  }

  // 5) Start waiting for known custom modal selectors (SweetAlert, Bootbox, Bootstrap modal) in parallel
  const modalSelectors = [
    'body .swal2-popup',     // SweetAlert2
    'body .swal-modal',      // SweetAlert older
    'body .bootbox',         // Bootbox
    'body .modal.show',      // Bootstrap modal (visible)
    '[role="dialog"] .confirm, [role="dialog"] .btn-primary', // generic dialog confirm
  ];

  const modalPromise = (async () => {
    for (const selModal of modalSelectors) {
      try {
        // check inside frame (the modal might be in the same frame)
        const locator = frameWithBtn.locator(selModal);
        await locator.waitFor({ timeout: 1200 }).then(() => {
          return selModal;
        });
        return selModal;
      } catch {}
      // Also check in top page as some modals are appended to top document
      try {
        const locatorTop = page.locator(selModal);
        await locatorTop.waitFor({ timeout: 1200 }).then(() => {
          return selModal;
        });
        return selModal;
      } catch {}
    }
    // no modal found
    return null;
  })();

  // 6) Try to click the button (frame.click + fallback strategies)
  let clickSucceeded = false;
  try {
    console.log('Attempting frame.click(...)');
    await frameWithBtn.click(sel, { timeout: 3000 });
    clickSucceeded = true;
    console.log('Clicked using frame.click');
  } catch (e) {
    console.warn('frame.click failed, trying elementHandle click and DOM click', e);
    try {
      const handle = await frameWithBtn.$(sel);
      if (handle) {
        await handle.click({ timeout: 2000 }).catch(() => {});
        // fallback DOM click
        await frameWithBtn.evaluate((s) => {
          const el = document.querySelector(s) as HTMLElement | null;
          if (el) el.click();
        }, sel).catch(() => {});
        await handle.dispose();
        clickSucceeded = true;
        console.log('Tried elementHandle.click + DOM click fallback');
      }
    } catch (err2) {
      console.warn('elementHandle click fallback failed', err2);
    }
  }

  // 7) Wait for either native dialog or modal DOM up to overall timeout
  const overallTimeout = timeout;
  const start = Date.now();
  let performedAction = false;

  try {
    // race between dialogPromise and modal detection
    const race = await Promise.race([
      dialogPromise,
      modalPromise,
      new Promise((res) => setTimeout(() => res(null), overallTimeout)),
    ]);

    if (race && (race as any).type) {
      // native dialog handled earlier by page.on('dialog')
      console.log('Native dialog handled:', race);
      performedAction = true;
    } else if (race && typeof race === 'string') {
      // modal selector name returned: click its confirm button
      const modalSel = race as string;
      console.log('Detected modal by selector:', modalSel);
      // Try to click confirm button inside the modal
      const confirmSelectors = ['.swal2-confirm', '.confirm', '.btn-primary', '.btn-success', 'button[data-action="confirm"]'];
      let clickedModalConfirm = false;
      // Try in frame first
      for (const cs of confirmSelectors) {
        try {
          const locator = frameWithBtn.locator(`${modalSel} ${cs}`);
          if (await locator.count() > 0) {
            await locator.first().click({ timeout: 2000 }).catch(() => {});
            clickedModalConfirm = true;
            console.log('Clicked modal confirm via frame locator', cs);
            break;
          }
        } catch {}
        // try global page
        try {
          const topLocator = page.locator(`${modalSel} ${cs}`);
          if (await topLocator.count() > 0) {
            await topLocator.first().click({ timeout: 2000 }).catch(() => {});
            clickedModalConfirm = true;
            console.log('Clicked modal confirm via page locator', cs);
            break;
          }
        } catch {}
      }
      if (!clickedModalConfirm) {
        console.warn('Modal was detected but no confirm button matched known selectors.');
      } else {
        performedAction = true;
      }
    } else {
      console.log('No native dialog or known modal detected within timeout');
    }
  } catch (e) {
    console.warn('Error while waiting for dialog/modal:', e);
  }

  // 8) If no dialog or modal observed, try calling the onclick handler directly (last resort)
  if (!dialogHandled && !performedAction) {
    console.log('No dialog/modal observed after click. Trying to call scBtnFn_Confirmar() directly as a fallback.');
    try {
      const res = await frameWithBtn.evaluate(() => {
        // @ts-ignore
        if (typeof (window as any).scBtnFn_Confirmar === 'function') {
          try {
            // @ts-ignore
            (window as any).scBtnFn_Confirmar();
            return 'called-scBtnFn_Confirmar';
          } catch (err) {
            return { error: String(err) };
          }
        }
        return 'no-scBtnFn_Confirmar';
      });
      console.log('Direct call result:', res);
    } catch (e) {
      console.warn('Direct call failed:', e);
    }
  }

  // 9) Final diagnostic: check if any known confirm modal is present now and print relevant HTML for manual inspection
  try {
    for (const selModal of modalSelectors) {
      try {
        const countFrame = await frameWithBtn.locator(selModal).count();
        if (countFrame > 0) {
          console.log('Modal present in frame with selector:', selModal);
          const html = await frameWithBtn.locator(selModal).first().innerHTML();
          console.log('Modal HTML (truncated):', html.slice(0, 1000));
          break;
        }
        const countTop = await page.locator(selModal).count();
        if (countTop > 0) {
          console.log('Modal present in top page with selector:', selModal);
          const htmlTop = await page.locator(selModal).first().innerHTML();
          console.log('Top modal HTML (truncated):', htmlTop.slice(0, 1000));
          break;
        }
      } catch {}
    }
  } catch (e) {
    /* ignore */
  }

  // Ensure the page event listener is cleaned (if any left)
  // Note: the dialog handler removes itself on resolve; this is defensive:
  try {
    page.removeAllListeners?.('dialog');
  } catch {}
}
