import {  test, expect, Locator, Page, FrameLocator, Frame } from '@playwright/test';
import {  randomSelect, randomSelect2, validateFields, waitForAjax, 
          contratoAtiva, contratoFinaliza, contratoDinamico, camposOpcionaisContratos, contratoStart } from '../lib/utils';

/*
Fluxo do teste:
1 - Cadatra o cliente
2 - Preenche campos obrigatórios quando tiver
3 - Adiciona contrato e deixa o mesmo ativo
*/

async function login(page: Page) {
  const usuario = process.env.USUARIO;
  const senha = process.env.SENHA;

  await page.goto('https://desenv-deb12.rbxsoft.com/routerbox/app_login/index.php');
  await page.getByRole('textbox', { name: 'Usuário' }).fill(usuario);
  await page.getByRole('textbox', { name: 'Senha' }).fill(senha);
  await page.getByRole('textbox', { name: 'Senha' }).press('Enter');
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

// Fluxo principal do teste
test('Cadastro completo de cliente com contrato fixo', async ({ page, context }) => {
  // Gera o cache dos itens do inspetor.
  const menu = page.frameLocator('iframe[name="app_menu_iframe"]');
  const item5 = menu.frameLocator('iframe[name="item_5"]');
  const tb = item5.frameLocator('iframe[name^="TB_iframeContent"]');

  test.setTimeout(100000);

  await login(page);
  const newPage = await context.newPage();
  await gerarCliente(newPage);
  await page.bringToFront();

  //cadastro cliente
  await acessarCadastro(page);
  await preencherCampos(page, newPage, menu);
  await camposOpcionais(page, newPage, menu);
  await incluirRegistro(page, menu);

  //contrato
  //await contratoStart(page, "00000-XXXX")
  await contratoDinamico(page);
  await camposOpcionaisContratos(page);
  await contratoFinaliza(page);
  await waitForAjax(page);
  await contratoAtiva(page);
});