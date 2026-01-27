import { test, chromium, expect, FrameLocator, Page, Frame } from '@playwright/test';
import { debugSelectorCounts, randomSelect, randomSelect2, login, waitForAjax, getFrames, validateFields, normalizeText,
        contratoStart, contratoFinaliza, gerarCliente } from './lib/utils';
import { parsePdfBuffer } from './lib/pdfUtils';
import fs, { watch } from 'fs';
import { count, debug } from 'console';
import { REPL_MODE_SLOPPY } from 'repl';
import {fakerPT_BR as faker} from '@faker-js/faker';

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

test('Run on existing Chrome', async () => {
  test.setTimeout(10000);
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const context = browser.contexts()[0];
  const page = context.pages()[0];
  const menu = page.frameLocator('iframe[name="app_menu_iframe"]');

  //const newPage = await context.newPage();

  //await gerarCliente(newPage);

 // await page.bringToFront();
  //await contratoStart(page, "8-Multa Cancelamento");
  //await camposOpcionaisContratos(page);
  //await contratoFinalizas(page);
  await contratoAtiva(page);
});