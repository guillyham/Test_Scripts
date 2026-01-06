import { test, expect, Locator, Page, FrameLocator, Frame } from '@playwright/test';
import { randomSelect, randomSelect2, login, validateFields, waitForAjax } from '../lib/utils';

/*
Fluxo do teste:
1 - Cadatra o cliente
2 - Preenche campos obrigatórios quando tiver
3 - Adiciona contrato e deixa o mesmo ativo
*/

function getFrames(page: Page) {
  const menu = page.frameLocator('iframe[name="app_menu_iframe"]');
  const item5 = menu.frameLocator('iframe[name="item_5"]');
  const tb = item5.frameLocator('iframe[name^="TB_iframeContent"]');

  return { menu, item5, tb };
}

// Gera pessoa para pegar os dados
async function gerarCliente(newPage: Page) {
  await newPage.goto('https://www.4devs.com.br/gerador_de_pessoas', { waitUntil: 'domcontentloaded' });
  await newPage.getByRole('button', { name: 'Gerar Pessoa' }).click();
}

// Abre cadastro de clientes
async function acessarCadastro(page: Page) {
  await page.getByText('x', { exact: true }).click();
  await page.locator('img').first().click();
  await page.getByRole('link', { name: 'Empresa' }).click();
  await page.getByRole('link', { name: 'Clientes' }).click();
  await page.locator('#item_13').click();
}

// Cria um novo registro e preenche os campos: CPF, NOME e CEP
async function preencherCampos(page: Page, newPage: Page, menu: FrameLocator) {
  await menu.getByTitle('Abrir um novo registro').click();

  const radioPF = menu.getByRole('radio', { name: 'Pessoa Física' });

  if (!(await radioPF.isChecked())) {
    await radioPF.click();
  }

  // Optional sanity check: wait until CPF label becomes visible/updated
  await expect(menu.locator('#id_label_br_cnpj_cnpf')).toContainText('CPF', { timeout: 10000 });
  await menu.getByText('CPF *').waitFor();

  await newPage.bringToFront();
  await newPage.locator('#nome span').nth(1).click();
  await page.bringToFront();
  await menu.locator('#id_sc_field_nome').click();
  await page.keyboard.press('Control+V');
  const nomeInput = menu.locator('#id_sc_field_nome');
  await validateFields(nomeInput);//so procede apos o campo nome ter valor.

  await newPage.bringToFront();
  await newPage.locator('#cpf span').nth(1).click();
  await page.bringToFront();
  await menu.locator('#id_sc_field_br_cnpj_cnpf').click();
  await page.keyboard.press('Control+V');
  const cpf_cnpjInput = menu.locator('#id_sc_field_br_cnpj_cnpf');
  await validateFields(cpf_cnpjInput);//so procede apos o campo cpf_cnpj ter valor.

  await newPage.bringToFront();
  await newPage.locator('#cep span').nth(1).click();
  await page.bringToFront();
  await menu.locator('#id_sc_field_br_cep').click();
  await page.keyboard.press('Control+V');

  const cepInput = menu.locator('#id_sc_field_br_cep');
  await validateFields(cepInput);//so procede apos o campo cep ter valor.

  await menu.locator('#id_sc_field_endereco').click();
  const enderecoInput = menu.locator('#id_sc_field_endereco');
  await validateFields(enderecoInput);//so procede apos o campo endereco ter valor.

  await menu.getByAltText('{datatype: \'text\', maxLength: 20, allowedChars: \'0123456789SsNn/\', lettersCase').click();
  await menu.getByAltText('{datatype: \'text\', maxLength: 20, allowedChars: \'0123456789SsNn/\', lettersCase').fill('123');

  //Banco + convenio
  await menu.locator('#id_sc_field_bcocobr').selectOption('0'); //Valor dinamico trocar de acordo com a necessidade
  //await menu.locator('#id_sc_field_cobr_convenio').selectOption('1234-5678-13579-Convênio BB'); //Base teste final
  //await menu.locator('#id_sc_field_cobranca').selectOption('R');
  await menu.locator('#id-opt-boletoemail-1').check();

  await newPage.bringToFront();
  await newPage.locator('#email span').nth(1).click();
  await page.bringToFront();
  await menu.locator('#id_sc_field_email').click();
  await page.keyboard.press('Control+V');

  const emailInput = menu.locator('#id_sc_field_email');
  await validateFields(emailInput);

  await menu.locator('#id_sc_field_observacoes').click();
  await page.keyboard.type("Cadastro gerado pelo script!");
}

