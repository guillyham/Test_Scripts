import { test, chromium, expect, FrameLocator, Page, Frame } from '@playwright/test';
import { randomSelect, randomSelect2, login, waitForAjax} from './lib/utils';

//Para utilizar esse recurso cole o seguinte comando no terminal
//Start-Process "C:\Program Files\Google\Chrome\Application\chrome.exe" -ArgumentList "--remote-debugging-port=9222 --user-data-dir=C:\temp\chrome_debug"

async function test1(menu: FrameLocator, page: Page) {
    await waitForAjax(page,5000);
    await menu.getByTitle('Abrir um novo registro').first().click();
}

async function test2(page: FrameLocator) {
    await page.getByTitle('Incluir registro(s)').first().click();
}

test('Run on existing Chrome', async () => {
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    const context = browser.contexts()[0];
    const page = context.pages()[0];

    const menu = page.frameLocator('iframe[name="app_menu_iframe"]');
    const item5 = menu.frameLocator('iframe[name="item_5"]');
    const tb = item5.frameLocator('iframe[name^="TB_iframeContent"]');

    await test1(menu, page);
    await test2(menu);
});