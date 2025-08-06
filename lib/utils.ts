import { expect, Locator, Page, Frame } from '@playwright/test';
  require('dotenv').config();


export async function seletorRandomSelct(menu: any, selectSelector: string) {
  const options = menu.locator(`${selectSelector} > option`);
  const count = await options.count();

  const validOptions: string[] = [];
  for (let i = 0; i < count; i++) {
    const value = await options.nth(i).getAttribute('value');
    if (value && value !== '0') {
      validOptions.push(value);
    }
  }

  if (validOptions.length === 0) {
    throw new Error(`Erro: Sem valor selecionavel! ${selectSelector}`);
  }

  const randomValue: string = validOptions[Math.floor(Math.random() * validOptions.length)];
  await menu.locator(selectSelector).selectOption({ value: randomValue });
}

export async function seletorRandomSelct2(menu: Page | Frame, dropdownTriggerSelector: string, blacklist: string[] = []): Promise<string> {
  const trigger = menu.locator(dropdownTriggerSelector);
  await expect(trigger).toBeVisible();
  await trigger.click();

  const optionsContainer = menu.locator('.select2-results__options');
  await expect(optionsContainer).toBeVisible();

  const options = optionsContainer.locator('.select2-results__option');
  const count = await options.count();
  const validOptions: { index: number, text: string }[] = [];

  for (let i = 0; i < count; i++) {
    const option = options.nth(i);
    const text = (await option.textContent())?.trim() ?? '';
    if (text.length > 0 && !blacklist.some(bad => text.toLowerCase().includes(bad.toLowerCase()))) {
      validOptions.push({ index: i, text });
    }
  }

  if (validOptions.length === 0) {
    throw new Error('Nenhuma opção válida encontrada no Select2 dropdown.');
  }

  const random = validOptions[Math.floor(Math.random() * validOptions.length)];
  await options.nth(random.index).click();

  const selectedText = await trigger.textContent();
  const trimmed = selectedText?.trim() ?? '';
  expect(trimmed).toBe(random.text);

  return random.text;
}

export async function validaCampoPreenchidos(locator: Locator, timeout = 10000) {
  try {
    await expect(locator).toHaveValue(/.+/, { timeout });
  } catch {
    await expect(locator).toHaveText(/.+/, { timeout });
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