// Validações para campos obrigatório que podem estar marcados ou nao
async function camposOpcionais(page: Page, newPage: Page, menu: Page | FrameLocator | Frame) {
  //Endereço de cobrança
  await menu.locator('#hidden_bloco_6').getByText('Endereço de Cobrança').click();
  //await page.getByText('Endereço de Cobrança').filter({ visible: true }).click();
  //dados fiscais
  await menu.getByText('Dados Fiscais').click();

  //Grupo
  {
    const grupoLabel = menu.locator("#id_label_grupo");
    await expect(grupoLabel).toBeVisible();
    const grup = (await grupoLabel.textContent())?.trim() ?? '';

    if (grup && grup.includes("*")) {
      const selectedValue = await randomSelect2(menu, '[aria-labelledby="select2-id_sc_field_grupo-container"]', ['padrão']);

      const displayed = await menu.locator('#select2-id_sc_field_grupo-container').textContent();
      expect(displayed?.trim()).toBe(selectedValue);
    }
  }

  //CEP
  {
    const endCepLabel = menu.locator('#id_label_br_cobr_cep');
    await expect(endCepLabel).toBeVisible();
    const cepLabelText = await endCepLabel.textContent();
    if (cepLabelText && cepLabelText.includes('*')) {
      const cepOrig = await menu.locator('#id_sc_field_br_cep').inputValue();
      await menu.locator('#id_sc_field_br_cobr_cep').fill(cepOrig.trim());

      const CEPInput = menu.locator('#id_sc_field_br_cobr_cep');
      await validateFields(CEPInput);

      const cobrNumeroText = menu.locator('#id_sc_field_cobr_numero');
      await cobrNumeroText.click();

      const cobrCidadeInput = menu.locator('#id_sc_field_cobr_cidade');
      await validateFields(cobrCidadeInput);

      await page.keyboard.type('1');

      const cobrEndInpu = menu.locator('#id_sc_field_cobr_endereco');
      await validateFields(cobrEndInpu);

      const cobrNumeroInot = menu.locator('#id_sc_field_cobr_numero');
      await validateFields(cobrNumeroInot);
    }
  }

  //Completo Cobrança
  {
    const cobrComplementoLabel = menu.locator('#id_label_cobr_complemento');
    await expect(cobrComplementoLabel).toBeVisible();
    const cobrComplementoText = await cobrComplementoLabel.textContent();
    if (cobrComplementoText && cobrComplementoText.includes('*')) {
      const cobrComplementoValida = await menu.locator('#id_sc_field_cobr_complemento');
      await cobrComplementoValida.click();
      await page.keyboard.type("Felipe Was Here! Complemento Cobr.");

      const cobrComplementoInput = menu.locator('#id_sc_field_cobr_complemento');
      await validateFields(cobrComplementoInput);
    }
  }

  //Nascimento
  {
    const nascimentoLabel = page.frameLocator('iframe[name="app_menu_iframe"]').getByText('Nascimento', { exact: false });
    await expect(nascimentoLabel).toBeVisible();
    const nascimento = await nascimentoLabel.textContent();
    if (nascimento && nascimento.includes('*')) {
      await newPage.bringToFront();
      await newPage.locator('#data_nasc span').nth(1).click(); // Copy nascimento
      await page.bringToFront();
      await menu.locator("#id_sc_field_nascimento").click();
      await page.keyboard.press('Control+V');

      const nascimentoInput = menu.locator('#id_sc_field_nascimento');
      await validateFields(nascimentoInput);
    }
  }

  //RG 
  {
    const rgLabel = menu.locator('#id_label_rg_ie');
    await expect(rgLabel).toBeVisible();
    const RG = await rgLabel.textContent();
    if (RG && RG.includes('*')) {
      const rgValida = await menu.locator("#id_sc_field_rg_ie");
      await rgValida.click();
      await page.keyboard.type("ISENTO");

      const rgInput = menu.locator('#id_sc_field_rg_ie');
      await validateFields(rgInput);
    }
  }

  //Sigla/Apelido 
  {
    const siglaLabel = page.frameLocator('iframe[name="app_menu_iframe"]').getByText('Sigla/Apelido', { exact: false });
    await expect(siglaLabel).toBeVisible();
    const sigla = await siglaLabel.textContent();
    if (sigla && sigla.includes('*')) {
      await newPage.bringToFront();
      await newPage.locator('#cor span').nth(1).click();
      await page.bringToFront();
      const siglaValida = await menu.locator("#id_sc_field_sigla");
      await siglaValida.click();
      await page.keyboard.press('Control+V');

      const siglaInput = menu.locator('#id_sc_field_sigla');
      await validateFields(siglaInput);
    }
  }

  //Complemento
  {
    const complementoLabel = menu.locator('#id_label_complemento');
    await expect(complementoLabel).toBeVisible();
    const complemento = await complementoLabel.textContent();
    if (complemento && complemento.includes('*')) {
      const complementoValida = await menu.locator('#id_sc_field_complemento');
      await complementoValida.click();
      await page.keyboard.type("Felipe Was Here! Complemento.");

      const complementoInput = menu.locator('#id_label_complemento');
      await validateFields(complementoInput);
    }
  }

  //Distrito
  {
    const distritoLabel = menu.locator('#id_label_distrito');
    await expect(distritoLabel).toBeVisible();
    const distrito = await distritoLabel.textContent();
    if (distrito && distrito.includes('*')) {
      const distritiValida = await menu.locator('#id_sc_field_distrito');
      await distritiValida.click();
      await page.keyboard.type("Felipe Was Here! Distrito.");

      const distritoInput = menu.locator('#id_label_distrito');
      await validateFields(distritoInput);
    }
  }

  //Tel Comerc
  {
    const telComercialInput = page.frameLocator('iframe[name="app_menu_iframe"]').getByText('Tel Comerc', { exact: false });
    await expect(telComercialInput).toBeVisible();
    const tComercial = await telComercialInput.textContent();
    if (tComercial && tComercial.includes('*')) {
      const tComercialValida = await menu.locator('#id_sc_field_telcomercial');
      await tComercialValida.click();
      await page.keyboard.type("4432323232");

      const tComercialInput = menu.locator('#id_sc_field_telcomercial');
      await validateFields(tComercialInput);
    }
  }

  //Tel Resid 
  {
    const telResidInput = page.frameLocator('iframe[name="app_menu_iframe"]').getByText('Tel Resid', { exact: false });
    await expect(telResidInput).toBeVisible();
    const tResid = await telResidInput.textContent();
    if (tResid && tResid.includes('*')) {
      const tResidValida = await menu.locator('#id_sc_field_telresidencial');
      await tResidValida.click();
      await page.keyboard.type("4432323232");

      const tResidInput = menu.locator('#id_sc_field_telresidencial');
      await validateFields(tResidInput);
    }
  }

  //Tel Celular  
  {
    const telCelularInput = page.frameLocator('iframe[name="app_menu_iframe"]').getByText('Tel Celular', { exact: false });
    await expect(telCelularInput).toBeVisible();
    const tCelular = await telCelularInput.textContent();
    if (tCelular && tCelular.includes('*')) {
      const tCelularValida = await menu.locator('#id_sc_field_telcelular');
      await tCelularValida.click();
      await page.keyboard.type("44999123456");

      const tCelularInput = menu.locator('#id_sc_field_telcelular');
      await validateFields(tCelularInput);
    }
  }

  //Grupo Cobr
  {
    const grupoCobrLabel = menu.locator('#id_label_cobr_grupo');
    await expect(grupoCobrLabel).toBeVisible();
    const grupCobr = (await grupoCobrLabel.textContent())?.trim() ?? '';

    if (grupCobr && grupCobr.includes("*")) {
      const selectedValue = await randomSelect2(menu, '[aria-labelledby="select2-id_sc_field_cobr_grupo-container"]', ['padrão']);

      const grupCobrInput = menu.locator('#select2-id_sc_field_cobr_grupo-container');
      await validateFields(grupCobrInput);
    }
  }

  //Dia de Vencimento
  {
    const diaVencLabel = menu.locator("#id_label_diacobr");
    await expect(diaVencLabel).toBeVisible();
    const venc = await diaVencLabel.textContent();

    if (venc && venc.includes("*")) {
      const selectedValue = await randomSelect(menu, '#id_sc_field_diacobr');

      const diaVencInput = menu.locator('#id_sc_field_diacobr');
      await validateFields(diaVencInput);
    }
  }

  //CFOP
  {
    const cfopLabel = menu.locator("#id_label_nfcfop");
    await expect(cfopLabel).toBeVisible();
    const cfop = await cfopLabel.textContent();

    if (cfop && cfop.includes("*")) {
      const selectedValue = await randomSelect(menu, '#id_sc_field_nfcfop');

      const cfopInput = menu.locator('#id_sc_field_nfcfop');
      await validateFields(cfopInput);
    }
  }
}

