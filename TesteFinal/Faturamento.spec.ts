import { test, expect, Page, FrameLocator } from '@playwright/test';
import { parsePdfBuffer } from '../lib/pdfUtils';
import { randomSelect, randomSelect2, login, waitForAjax} from '../lib/utils';
import fs from 'fs';

/* 
* teste será composto de acessar um cliente gerado pela Cad_cliente.spec.ts e efetuar o faturamento.
* Posterior ao faturamento validar o boleto, nota e fatura utilizando a lib pdf-parse (npm install pdf-parse)
*/

async function readPdfFromPage(pageWithPdf: Page) {
  const bufferData = await pageWithPdf.evaluate(async () => {
    const response = await fetch(window.location.href);
    const buffer = await response.arrayBuffer();
    return Array.from(new Uint8Array(buffer));
  });

  const buffer = Buffer.from(bufferData);
  return parsePdfBuffer({ buffer });
}

function normalizeText(text: string | null) {
  if (!text) return '0';
  // Remove R$, remove spaces, remove dots (thousands), replace comma with dot
  const clean = text.replace('R$', '').replace(/\s+/g, '').replace(/\./g, '').replace(',', '.');
  return clean.trim();
}

async function acessarCadastro(page: Page, menu: FrameLocator) {
  await page.getByText('x', { exact: true }).click();
  await page.locator('img').first().click();
  await page.getByRole('link', { name: 'Empresa' }).click();
  await page.getByRole('link', { name: 'Clientes' }).click();
  await page.getByRole('link', { name: 'Cadastro' }).click();

  // Preenche o campo de busca com o código do cliente que retorna do json criado no cadastro de cliente
  const { clienteCodigo } = JSON.parse(fs.readFileSync('customerContext.json', 'utf-8'));
  await menu.locator('#SC_fast_search_top').fill(clienteCodigo);
  await waitForAjax(page);
  await page.keyboard.press('Enter');
}

async function faturarCliente(page: Page, menu: FrameLocator) {
  const { clienteCodigo } = JSON.parse(fs.readFileSync('customerContext.json', 'utf-8')
  );
  const iframe = page
    .frameLocator('iframe[name="app_menu_iframe"]')
    .frameLocator('iframe[name^="TB_iframeContent"]');

  const mesSelector = '#id_sc_field_mes';
  const yearSelector = '#id_sc_field_ano';
  
  const rowSelector = () =>
    menu
      .locator('tr[id^="SC_ancor"]')
      .filter({
        has: menu.locator(
          'td.css_codigo_grid_line',
          { hasText: new RegExp(`^\\s*${clienteCodigo}\\s*$`) }
        )
      });
  await rowSelector().locator('a.css_btnfaturamento_grid_line').first().click();
  const meses = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];  
  let success = false;
  for (const mes of meses) {
      //console.log(`tentando faturar o mes: ${mes}`);
      await iframe.locator(yearSelector).selectOption({ label: '2026' }); 
      await iframe.locator(mesSelector).selectOption({ value: mes }); 
      await waitForAjax(page);
      
      const errorLabel = iframe.locator('#id_ajax_label_avisofaturamentoexistente');
      if (await errorLabel.isVisible()) {
          //console.log(`mes ${mes} já está faturado. Próxima tentativa.`);
          continue;
      }
      success = true;
      break; 
  }

  await randomSelect2(iframe, '#select2-id_sc_field_conta-container', ['Escolha Conta Corrente', '55555-RECEBER VINDI']);
  await waitForAjax(page);

  await randomSelect2(iframe, '#select2-id_sc_field_historico-container', ['Escolha Histórico', 'HISTÓRICO INATIVO']);

  const dialogPromise = page.waitForEvent('dialog');

  await iframe.locator('#sc_Executar_bot').click();
  await page.keyboard.press('Enter');

  const dialog = await dialogPromise;

  const message = dialog.message();
  //console.log(message);

  expect(message).toContain('Final de Processamento');

  await dialog.accept();
  //teste falhou se nenhum documento foi incluído
  expect(message).not.toContain('Incluídos 0 documentos');

  await iframe.locator('#Bsair_b').click()
}

async function armazenarDados(page: Page, menu: FrameLocator) {
  const { clienteCodigo } = JSON.parse(fs.readFileSync('customerContext.json', 'utf-8'));

  const rowSelector = () =>
    menu
      .locator('tr[id^="SC_ancor"]')
      .filter({
        has: menu.locator(
          'td.css_codigo_grid_line',
          { hasText: new RegExp(`^\\s*${clienteCodigo}\\s*$`) }
        )
      });

  // ===== CONTRATOS =====
  await rowSelector().locator('a.css_btncontratos_grid_line').first().click();
  await waitForAjax(page);

  const contratoDados = {
    valorContrato: normalizeText(await menu.locator('#id_sc_field_totalp_1').textContent()),
    descontoContrato: normalizeText(await menu.locator('#id_sc_field_desconto_1').textContent()),
  };
  await menu.locator('#sc_Voltar_top').click();
  await waitForAjax(page);

  // ===== POSIÇÃO FINANCEIRA =====
  await rowSelector().locator('a.css_btnfinanceiro_grid_line').first().click();
  await waitForAjax(page);

  const movimentoDados = {
    vencimentoDocumento: await menu.locator('#id_sc_field_movimentodata_1').textContent(),
    duplicataFinanceiro: await menu.locator('#id_sc_field_movimentodocumento_1').textContent(),

  };
  return { contratoDados, movimentoDados };
}

