import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { makeDocx, ns } from './fixtures';
import { DocxDocumentEngine, matches } from '../src/infrastructure/docx/engine';
import { formatValue, validateValue, filename } from '../src/domain/fields';
import type { Field, ReplaceRule, Template } from '../src/domain/models';
import { safeZip, archiveLimits } from '../src/infrastructure/archive/safe-zip';
import { exportTemplate, importTemplate } from '../src/infrastructure/archive/template-transfer';
import { execute } from '../src/workers/tasks';
const engine = new DocxDocumentEngine();
const rule: ReplaceRule = {
  find: 'Иван',
  replacement: 'Пётр',
  caseSensitive: false,
  wholeWord: true,
  body: true,
  tables: true,
  headers: true,
};
describe('DOCX engine', () => {
  it('detects split runs, repeated fields, tables and headers', async () => {
    const source = await makeDocx(undefined, '<w:p><w:r><w:t>{{ФИО}}</w:t></w:r></w:p>');
    const a = await engine.parse(source);
    expect(a.fields.map((f) => f.name)).toEqual(['ФИО', 'Дата', 'Сумма']);
    expect(a.fields[0].occurrences).toHaveLength(3);
    expect(a.paragraphs.some((p) => p.table)).toBe(true);
  });
  it('generates real OOXML preserving run formatting, surrounding text and original source', async () => {
    const source = await makeDocx();
    const before = source.slice();
    const a = await engine.parse(source);
    const row = Object.fromEntries(
      a.fields.map((f) => [f.id, f.name === 'ФИО' ? 'Иванов & <Иван>' : 'значение']),
    );
    const out = await engine.generate(source, a.fields, row);
    const zip = await JSZip.loadAsync(out);
    const xml = await zip.file('word/document.xml')!.async('string');
    expect(xml).toContain('<w:b/>');
    expect(xml).toContain('<w:i/>');
    expect(xml).toContain('Иванов &amp; &lt;Иван&gt;');
    expect(xml).toContain(' заключил договор.');
    expect(xml).not.toContain('{{');
    expect(source).toEqual(before);
    expect(await zip.file('word/styles.xml')!.async('string')).toEqual(
      await (await JSZip.loadAsync(source)).file('word/styles.xml')!.async('string'),
    );
  });
  it('creates a visual field spanning runs and emits newline/tab elements', async () => {
    const source = await makeDocx('<w:p><w:r><w:t>До Ива</w:t></w:r><w:r><w:t>нов после</w:t></w:r></w:p>');
    const a = await engine.parse(source);
    const f: Field = {
      id: 'x',
      name: 'Имя',
      type: 'multiline',
      required: false,
      format: '',
      preview: '',
      occurrences: [{ part: 'word/document.xml', paragraph: 0, start: 3, end: 9, text: 'Иванов' }],
    };
    const out = await engine.generate(source, [f], { x: 'Пётр\n&\tЯ' });
    expect((await engine.parse(out)).paragraphs[0].text).toBe('До Пётр\n&\tЯ после');
    expect(a.fields).toHaveLength(0);
  });
  it('replaces across runs with Cyrillic whole-word support', async () => {
    const source = await makeDocx('<w:p><w:r><w:t>Ив</w:t></w:r><w:r><w:t>ан Иванов иван</w:t></w:r></w:p>');
    const r = await engine.replace(source, rule);
    expect(r.count).toBe(2);
    expect((await engine.parse(r.bytes)).paragraphs[0].text).toBe('Пётр Иванов Пётр');
    expect(matches('a.b aXb', { ...rule, find: 'a.b', wholeWord: false })).toHaveLength(1);
  });
  it('respects body/table/header scopes', async () => {
    const source = await makeDocx(
      '<w:p><w:r><w:t>Иван</w:t></w:r></w:p><w:tbl><w:tr><w:tc><w:p><w:r><w:t>Иван</w:t></w:r></w:p></w:tc></w:tr></w:tbl>',
      '<w:p><w:r><w:t>Иван</w:t></w:r></w:p>',
    );
    expect((await engine.replace(source, { ...rule, body: false, tables: false })).count).toBe(1);
  });
  it('protects complex Word fields and rejects stale/overlapping occurrences', async () => {
    const source = await makeDocx(
      '<w:p><w:r><w:fldChar w:fldCharType="begin"/><w:t>{{ФИО}}</w:t></w:r></w:p>',
    );
    const a = await engine.parse(source);
    expect(a.fields).toHaveLength(0);
    expect(a.warnings.length).toBeGreaterThan(0);
    const plain = await makeDocx();
    const fields = (await engine.parse(plain)).fields;
    await expect(engine.generate(plain, [fields[0], fields[0]], {})).rejects.toThrow('пересекаются');
    fields[0].occurrences[0].text = 'чужой текст';
    await expect(engine.generate(plain, fields, {})).rejects.toThrow('не соответствует');
  });
  it('rejects invalid XML and macro-enabled packages', async () => {
    const source = await makeDocx();
    const zip = await JSZip.loadAsync(source);
    zip.file(
      'word/document.xml',
      `<!DOCTYPE x [<!ENTITY x SYSTEM "file:///x">]><w:document xmlns:w="${ns}"/>`,
    );
    await expect(engine.parse(await zip.generateAsync({ type: 'uint8array' }))).rejects.toThrow('DTD');
    zip.file('word/vbaProject.bin', 'macro');
    await expect(engine.parse(await zip.generateAsync({ type: 'uint8array' }))).rejects.toThrow('макросами');
  });
});
describe('validation and filenames', () => {
  const f: Field = {
    id: 'x',
    name: 'ФИО',
    type: 'text',
    required: false,
    format: '',
    preview: '',
    occurrences: [],
  };
  it('keeps identifiers and validates required/date/number values', () => {
    expect(formatValue(f, '00123')).toBe('00123');
    expect(validateValue({ ...f, required: true }, '')).toBeTruthy();
    expect(validateValue({ ...f, type: 'date' }, '2026-02-30')).toBeTruthy();
    expect(formatValue({ ...f, type: 'date' }, '2026-10-02')).toBe('02.10.2026');
    expect(formatValue({ ...f, type: 'number', format: 'money' }, '25 000,5')).toBe('25 000,50');
    expect(validateValue({ ...f, type: 'number' }, '1e999')).toBeTruthy();
    expect(validateValue({ ...f, type: 'number' }, '9007199254740993')).toBeTruthy();
  });
  it('sanitizes and deduplicates case-insensitive filenames', () => {
    const used = new Set<string>();
    expect(filename('Договор_{{ФИО}}', [f], { x: 'Иван/Иван' }, 0, used)).toBe('Договор_Иван_Иван.docx');
    expect(filename('Договор_{{ФИО}}', [f], { x: 'Иван/Иван' }, 1, used)).toBe('Договор_Иван_Иван_2.docx');
    expect(filename('CON', [], {}, 0, used)).toBe('_CON.docx');
  });
});
describe('archives and portable templates', () => {
  it('round trips .dzhura and rejects incompatible schemas', async () => {
    const source = await makeDocx();
    const fields = (await engine.parse(source)).fields;
    const t: Template = {
      id: 'id',
      name: 'Договор',
      source,
      fields,
      filename: 'Договор_{{ФИО}}',
      updatedAt: 0,
    };
    const bytes = await exportTemplate(t);
    const restored = await importTemplate(bytes);
    expect(restored.fields).toEqual(fields);
    expect(restored.source).toEqual(source);
    const zip = await JSZip.loadAsync(bytes);
    zip.file('manifest.json', '{"format":"dzhura-template","version":2}');
    await expect(importTemplate(await zip.generateAsync({ type: 'uint8array' }))).rejects.toThrow('Версия');
  });
  it('rejects zip-slip, corruption and oversized expanded archives', async () => {
    const zip = new JSZip();
    zip.file('../evil.docx', 'x');
    await expect(safeZip(await zip.generateAsync({ type: 'uint8array' }))).rejects.toThrow('пути');
    await expect(safeZip(new Uint8Array([1, 2]))).rejects.toThrow('Повреждённый');
    const normal = new JSZip();
    normal.file('big', 'x'.repeat(1000));
    const saved = archiveLimits.expandedBytes;
    archiveLimits.expandedBytes = 100;
    try {
      await expect(safeZip(await normal.generateAsync({ type: 'uint8array' }))).rejects.toThrow('велик');
    } finally {
      archiveLimits.expandedBytes = saved;
    }
  });
  it('generates partial batch success and valid ZIP with unique files', async () => {
    const source = await makeDocx();
    const fields = (await engine.parse(source)).fields;
    fields[0].required = true;
    const job = await execute(
      'generate',
      {
        source,
        fields,
        filename: 'Один',
        rows: [{ [fields[0].id]: 'Иван' }, {}, { [fields[0].id]: 'Пётр' }],
      },
      () => {},
    );
    expect(job.files).toHaveLength(2);
    expect(job.errors).toHaveLength(1);
    expect(Object.keys((await JSZip.loadAsync(job.archive!)).files)).toEqual(['Один.docx', 'Один_2.docx']);
  });
});
