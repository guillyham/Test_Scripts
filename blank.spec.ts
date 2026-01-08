import { test, chromium, expect, FrameLocator, Page, Frame } from '@playwright/test';
import { debugSelectorCounts, randomSelect, randomSelect2, login, waitForAjax } from './lib/utils';
import { parsePdfBuffer } from './lib/pdfUtils';
import fs from 'fs';
import { count } from 'console';

/*Para utilizar esse recurso cole o seguinte comando no terminal
Start-Process "C:\Program Files\Google\Chrome\Application\chrome.exe" -ArgumentList "--remote-debugging-port=9222 --user-data-dir=C:\temp\chrome_debug"
*/




test('Run on existing Chrome', async () => {
  test.setTimeout(60000);
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const context = browser.contexts()[0];
  const page = context.pages()[0];

  const menu = page.frameLocator('iframe[name="app_menu_iframe"]');


});
