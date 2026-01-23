import { test, chromium, expect, FrameLocator, Page, Frame } from '@playwright/test';
import { debugSelectorCounts, randomSelect, randomSelect2, login, waitForAjax, validateFields, normalizeText,
        contratoStart, contratoFinaliza, camposOpcionaisContratos } from './lib/utils';
import { parsePdfBuffer } from './lib/pdfUtils';
import fs, { watch } from 'fs';
import { count, debug } from 'console';
import { REPL_MODE_SLOPPY } from 'repl';


test('Run on existing Chrome', async () => {
  test.setTimeout(10000);
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const context = browser.contexts()[0];
  const page = context.pages()[0];
  const menu = page.frameLocator('iframe[name="app_menu_iframe"]');

  const newPage = await context.newPage();
  //await gerarCliente(newPage);
  await contratoStart(page, "8-Multa Cancelamento")
  await contratoFinaliza(page);
  await camposOpcionaisContratos(page, newPage)

});