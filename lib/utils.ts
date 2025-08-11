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
    await select.waitFor({ state: 'visible', timeout: 10000 });
    return true;
  }, { timeout: 20000, interval: 500 });

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
  
  await retryUntil(async () => {
    await select.selectOption({ value: randomValue });
    const selectedValue = await select.inputValue();
    return selectedValue === randomValue;
  }, { timeout: 20000, interval: 500 });

  return randomValue;
}

export async function randomSelect2(
  menu: Page | Frame,
  dropdownTriggerSelector: string,
  blacklist: string[] = []
): Promise<string> {
  const trigger = menu.locator(dropdownTriggerSelector);
  
  await retryUntil(async () => {
    await trigger.waitFor({ state: 'visible', timeout: 10000 });
    await trigger.click();
    return true;
  }, { timeout: 20000, interval: 500 });

  // Wait for dropdown options container
  const optionsContainer = menu.locator('.select2-results__options');
  
  await retryUntil(async () => {
    await optionsContainer.waitFor({ state: 'visible', timeout: 10000 });
    return true;
  }, { timeout: 20000, interval: 500 });

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
  
  await retryUntil(async () => {
    await options.nth(random.index).click();
    const selectedText = await trigger.textContent();
    const trimmed = selectedText?.trim() ?? '';
    return trimmed === random.text;
  }, { timeout: 20000, interval: 500 });

  return random.text;
}

export type ValidationOptions = {
  timeout?: number;
  allowEmpty?: boolean;
  customPattern?: RegExp;
  rejectPlaceholders?: string[]; // NEW
}

export async function validateFields(
  locator: Locator,
  options: ValidationOptions = {}
): Promise<void> {
  const {
    timeout = 10000,
    allowEmpty = false,
    customPattern = /.+/,
    // now includes 'padrão' and an explicit empty string check
    rejectPlaceholders = ['selecione', '(selecione)', 'padrão'],
  } = options;

  const isRejected = (raw: string | null | undefined) => {
    const v = (raw ?? '').trim().toLowerCase();
    if (!allowEmpty && v === '') return true; // empty is invalid when allowEmpty=false
    return rejectPlaceholders.some(p => v === p.toLowerCase());
  };
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
        // Espera o spinner aparecer, com um timeout curto. Se não aparecer, continua.
        await spinner.waitFor({ state: 'visible', timeout: initialTimeout }).catch(() => {});
        // Se o spinner apareceu, espera ele desaparecer com um timeout maior.
        await spinner.waitFor({ state: 'hidden', timeout: hiddenTimeout });
        return true;
      } catch (e) {
        // Se o spinner não desaparecer dentro do hiddenTimeout, lança um erro.
        // Ou, se a intenção é apenas ignorar spinners que não aparecem, o catch() acima já faz isso.
        // Para spinners que aparecem mas não somem, o erro será lançado pelo segundo waitFor.
        console.warn(`Spinner '${selector}' não se comportou como esperado: ${e}`);
        return false;
      }
    }, { timeout: initialTimeout + hiddenTimeout + 1000, interval: 250 }); // Aumenta o timeout para cobrir ambos os waits
  }

  // Garante um atraso mínimo, mesmo que não haja spinners visíveis
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

// comentário: salva somente se valor mudou e não está vazio
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
