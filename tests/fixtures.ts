import JSZip from 'jszip';
export const ns = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
export async function makeDocx(body?: string, header?: string, padding = 0) {
  const zip = new JSZip();
  zip.file(
    '[Content_Types].xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
      (header
        ? '<Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>'
        : '') +
      '</Types>',
  );
  zip.file(
    '_rels/.rels',
    '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
  );
  zip.file(
    'word/_rels/document.xml.rels',
    '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
      (header
        ? '<Relationship Id="rHeader" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>'
        : '') +
      '</Relationships>',
  );
  zip.file(
    'word/styles.xml',
    `<w:styles xmlns:w="${ns}"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="24"/></w:rPr></w:rPrDefault></w:docDefaults></w:styles>`,
  );
  zip.file(
    'word/document.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="${ns}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>${body ?? '<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="32"/></w:rPr><w:t>ДОГОВОР</w:t></w:r></w:p><w:p><w:r><w:t xml:space="preserve">Заказчик: </w:t></w:r><w:r><w:rPr><w:b/></w:rPr><w:t>{{Ф</w:t></w:r><w:r><w:rPr><w:i/></w:rPr><w:t>ИО}}</w:t></w:r><w:r><w:t xml:space="preserve"> заключил договор.</w:t></w:r></w:p><w:p><w:r><w:t>Адрес: Москва</w:t></w:r></w:p><w:p><w:r><w:t>Подпись: {{ФИО}}</w:t></w:r></w:p><w:tbl><w:tblPr><w:tblW w:w="9000" w:type="dxa"/></w:tblPr><w:tblGrid><w:gridCol w:w="4500"/><w:gridCol w:w="4500"/></w:tblGrid><w:tr><w:tc><w:p><w:r><w:t>Дата: {{Дата}}</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>Сумма: {{Сумма}}</w:t></w:r></w:p></w:tc></w:tr></w:tbl>'}<w:sectPr>${header ? '<w:headerReference w:type="default" r:id="rHeader"/>' : ''}<w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr></w:body></w:document>`,
  );
  if (header) zip.file('word/header1.xml', `<w:hdr xmlns:w="${ns}">${header}</w:hdr>`);
  if (padding) {
    const bytes = new Uint8Array(padding);
    let seed = 417;
    for (let i = 0; i < bytes.length; i++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      bytes[i] = seed >>> 24;
    }
    zip.file('word/media/benchmark.bin', bytes);
  }
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
}
