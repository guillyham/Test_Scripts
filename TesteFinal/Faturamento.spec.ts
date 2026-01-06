import { test, expect, Locator, Page, FrameLocator} from '@playwright/test';
import { parsePdfBuffer } from '../lib/pdfUtils';
import { randomSelect, randomSelect2, login, validateFields, waitForAjax, retryUntil } from '../lib/utils';

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

function normalizeText(text: string | null){
  if (!text) return '';
    return text
      .replace('R$', '')
      .replace(/\s+/g, ' ')
      .trim();
}

async function acessarCadastro(page: Page) {
  await page.getByText('x', { exact: true }).click();
  await page.locator('img').first().click();
  await page.getByRole('link', { name: 'Empresa' }).click();
  await page.getByRole('link', { name: 'Clientes' }).click();
}

async function armazenarDados(page: Page, menu: FrameLocator){
  const documentoDados =
  {
    valorContrato: normalizeText(await menu.locator('#id_sc_field_totalp_1').textContent()),
    descontoContrato: normalizeText(await menu.locator('#id_sc_field_desconto_1').textContent()),
  };

  //sai dos contratos
  await menu.locator('#sc_Voltar_top').click();
  await waitForAjax(page);
  //acessa posição financeira
  await menu.locator('#id_sc_field_btnfinanceiro_2').click();
  return documentoDados;
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
    console.log('Atualizando boleto vencido...');
    await newPage.locator('#sub_form_b').click();
    await newPage.waitForLoadState('networkidle');
  }

  await newPage.waitForLoadState('networkidle');
  const pdfRawData = await readPdfFromPage(newPage);
  const pdfText = pdfRawData.text;
  console.log('--- Texto extraído do PDF ---');
  console.log(pdfText);

  // --- REGEX  ---
  const valorMatch = pdfText.match(/Valor do documento\s+([\d.,]+)/);
  const descontoMatch = pdfText.match(/Desconto \/ Abatimentos\s+([\d.,]+)/);

  // Retorna o objeto
  return {
    valorPDF: valorMatch ? normalizeText(valorMatch[1]) : '0,00',
    descontoPDF: descontoMatch ? normalizeText(descontoMatch[1]) : '0,00'
  };
}

async function validarDadosBoleto(dadosContrato: { valorContrato: string, descontoContrato: string }, 
                            dadosPdf: { valorPDF: string, descontoPDF: string }) {
  
  // Comparação valor
  console.log(`Validando Valor: Contrato [${dadosContrato.valorContrato}] vs PDF [${dadosPdf.valorPDF}]`);
  expect(dadosContrato.valorContrato).toEqual(dadosPdf.valorPDF);

  // Comparação desconto
  console.log(`Validando Desconto: Contrato [${dadosContrato.descontoContrato}] vs PDF [${dadosPdf.descontoPDF}]`);
  expect(dadosContrato.descontoContrato).toEqual(dadosPdf.descontoPDF);
}

async function validarDadosFatura(page: Page, menu: FrameLocator){

}

async function validarDadosNotass(page: Page, menu: FrameLocator){

}









test('Cadastro completo de cliente com contrato fixo', async ({ page, context }) => {
  // Gera o cache dos itens do inspetor.
  const menu = page.frameLocator('iframe[name="app_menu_iframe"]');
  test.setTimeout(80000);

  await login(page);

  // 1. Capture Contrato Data
  const dadosContrato = await armazenarDados(page, menu);
  // 2. Capture PDF Data
  const dadosPdf = await extrairDadosPDF(menu, page);
  await validarDadosBoleto(dadosContrato, dadosPdf);
});