// Finaliza o cadastro
async function incluirRegistro(page: Page, menu: FrameLocator) {
  await menu.getByTitle('Incluir registro(s)').click();
  await waitForAjax(page, 2000);
}

export async function clienteCodigo(page: Page, menu: FrameLocator) {
  const codigoLocator = menu.locator('#id_sc_field_codigo');
  await expect(codigoLocator).toBeVisible({ timeout: 10000 });
  const clienteCodigo = (await codigoLocator.textContent())?.trim() ?? '';
  console.log(`Código do cliente cadastrado: ${clienteCodigo}`);
}

// Plano fixo Inicio
async function contratoStart(menu: FrameLocator, item5: FrameLocator, tb: FrameLocator) {
  const contrato = menu.getByRole('menuitem', { name: 'Contratos' });
  await expect(contrato).toBeVisible();
  await contrato.click();

  const Newcontrato = item5.getByTitle('Adicionar Novo Contrato para');
  await expect(Newcontrato).toBeVisible();
  await Newcontrato.click();

  await tb.locator('#id_sc_field_incluir').click({ force: true });
  await tb.locator('#id_sc_field_incluir').selectOption('P');

  const planos = tb.getByText('Plano *');
  await expect(planos).toBeVisible();

  await tb.getByRole('combobox', { name: '(Escolha o plano)' }).click();
  const searchInput = tb.locator('input[type="search"]');
  await searchInput.waitFor({ state: 'visible' });

  const optionText = '4-Apenas Boleto (ativo)'; //Inserir o plano aqui
  await searchInput.fill(optionText);
  const options = tb.locator('.select2-results__option', {
    hasText: optionText
  });

  await expect(options.first()).toBeVisible();
  await options.first().click();

  await tb.locator('#id_sc_field_assinatura').fill('14/05/2020');
  await tb.locator('#id_sc_field_inicio').fill('14/05/2020');
}

