import { expect, Locator, Page, Frame } from '@playwright/test';
  require('dotenv').config();


export async function randomSelect(
  menu: Page | Frame,
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
  menu: Page | Frame,
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

export async function login(page) {
  const usuario = process.env.USUARIO;
  const senha = process.env.SENHA;

  await page.goto('https://desenvtestfinal.rbxsoft.com/routerbox/app_login/index.php');
  await page.getByRole('textbox', { name: 'Usuário' }).fill(usuario);
  await page.getByRole('textbox', { name: 'Senha' }).fill(senha);
  await page.getByRole('textbox', { name: 'Senha' }).press('Enter');
}

