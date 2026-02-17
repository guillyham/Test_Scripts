import { test, expect, Page, FrameLocator } from '@playwright/test';
import { parsePdfBuffer } from '../lib/pdfUtils';
import { normalizeText, randomSelect2, login, waitForAjax } from '../lib/utils';
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

async function snapFinanceiro(page: Page) {
  const iframe = page.frameLocator('iframe[name="app_menu_iframe"]');
  const listSelector = '[id^="id_sc_field_movimentodocumento_"]';
  const codes = await iframe.locator(listSelector).allTextContents();
  return codes.map(code => code.trim());
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

  const rowSelector = () =>
    menu
      .locator('tr[id^="SC_ancor"]')
      .filter({
        has: menu.locator(
          'td.css_codigo_grid_line',
          { hasText: new RegExp(`^\\s*${clienteCodigo}\\s*$`) }
        )
      });
  await rowSelector().locator('a.css_btnfinanceiro_grid_line').first().click();
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

  //await randomSelect2(iframe, '#select2-id_sc_field_historico-container', ['Escolha Histórico', 'HISTÓRICO INATIVO']);
  await iframe.locator('#id_sc_field_historico').selectOption('1');

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

async function armazenarDados(page: Page, menu: FrameLocator, novoDocumento: string) {
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
  // ===== POSIÇÃO FINANCEIRA =====
  const columnSelector = 'td.css_movimentodocumento_grid_line';
  const targetRow = menu.locator('tr[id^="SC_ancor"]').filter({
    has: menu.locator(columnSelector, {
      hasText: new RegExp(`^\\s*${novoDocumento}\\s*$`)
    })
  });
  const movimentoDados = {
    vencimentoDocumento: await targetRow.first().locator('[id^="id_sc_field_movimentodata_"]').textContent()
  };
  await menu.locator('#sc_Voltar_top').click();

  // ===== CONTRATOS =====
  await rowSelector().locator('a.css_btncontratos_grid_line').first().click();
  await waitForAjax(page);

  const rows = menu.locator('tr[id^="SC_ancor"]');
  const contratoDados = await Promise.all(
    (await rows.all()).map(async (row) => {
      const vlrContrInd = await row.locator('[id^="id_sc_field_totalp_"]').textContent();
      const descContrInd = await row.locator('[id^="id_sc_field_desconto_"]').textContent();

      const valorContrato = parseFloat(normalizeText(vlrContrInd || '0'));
      const descontoContrato = parseFloat(normalizeText(descContrInd || '0'));
      return {
        valorContrato,
        descontoContrato
      };
    })
  );

  const contratoCalc = contratoDados.reduce((acc, curr) => {
    return {
      valor: acc.valor + curr.valorContrato,
      desconto: acc.desconto + curr.descontoContrato
    };
  }, { valor: 0, desconto: 0 });

  //dados fiscais
  const contratoDadosFiscalRaw = {
    valorContrato: normalizeText(await menu.locator('#id_sc_field_totalp_1').textContent()),
    descontoContrato: normalizeText(await menu.locator('#id_sc_field_desconto_1').textContent())
  };

  //fatura de serviço
  const contratoDadosFaturaRaw = {
    valorContrato: normalizeText(await menu.locator('#id_sc_field_totalp_2').textContent()),
    descontoContrato: normalizeText(await menu.locator('#id_sc_field_desconto_1').textContent())
  };

  return {
    contratoDados,
    totalValor: parseFloat(contratoCalc.valor.toFixed(2)),
    totalDesconto: parseFloat(contratoCalc.desconto.toFixed(2)),
    movimentoDados,
    contratoDadosFiscalRaw,
    contratoDadosFaturaRaw
  };
}

async function extrairDadosPDF(menu: FrameLocator, page: Page) {
  const [newPage] = await Promise.all([
    page.waitForEvent('popup'),
    menu.locator('#id_sc_field_btnimprimir_1').first().click(),
  ]);

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
  clienteDados: { valorContrato: string, descontoContrato: string, vencimentoContrato: string },
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

async function validarDadosFiscais(page: Page, menu: FrameLocator, novoDocumento: string,
  clienteDados: { valorContrato: string, descontoContrato: string }) {
  const documentoSemPonto = normalizeText(novoDocumento);
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
            { hasText: new RegExp(`^\\s*${documentoSemPonto}\\s*$`) }
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

async function validarFatura(page: Page, menu: FrameLocator, novoDocumento: string,
  clienteDados: { valorContrato: string, descontoContrato: string }) {
  const documentoSemPonto = normalizeText(novoDocumento);
  const { clienteCodigo } = JSON.parse(fs.readFileSync('customerContext.json', 'utf-8')
  );
  await menu.locator('#sai_top').click();
  await page.waitForLoadState();
  await menu.locator('#sc_Voltar_top').click();
  await page.waitForLoadState();

  const rowSelector = () =>
    menu
      .locator('tr[id^="SC_ancor"]')
      .filter({
        has: menu.locator(
          'td.css_codigo_grid_line',
          { hasText: new RegExp(`^\\s*${clienteCodigo}\\s*$`) }
        )
      });
  await rowSelector().locator('a.css_btnfaturas_grid_line').first().click();

  {
    const rowSelector = () =>
      menu
        .locator('tr[id^="SC_ancor"]')
        .filter({
          has: menu.locator(
            'td.css_movimento_documento_grid_line',
            { hasText: new RegExp(`^\\s*${novoDocumento}\\s*$`) }
          )
        });
    await rowSelector().locator('a.css_btnitens_grid_line').first().click();
    await waitForAjax(page, 200);

    const rows = menu.locator('tr[id^="idVertRow"]');
    const itemsData = await Promise.all(
      (await rows.all()).map(async (row) => {
        const vlrNotaText = await row.locator('[id^="id_read_on_valorunitario_"]').textContent();
        const vlrFatura = parseFloat(normalizeText(vlrNotaText || '0'));
        return { vlrFatura };
      })
    );

    const totalFatura = itemsData.reduce((acc, itemData) => acc + itemData.vlrFatura, 0);
    expect(parseFloat(clienteDados.valorContrato)).toBeCloseTo(totalFatura, 2);
  }
}

test('Faturamento', async ({ page }) => {
  const menu = page.frameLocator('iframe[name="app_menu_iframe"]');
  test.setTimeout(100000);

  await login(page);
  await acessarCadastro(page, menu);
  const snapOri = await snapFinanceiro(page);
  await menu.locator('#sc_Voltar_top').click();

  await faturarCliente(page, menu);

  const { clienteCodigo } = JSON.parse(fs.readFileSync('customerContext.json', 'utf-8'));
  const clientRow = menu.locator('tr[id^="SC_ancor"]').filter({
    has: menu.locator('td.css_codigo_grid_line', { hasText: new RegExp(`^\\s*${clienteCodigo}\\s*$`) })
  });
  await clientRow.locator('a.css_btnfinanceiro_grid_line').first().click();
  await waitForAjax(page);
  const snapNovo = await snapFinanceiro(page);

  const dif = snapNovo.filter(code => !snapOri.includes(code));
  const novoDocumento = dif[0];

  const clienteDados = await armazenarDados(page, menu, novoDocumento);
  await menu.locator('#sc_Voltar_top').click();

  await clientRow.locator('a.css_btnfinanceiro_grid_line').first().click();
  const dadosPdf = await extrairDadosPDF(menu, page);

  await validarDadosFinanceiros(page, menu,
    {
      valorContrato: clienteDados.totalValor.toFixed(2),
      descontoContrato: clienteDados.totalDesconto.toFixed(2),
      vencimentoContrato: clienteDados.movimentoDados.vencimentoDocumento ?? "",
    },
    dadosPdf);

  await validarDadosFiscais(page, menu, novoDocumento,
    {
      valorContrato: clienteDados.contratoDadosFiscalRaw.valorContrato,
      descontoContrato: clienteDados.contratoDadosFiscalRaw.descontoContrato
    });

  await validarFatura(page, menu, novoDocumento,
    {
      valorContrato: clienteDados.contratoDadosFaturaRaw.valorContrato,
      descontoContrato: clienteDados.contratoDadosFaturaRaw.descontoContrato
    });
});