// Plano dinamico Inicio
async function contratoDinamicoStart(page: Page, menu: FrameLocator, item5: FrameLocator, tb: FrameLocator) {
  const contrato = menu.getByRole('menuitem', { name: 'Contratos' });
  await expect(contrato).toBeVisible();
  await contrato.click();

  const Newcontrato = item5.getByTitle('Adicionar Novo Contrato para');
  await expect(Newcontrato).toBeVisible();
  await Newcontrato.click();

  await tb.locator('#id_sc_field_incluir').click({ force: true });
  await tb.locator('#id_sc_field_incluir').selectOption('P');

  const planos = tb.getByText('Plano *');
  await expect(planos).toBeVisible();

  await tb.getByRole('combobox', { name: '(Escolha o plano)' }).click();
  const searchInput = tb.locator('input[type="search"]');
  await searchInput.waitFor({ state: 'visible' });

  const realTrigger = tb.locator('#select2-id_sc_field_plano-container');
  await expect(realTrigger).toBeVisible();
  await realTrigger.click();

  const selectedValue = await randomSelect2(tb, '#select2-id_sc_field_plano-container', ['padrão']);
  const displayed = await tb.locator('#select2-id_sc_field_plano-container').textContent();
  expect(displayed?.trim()).toBe(selectedValue);

  await tb.locator('#id_sc_field_assinatura').fill('14/05/2020');
  await tb.locator('#id_sc_field_inicio').fill('14/05/2020');
}

