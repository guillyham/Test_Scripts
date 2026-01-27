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

  const randomValue = validOptions[Math.floor(Math.random() * validOptions.length)];
  await select.selectOption({ value: randomValue });

  await expect(select).toHaveValue(randomValue);

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

  // Wait for dropdown options container
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
      !(await option.getAttribute('aria-disabled')) // avoid disabled
    ) {
      validOptions.push({ index: i, text });
    }
  }

  if (validOptions.length === 0) {
    throw new Error(`Nenhuma opção válida encontrada para "${dropdownTriggerSelector}".`);
  }

  const random = validOptions[Math.floor(Math.random() * validOptions.length)];
  await options.nth(random.index).click();

  // Validate selection reflected
  const selectedText = await trigger.textContent();
  const trimmed = selectedText?.trim() ?? '';

  expect(trimmed).toBe(random.text);

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

    // FIX: Check state to avoid "Toggle Trap" (opening then closing in loop)
    const isExpanded = await trigger.getAttribute('aria-expanded');
    if (isExpanded !== 'true') {
      await trigger.click();
    }

    const optionsContainer = menu.locator('.select2-results__options');
    // Ensure it opened; if not, click might have failed or state was desynced
    if (!await optionsContainer.isVisible()) {
        await trigger.click(); 
    }
    
    await expect(optionsContainer).toBeVisible({ timeout: 5000 });

    // Filter valid options
    const options = optionsContainer.locator('.select2-results__option:not([aria-disabled="true"])');
    const count = await options.count();

    if (count === 0) {
      // Force close to reset state for next retry if empty
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

    const random = validOptions[Math.floor(Math.random() * validOptions.length)];
    await options.nth(random.index).click();

    // Verification
    const selectedDisplay = menu.locator(dropdownTriggerSelector);
    await expect(selectedDisplay).toContainText(random.text, { timeout: 3000 });
    
    selectedText = random.text;
    return true; 
    
  }, { timeout: 20000, interval: 1000 }); // Increased timeout and interval

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

  // console.log('WAITING FOR AJAX'); // enable for debug if needed

  for (const selector of spinnerSelectors) {
    const spinner = page.locator(selector);
    await retryUntil(async () => {
      try {
        // Wait briefly for spinner to appear, ignore if it doesn’t
        await spinner.waitFor({ state: 'visible', timeout: initialTimeout }).catch(() => {});
        // If spinner appeared, then wait for it to disappear
        await spinner.waitFor({ state: 'hidden', timeout: hiddenTimeout });
        return true;
      } catch (e) {
        // If spinner didn’t behave, log + retry
        console.warn(`Spinner '${selector}' did not behave as expected: ${e}`);
        return false;
      }
    }, { timeout: initialTimeout + hiddenTimeout + 1000, interval: 250 });
  }

  // Guarantee a minimum delay even if no spinners were visible
  const elapsed = Date.now() - start;
  const remaining = minDelay - elapsed;
  if (remaining > 0) {
    await page.waitForTimeout(remaining);
  }

  // console.log('PASS'); // enable for debug if needed
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

// Cadastro do contrato
// export async function contratoStart(page: Page,  planName: string) {
//   const menu = page.frameLocator('iframe[name="app_menu_iframe"]');
//   const item5 = menu.frameLocator('iframe[name="item_5"]');
//   const tb = item5.frameLocator('iframe[name^="TB_iframeContent"]');

//   await waitForAjax(page);
//   const contrato = menu.getByRole('menuitem', { name: 'Contratos' });
//   await expect(contrato).toBeVisible();
//   await contrato.click();

//   const Newcontrato = item5.getByTitle('Adicionar Novo Contrato para');
//   await expect(Newcontrato).toBeVisible();
//   await Newcontrato.click();

//   await tb.locator('#id_sc_field_incluir').click({ force: true });
//   await tb.locator('#id_sc_field_incluir').selectOption('P');

//   const planos = tb.getByText('Plano *');
//   await expect(planos).toBeVisible();

//   await tb.getByRole('combobox', { name: '(Escolha o plano)' }).click();
//   const searchInput = tb.locator('input[type="search"]');
//   await searchInput.waitFor({ state: 'visible' });

//   await searchInput.fill(planName);

//   const options = tb.locator('.select2-results__option', {
//     hasText: planName
//   });

//   await expect(options.first()).toBeVisible();
//   await options.first().click();

//   await tb.locator('#id_sc_field_assinatura').fill('14/05/2020');
//   await tb.locator('#id_sc_field_inicio').fill('14/05/2020');
// }

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
export async function camposOpcionaisContratos(page: Page, newPage: Page) {
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
      await expect(itb.locator('#id_label_cep')).toBeVisible();

      await newPage.bringToFront();
      await newPage.locator('#cep span').nth(1).click();
      await page.bringToFront();
      await itb.locator('#id_sc_field_cep').click();
      await page.keyboard.press('Control+V');

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
      await expect(itb.locator('#id_sc_field_cobr_cep')).toBeVisible();

      await newPage.bringToFront();
      await newPage.locator('#cep span').nth(1).click();
      await page.bringToFront();
      await itb.locator('#id_sc_field_cobr_cep').click();
      await page.keyboard.press('Control+V');

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
  {}
}

// Processo de ativação dos contratos
export async function contratoAtiva(page: Page){
  let { menu, tb, itb, item5 } = getFrames(page);

  const contrato = menu.getByRole('menuitem', { name: 'Contratos' });
  if(await contrato.isVisible()){
    itb = tb;
    await expect(contrato).toBeVisible();
  }
  const allBtns = '[id^="id_sc_field_btnativar_"]';
  while (true) {
    const btn = item5.locator(allBtns).first();
    if (await btn.count() === 0) {
      break;
    }

    if (!(await btn.isVisible())) {
      break;
    }
    await btn.click();

    await item5.getByTitle('Confirmar alterações').click();
    await waitForAjax(page);
  }
}