/*
npm install pdfjs-dist@4 pdf-parse@2
*/

export async function parsePdfBuffer({ buffer }: { buffer: Buffer }) {
  //const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');


  const uint8Array = new Uint8Array(buffer);

  const loadingTask = pdfjsLib.getDocument({
    data: uint8Array,
    disableFontFace: true,
    useSystemFonts: true,
    stopAtErrors: false,
    verbosity: 0,
  });

  let doc;
  let fullText = '';

  try {
    doc = await loadingTask.promise;

    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const textContent = await page.getTextContent();

      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');

      fullText += pageText + '\n';
    }

    let metadata = null;
    try {
      metadata = await doc.getMetadata();
    } catch {
      // Ignora falhas na extração de metadados
    }

    return {
      text: fullText,
      numpages: doc.numPages,
      info: metadata?.info ?? null,
    };
  } catch (error: any) {
    // Ignora qualquer erro de PDF inválido, retornando o texto extraído até o momento.
    if (error?.name === 'InvalidPDFException') {
      return {
        text: fullText,
        numpages: doc?.numPages ?? 0,
        info: null,
        warning: 'Invalid PDF structure, text extracted anyway',
      };
    }

    throw error;
  }
}