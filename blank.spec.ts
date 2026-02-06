import { test, chromium, expect, FrameLocator, Page, Frame } from '@playwright/test';
import {
  debugSelectorCounts, randomSelect, randomSelect2, login, waitForAjax, getFrames, validateFields, normalizeText,
  contratoStart, contratoFinaliza, gerarCliente
} from './lib/utils';
import { parsePdfBuffer } from './lib/pdfUtils';
import fs, { watch } from 'fs';
import { count, debug } from 'console';
import { REPL_MODE_SLOPPY } from 'repl';
import { fakerPT_BR as faker } from '@faker-js/faker';

async function contratoCancelamento(page: Page, planoNome: string, dataC: string) {
  let { menu, tb } = getFrames(page);

  await waitForAjax(page);

  const contrato = menu.getByRole('menuitem', { name: 'Contratos' });
  if (await contrato.isVisible()) {
    menu = tb;
    await expect(contrato).toBeVisible();
  }

  const rowSelector = () =>
    menu
      .locator('tr[id^="SC_ancor"]')
      .filter({
        has: menu.locator(
          'td.css_plano_grid_line',
          { hasText: new RegExp(`^\\s*${planoNome}\\s*$`) }
        )
      });
  await rowSelector().locator('a.css_btncancelar_grid_line').first().click();
  await waitForAjax(page);

  await menu.locator('#id_sc_field_cancelamento').click();
  await page.keyboard.type(dataC);
  await randomSelect2(menu, '#select2-id_sc_field_motivo-container', ['Selecione, (Selecione)']);
  await waitForAjax(page);

  const multaLabel = await menu.locator('#id_label_vlormulta');
  if (await multaLabel.isVisible()) {
    const multaValor = await menu.locator('#id_ajax_label_vlormulta').textContent();
    const valorLimpo = multaValor ? multaValor.replace(/[^\d,]/g, '').replace(',', '.'): '0'; 
    const mvFinal = parseFloat(valorLimpo);
    expect(mvFinal).toBeGreaterThan(0);
    console.log(mvFinal);

    await menu.locator('#sc_Confirmar_bot').click();
    const dialogPromise = page.waitForEvent('dialog');
    await page.keyboard.press('enter');
    const dialog = await dialogPromise;
    await dialog.accept();
  }
  test.fail;
}

test('Run on existing Chrome', async () => {
  test.setTimeout(50000);
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const context = browser.contexts()[0];
  const page = context.pages()[0];
  const menu = page.frameLocator('iframe[name="app_menu_iframe"]');

  await contratoCancelamento(page, '8-Multa cancelamento', '14/07/2020');
});