import { it, expect } from 'vitest';
import JSZip from 'jszip';
import { makeDocx } from './fixtures';
import { previewSource } from '../src/infrastructure/docx/preview-source';
import { processingLimits } from '../src/domain/limits';
import { execute } from '../src/workers/tasks';
import { DocxDocumentEngine } from '../src/infrastructure/docx/engine';
import { importTemplate, exportTemplate } from '../src/infrastructure/archive/template-transfer';
it('strips external relationships only from preview copy', async () => {
  const zip = await JSZip.loadAsync(await makeDocx());
  const rels =
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="external" TargetMode="External" Target="https://example.invalid/private"/><Relationship Id="internal" Target="styles.xml"/></Relationships>';
  zip.file('word/_rels/document.xml.rels', rels);
  const original = await zip.generateAsync({ type: 'uint8array' });
  const clean = await JSZip.loadAsync(await previewSource(original));
  const result = await clean.file('word/_rels/document.xml.rels')!.async('string');
  expect(result).not.toContain('example.invalid');
  expect(result).toContain('styles.xml');
  expect(await (await JSZip.loadAsync(original)).file('word/_rels/document.xml.rels')!.async('string')).toBe(
    rels,
  );
});
it('protects fields inside content controls and simple Word fields', async () => {
  const source = await makeDocx(
    '<w:sdt><w:sdtContent><w:p><w:r><w:t>{{ФИО}}</w:t></w:r></w:p></w:sdtContent></w:sdt><w:p><w:fldSimple w:instr="DATE"><w:r><w:t>{{Дата}}</w:t></w:r></w:fldSimple></w:p>',
  );
  const a = await new DocxDocumentEngine().parse(source);
  expect(a.fields).toHaveLength(0);
  expect(a.paragraphs.every((p) => !p.editable)).toBe(true);
});
it('rejects tampered portable template offsets', async () => {
  const source = await makeDocx();
  const fields = (await new DocxDocumentEngine().parse(source)).fields;
  fields[0].occurrences[0].start = 1000;
  await expect(
    importTemplate(await exportTemplate({ id: 'x', name: 'x', filename: '', fields, source, updatedAt: 0 })),
  ).rejects.toThrow('не соответствуют');
});
it('retains completed files and reports rows exceeding measured memory ceiling', async () => {
  const source = await makeDocx();
  const limit = processingLimits.maxRetainedOutputBytes;
  processingLimits.maxRetainedOutputBytes = source.length + 100;
  try {
    const r = await execute('generate', { source, fields: [], rows: [{}, {}, {}], filename: '' }, () => {});
    expect(r.files).toHaveLength(1);
    expect(r.errors).toHaveLength(2);
    expect(r.errors[0].message).toContain('64 МиБ');
  } finally {
    processingLimits.maxRetainedOutputBytes = limit;
  }
});