async function extrairDadosPDF(menu: FrameLocator, page: Page) {
  const [newPage] = await Promise.all([
    page.waitForEvent('popup'),
    menu.locator('#id_sc_field_btnimprimir_1').first().click(),
  ]);

  await waitForAjax(page);
  await newPage.bringToFront();
  const msgVencido = newPage.getByText('Imprimir boleto vencido atualizado?');
  if (await msgVencido.isVisible()) {
    await newPage.locator('#sub_form_b').click();
    await newPage.waitForLoadState('networkidle');
  }

  await newPage.waitForLoadState('networkidle');
  const pdfRawData = await readPdfFromPage(newPage);
  const pdfText = pdfRawData.text;
  //console.log('Texto extraído do PDF:', pdfText);
  await newPage.close();

  // --- REGEX  ---
  const valorMatch = pdfText.match(/Valor do documento\s+([\d.,]+)/);
  const descontoMatch = pdfText.match(/Desconto \/ Abatimentos\s+([\d.,]+)/);
  const vencMatch = pdfText.match(/\d{2}\/\d{2}\/\d{4}/);

  return {
    valorPDF: valorMatch ? normalizeText(valorMatch[1]) : '0,00',
    descontoPDF: descontoMatch ? normalizeText(descontoMatch[1]) : '0,00',
    vencimentoPDF: vencMatch ? normalizeText(vencMatch[0]) : '00/00/0000',
  };
}

async function validarDadosFinanceiros(page: Page, menu: FrameLocator,
  clienteDados: { valorContrato: string, descontoContrato: string, vencimentoContrato: string},
  dadosPdf: { valorPDF: string, descontoPDF: string, vencimentoPDF: string }) {

  // Comparação valor
  //console.log(`Validando Valor: Contrato [${clienteDados.valorContrato}] vs PDF [${dadosPdf.valorPDF}]`);
  expect(parseFloat(clienteDados.valorContrato) - parseFloat(clienteDados.descontoContrato)).toEqual(parseFloat(dadosPdf.valorPDF));

  // Comparação desconto
  //console.log(`Validando Desconto: Contrato [${clienteDados.descontoContrato}] vs PDF [${dadosPdf.descontoPDF}]`);
  expect(clienteDados.descontoContrato).toEqual(dadosPdf.descontoPDF);

  // Comparação vencimento
  //console.log(`Validando Vencimento: Contrato [${clienteDados.vencimentoContrato}] vs PDF [${dadosPdf.vencimentoPDF}]`);
  expect(clienteDados.vencimentoContrato).toEqual(dadosPdf.vencimentoPDF);
}

async function validarDadosFiscais(page: Page, menu: FrameLocator,
  clienteDados: { valorContrato: string, descontoContrato: string, duplicataFinanceiro: string }) {
  const { clienteCodigo } = JSON.parse(fs.readFileSync('customerContext.json', 'utf-8')
  );
  await menu.locator('#sc_Voltar_top').click();

  const rowSelector = () =>
    menu
      .locator('tr[id^="SC_ancor"]')
      .filter({
        has: menu.locator(
          'td.css_codigo_grid_line',
          { hasText: new RegExp(`^\\s*${clienteCodigo}\\s*$`) }
        )
      });
  await rowSelector().locator('a.css_btnfiscal_grid_line').first().click();
  {
    const rowSelector = () =>
      menu
        .locator('tr[id^="SC_ancor"]')
        .filter({
          has: menu.locator(
            'td.css_duplicatas_grid_line',
            { hasText: new RegExp(`^\\s*${clienteDados.duplicataFinanceiro}\\s*$`) }
          )
        });
    await rowSelector().locator('a.css_btnitens_grid_line').first().click();
    await waitForAjax(page, 200);

    const rows = menu.locator('tr[id^="SC_ancor"]');
    const itemsData = await Promise.all(
      (await rows.all()).map(async (row) => {
        const vlrNotaText = await row.locator('[id^="id_sc_field_vlrtotal_"]').textContent();
        const descontoText = await row.locator('[id^="id_sc_field_desconto_"]').textContent();
        const vlrNota = parseFloat(normalizeText(vlrNotaText || '0'));
        const desconto = parseFloat(normalizeText(descontoText || '0'));
        return {
          vlrNota,
          desconto,
          liquido: vlrNota - desconto
        };
      })
    );

    //console.log('Itens extraídos:', itemsData);
    const totalCalculado = itemsData.reduce((acc, item) => acc + item.liquido, 0);
    //console.log('Total Geral Calculado:', totalCalculado);
    expect(parseFloat(clienteDados.valorContrato)).toBeCloseTo(totalCalculado, 2);

  }
}

test('Faturamento', async ({ page }) => {
  // Gera o cache dos itens do inspetor.
  const menu = page.frameLocator('iframe[name="app_menu_iframe"]');
  test.setTimeout(10000);

  await login(page);
  await acessarCadastro(page, menu);
  await faturarCliente(page, menu);

  const clienteDados = await armazenarDados(page, menu);
  //console.log('Dados do Contrato Capturados:', clienteDados);

  const dadosPdf = await extrairDadosPDF(menu, page);
  //console.log('Dados do PDF Capturados:', dadosPdf);

  await validarDadosFinanceiros(page, menu,
    {
      valorContrato: clienteDados.contratoDados.valorContrato,
      descontoContrato: clienteDados.contratoDados.descontoContrato,
      vencimentoContrato: clienteDados.movimentoDados.vencimentoDocumento ?? "",
    },
    dadosPdf);

  await validarDadosFiscais(page, menu,
    {
      valorContrato: clienteDados.contratoDados.valorContrato,
      descontoContrato: clienteDados.contratoDados.descontoContrato,
      duplicataFinanceiro: clienteDados.movimentoDados.duplicataFinanceiro ?? ""
    });
});