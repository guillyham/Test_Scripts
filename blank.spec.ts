import { test, chromium, expect, FrameLocator, Page, Frame } from '@playwright/test';
import { debugSelectorCounts, randomSelect, randomSelect2, login, waitForAjax, validateFields } from './lib/utils';
import { parsePdfBuffer } from './lib/pdfUtils';
import fs, { watch } from 'fs';
import { count } from 'console';
import { REPL_MODE_SLOPPY } from 'repl';

test('Run on existing Chrome', async () => {
  test.setTimeout(40000);
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const context = browser.contexts()[0];
  const page = context.pages()[0];

  const menu = page.frameLocator('iframe[name="app_menu_iframe"]');

});