// Valida campos opcionais
async function camposOpcionaisContratos(page: Page, newPage: Page, menu: FrameLocator, tb: FrameLocator) {
  //Endereço de Instalação
  {
    const edInstLabel = tb.locator('#hidden_bloco_14').getByText('Endereço de Instalação');
    await expect(edInstLabel).toBeVisible();
    const edInst = (await edInstLabel.textContent())?.trim() ?? '';
    if (edInst && edInst.includes("*")) {
      await menu.locator('#id-opt-enderecoinstalacao-1').check();
      await expect(menu.locator('#id_label_cep')).toBeVisible();

      await newPage.bringToFront();
      await newPage.locator('#cep span').nth(1).click();
      await page.bringToFront();
      await menu.locator('#id_sc_field_cep').click();
      await page.keyboard.press('Control+V');

      const CEPInput = menu.locator('#id_sc_field_cep');
      await validateFields(CEPInput);

      const contrNumeroTxt = menu.locator('#id_sc_field_numend');
      await contrNumeroTxt.click();
      await page.keyboard.type('123');

      const contrCidadeInput = menu.locator('#id_sc_field_cidade');
      await validateFields(contrCidadeInput);
    }
  }
  //Endereço cobrança
  {
    const edInstLabel = tb.locator("#hidden_bloco_16").getByText('Endereço de Cobrança');
    await expect(edInstLabel).toBeVisible();
    const edInst = (await edInstLabel.textContent())?.trim() ?? '';
    if (edInst && edInst.includes("*")) {
      await menu.locator('#id-opt-enderecocobranca-1').check();
      await expect(menu.locator('#id_sc_field_cobr_cep')).toBeVisible();

      await newPage.bringToFront();
      await newPage.locator('#cep span').nth(1).click();
      await page.bringToFront();
      await menu.locator('#id_sc_field_cobr_cep').click();
      await page.keyboard.press('Control+V');

      const CEPInput = menu.locator('#id_sc_field_cobr_cep');
      await validateFields(CEPInput);

      const contrNumeroTxt = menu.locator('#id_sc_field_cobr_numend');
      await contrNumeroTxt.click();
      await page.keyboard.type('321');

      const contrCidadeInput = menu.locator('#id_sc_field_cobr_cidade');
      await validateFields(contrCidadeInput);
    }
  }
}

// Plano finalização
async function contratoFinaliza(page: Page) {
  // Carrega os frames
  const { menu, item5, tb } = getFrames(page);
  await item5.locator('iframe[name^="TB_iframeContent"]').waitFor({ state: 'attached', timeout: 10000 });

  await expect(tb.locator('#sc_Confirmar_bot')).toBeVisible({ timeout: 10000 });
  await tb.locator('#sc_Confirmar_bot').click();

  await expect.soft(tb.getByText('Confirma inclusão do(s)')).toBeVisible();
  if (await tb.getByText('Confirma inclusão do(s)').isVisible()) {
    await page.keyboard.press('Enter');
  }

  await tb.getByText('Contrato incluído com sucesso!').waitFor({ state: 'visible' });
  await page.keyboard.press('Enter');

  const contratoSair = tb.getByTitle('Sair da página');
  await expect(contratoSair).toBeVisible();
  await contratoSair.click();

  // Recarrega os frames novamente
  const { menu: refreshedMenu, item5: refreshedItem5 } = getFrames(page);

  const contrato = refreshedMenu.getByRole('menuitem', { name: 'Contratos' });
  await expect(contrato).toBeVisible();

  try {
    const ativarBtn = item5.locator('#id_sc_field_btnativar_1');
    await ativarBtn.waitFor({ state: 'visible', timeout: 3000 });

    await ativarBtn.click();
    await item5.getByText('Ativação de Contratos').waitFor();

    page.once('dialog', async dialog => {
      await dialog.accept();
    });

    await item5.getByTitle('Confirmar alterações').click();
  }
  catch (e) { }
  const statusLocator = refreshedItem5.locator('#id_sc_field_gsituacao_1');
  await expect(statusLocator).toBeVisible({ timeout: 10000 });
  const statusText = (await statusLocator.textContent())?.trim() ?? '';
  expect(statusText).toBe('Ativo');
}

