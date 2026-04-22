//Start-Process "C:\Program Files\Google\Chrome\Application\chrome.exe" -ArgumentList "--remote-debugging-port=9222 --user-data-dir=C:\temp\chrome_debug"
import { test, chromium, expect, FrameLocator, Page, Frame } from '@playwright/test';
import {
  debugSelectorCounts, randomSelect, randomSelect2, login, waitForAjax, getFrames, validateFields, normalizeText,
  contratoStart, contratoFinaliza, gerarCliente, findAndClickConfirmAndHandleDialog
} from './lib/utils';
import { parsePdfBuffer } from './lib/pdfUtils';
import { fakerPT_BR as faker } from '@faker-js/faker';
import { debug } from 'node:console';





test('Run on existing Chrome', async () => {
  test.setTimeout(80000);
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const context = browser.contexts()[0];
  const page = context.pages()[0];
  const menu = page.frameLocator('iframe[name="app_menu_iframe"]');

  //await contratoCancelamento(page, "8-Multa cancelamento", "14/05/2020");

  //await login(page);
  //await acessarPlanos(page, menu);

});