import { test, expect, Locator, Page, Frame} from '@playwright/test';
import { randomSelect, randomSelect2, login, validateFields } from '../lib/utils';

// Fluxo principal do teste
test('Ajax Test', async ({ page, context }) => {
  // Gera o cache dos itens do inspetor.
  const menu = page.frameLocator('iframe[name="app_menu_iframe"]');
  const item5 = menu.frameLocator('iframe[name="item_5"]');
  const tb = item5.frameLocator('iframe[name^="TB_iframeContent"]');

  test.setTimeout(70000);

  await login(page);
});