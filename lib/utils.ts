import { Locator, Page, Frame } from '@playwright/test';
require('dotenv').config();

export async function login(page) {
  const usuario = process.env.USUARIO;
  const senha = process.env.SENHA;

  await page.goto('https://desenvtestfinal.rbxsoft.com/routerbox/app_login/index.php');
  await page.getByRole('textbox', { name: 'Usuário' }).fill(usuario);
  await page.getByRole('textbox', { name: 'Senha' }).fill(senha);
  await page.getByRole('textbox', { name: 'Senha' }).press('Enter');
}

export async function randomSelect(
  menu: Page | Frame,
  selectSelector: string,
  blacklist: string[] = ['0']
): Promise<string> {
  const select = menu.locator(selectSelector);

  await retryUntil(async () => {
    await select.waitFor({ state: 'visible', timeout: 10_000 });
    if (await select.isDisabled()) return false;
    return true;
  }, { timeout: 20_000, interval: 500 });

  const options = select.locator('option');
  const count = await options.count();
  const validOptions: string[] = [];

  for (let i = 0; i < count; i++) {
    const option = options.nth(i);
    const value = await option.getAttribute('value');
    const disabled = await option.isDisabled();
    if (value && !blacklist.includes(value) && !disabled) validOptions.push(value);
  }

  if (validOptions.length === 0) {
    throw new Error(`Erro: Sem valor selecionável para ${selectSelector}`);
  }

  const randomValue = validOptions[Math.floor(Math.random() * validOptions.length)];

  await retryUntil(async () => {
    await select.selectOption({ value: randomValue });
    const selectedValue = await select.inputValue();
    return selectedValue === randomValue;
  }, { timeout: 20_000, interval: 500 });

  return randomValue;
}

export async function randomSelect2(
  menu: Page | Frame,
  dropdownTriggerSelector: string,
  blacklist: string[] = []
): Promise<string> {
  const trigger = menu.locator(dropdownTriggerSelector);

  await retryUntil(async () => {
    await trigger.waitFor({ state: 'visible', timeout: 10_000 });
    await trigger.click();
    return true;
  }, { timeout: 20_000, interval: 500 });

  const optionsContainer = menu.locator('.select2-results__options');
  await retryUntil(async () => {
    await optionsContainer.waitFor({ state: 'visible', timeout: 10_000 });
    return true;
  }, { timeout: 20_000, interval: 500 });

  const options = optionsContainer.locator('.select2-results__option');
  const count = await options.count();
  const valid: { index: number; text: string }[] = [];

  for (let i = 0; i < count; i++) {
    const opt = options.nth(i);
    const text = (await opt.textContent())?.trim() ?? '';
    const disabled = await opt.getAttribute('aria-disabled');
    if (text && !disabled && !blacklist.some(b => text.toLowerCase().includes(b.toLowerCase()))) {
      valid.push({ index: i, text });
    }
  }

  if (!valid.length) {
    throw new Error(`Nenhuma opção válida encontrada para "${dropdownTriggerSelector}".`);
  }

  const choice = valid[Math.floor(Math.random() * valid.length)];

  await retryUntil(async () => {
    await options.nth(choice.index).click();

    const selected = options.nth(choice.index).getAttribute('aria-selected');
    const triggerText = (await trigger.textContent())?.trim() ?? '';
    return (await selected) === 'true' || triggerText === choice.text;
  }, { timeout: 20_000, interval: 500 });

  return choice.text;
}

export type ValidationOptions = {
  timeout?: number;
  allowEmpty?: boolean;
  customPattern?: RegExp;
  rejectPlaceholders?: string[];
}

export async function validateFields(
  locator: Locator,
  options: ValidationOptions = {}
): Promise<void> {
  const {
    timeout = 10_000,
    allowEmpty = false,
    customPattern = /.+/,
    rejectPlaceholders = ['selecione', '(selecione)', 'padrão'],
  } = options;

  const isRejected = (raw: string | null | undefined) => {
    const v = (raw ?? '').trim();
    if (!allowEmpty && v === '') return true;
    return rejectPlaceholders.some(p => v.toLowerCase() === p.toLowerCase());
  };

  await retryUntil(async () => {
    const value = await locator.innerText().catch(() => '');
    if (isRejected(value)) return false;
    return customPattern.test(value);
  }, { timeout, interval: 250 });
}

export async function waitForAjax(
  page: Page,
  minDelay: number = 1000,
  spinnerSelectors: string[] = ['.ajax-loader', '.blockUI', '.loading']
): Promise<void> {
  const start = Date.now();
  const initialTimeout = 1000; // Timeout inicial para visibilidade do spinner
  const hiddenTimeout = 5000; // Timeout para o spinner ficar oculto

  // console.log('WAITING FOR AJAX'); // Manter para debug se necessário

  for (const selector of spinnerSelectors) {
    const spinner = page.locator(selector);
    await retryUntil(async () => {
      try {
        await spinner.waitFor({ state: 'visible', timeout: initialTimeout }).catch(() => {});
        await spinner.waitFor({ state: 'hidden', timeout: hiddenTimeout });
        return true;
      } catch (e) {
        console.warn(`Spinner '${selector}' não se comportou como esperado: ${e}`);
        return false;
      }
    }, { timeout: initialTimeout + hiddenTimeout + 1000, interval: 250 }); 
  }

  const elapsed = Date.now() - start;
  const remaining = minDelay - elapsed;

  if (remaining > 0) {
    // console.log(`WAITING`); // Manter para debug se necessário
    await page.waitForTimeout(remaining);
  }
  // console.log('PASS'); // Manter para debug se necessário
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

export async function saveIfChanged(
  container: Locator,
  originalValue: string,
  saveButton: Locator
) {
  const newValue = (await container.textContent())?.trim() ?? '';
  if (newValue && newValue !== originalValue) {
    await saveButton.click();
    return true;
  }
  return false;
}