// Plano Dinamico finalização
async function contratoDinamicoFinaliza(page: Page) {
  // Carrega os frames
  const { menu, item5, tb } = getFrames(page);
  await item5.locator('iframe[name^="TB_iframeContent"]').waitFor({ state: 'attached', timeout: 10000 });

  await expect(tb.locator('#sc_Confirmar_bot')).toBeVisible({ timeout: 10000 });
  await tb.locator('#sc_Confirmar_bot').click();

  const confirmText = tb.getByText('Confirma inclusão do(s)');
  await expect.soft(confirmText).toBeVisible({ timeout: 5000 });
  if (await confirmText.isVisible()) {
    await page.keyboard.press('Enter');
  }

  await tb.getByText('Contrato incluído com sucesso!').waitFor({ state: 'visible' });
  await page.keyboard.press('Enter');

  const contratoSair = tb.getByTitle('Sair da página');
  await expect(contratoSair).toBeVisible();
  await contratoSair.click();

  // Recarrega os frames novamente
  const { menu: refreshedMenu, item5: refreshedItem5 } = getFrames(page);

  const contrato = refreshedMenu.getByRole('menuitem', { name: 'Contratos' });
  await expect(contrato).toBeVisible();

  try {
    const ativarBtn = refreshedItem5.locator('#id_sc_field_btnativar_1');
    await ativarBtn.waitFor({ state: 'visible', timeout: 3000 });
    await ativarBtn.click();

    await refreshedItem5.getByText('Ativação de Contratos').waitFor();

    page.once('dialog', async dialog => {
      await dialog.accept();
    });

    await refreshedItem5.getByTitle('Confirmar alterações').click();
  } catch (e) { }

  const statusLocator = refreshedItem5.locator('#id_sc_field_gsituacao_1');
  await expect(statusLocator).toBeVisible({ timeout: 10000 });
  const statusText = (await statusLocator.textContent())?.trim() ?? '';
  expect(statusText).toBe('Ativo');
}


// Fluxo principal do teste
test('Cadastro completo de cliente com contrato fixo', async ({ page, context }) => {
  // Gera o cache dos itens do inspetor.
  const menu = page.frameLocator('iframe[name="app_menu_iframe"]');
  const item5 = menu.frameLocator('iframe[name="item_5"]');
  const tb = item5.frameLocator('iframe[name^="TB_iframeContent"]');

  test.setTimeout(70000);

  await login(page);

  const newPage = await context.newPage();

  await gerarCliente(newPage);

  await page.bringToFront();

  await acessarCadastro(page);
  await preencherCampos(page, newPage, menu);
  await camposOpcionais(page, newPage, menu);
  await incluirRegistro(page, menu);
  await clienteCodigo(page, menu);

  //Inicia contrato fixo
  //await contratoStart(page, menu, item5); 
  //Inicia contrato Dinamico
  await contratoDinamicoStart(page, menu, item5, tb);

  await camposOpcionaisContratos(page, newPage, menu, tb);

  //Finaliza contrato 
  //await contratoFinaliza(page);
  //Finaliza contrato dinamico
  await contratoDinamicoFinaliza(page);
});