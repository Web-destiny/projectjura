import type { Document, Element, Node } from '@xmldom/xmldom';
import type {
  Analysis,
  DataRow,
  DocumentEngine,
  Field,
  Occurrence,
  Paragraph,
  ReplaceRule,
} from '../../domain/models';
import { detectFields, formatValue, overlaps } from '../../domain/fields';
import { safeZip } from '../archive/safe-zip';
import { ancestor, editable, indexParagraph, replaceRange, serialize, W, xml } from './text-index';
import { processingLimits } from '../../domain/limits';
async function load(source: Uint8Array) {
  const zip = await safeZip(source);
  if (!zip.file('[Content_Types].xml') || !zip.file('word/document.xml'))
    throw new Error('Это не DOCX. Выберите документ Word в формате .docx.');
  const types = await zip.file('[Content_Types].xml')!.async('string');
  if (/macroEnabled|vbaProject/iu.test(types) || Object.keys(zip.files).some((n) => /vbaProject/iu.test(n)))
    throw new Error('Документы с макросами не поддерживаются.');
  const parts = new Map<string, Document>();
  const warnings: string[] = [];
  for (const name of Object.keys(zip.files).filter((n) =>
    /^word\/(document|header\d*|footer\d*)\.xml$/u.test(n),
  ))
    parts.set(name, xml(await zip.file(name)!.async('string')));
  if (parts.get('word/document.xml')?.documentElement?.namespaceURI !== W)
    throw new Error(
      'Этот вариант OOXML не поддерживается. Пересохраните документ в обычном формате Word DOCX (не Strict Open XML).',
    );
  if (zip.file('word/footnotes.xml') || zip.file('word/endnotes.xml'))
    warnings.push('Сноски сохраняются без изменений; поля внутри них не обрабатываются.');
  if (Object.keys(zip.files).some((n) => n.startsWith('word/embeddings/')))
    warnings.push('Вложенные объекты сохраняются без изменений.');
  for (const name of Object.keys(zip.files).filter((n) => n.endsWith('.rels'))) {
    const rel = xml(await zip.file(name)!.async('string'));
    if (
      Array.from(rel.getElementsByTagName('Relationship')).some(
        (e) => e.getAttribute('TargetMode') === 'External',
      )
    )
      warnings.push('В документе есть внешние ссылки. Предпросмотр не загружает внешние ресурсы.');
  }
  return { zip, parts, warnings };
}
function paragraphs(parts: Map<string, Document>) {
  const result: Paragraph[] = [];
  for (const [part, doc] of parts)
    Array.from(doc.getElementsByTagNameNS(W, 'p')).forEach((p, paragraph) =>
      result.push({
        part,
        paragraph,
        text: indexParagraph(p).text,
        table: ancestor(p, 'tc'),
        editable: editable(p),
      }),
    );
  return result;
}
function fill(parts: Map<string, Document>, fields: Field[], row: DataRow) {
  const replacements: { o: Occurrence; value: string }[] = [];
  for (const f of fields)
    for (const o of f.occurrences) {
      if (replacements.some((r) => overlaps(r.o, o)))
        throw new Error('Поля пересекаются. Удалите пересекающееся поле.');
      replacements.push({ o, value: formatValue(f, row[f.id]) });
    }
  replacements.sort((a, b) => b.o.start - a.o.start);
  for (const { o, value } of replacements) {
    const p = parts.get(o.part)?.getElementsByTagNameNS(W, 'p').item(o.paragraph);
    if (!p || !editable(p) || indexParagraph(p).text.slice(o.start, o.end) !== o.text)
      throw new Error('Поле не соответствует исходному документу. Настройте шаблон заново.');
    replaceRange(p, o.start, o.end, value);
  }
}

function pageStart(document: Document, first: Node): Element | undefined {
  if (first.nodeType === 1 && (first as Element).namespaceURI === W && (first as Element).localName === 'p') {
    const p = first as Element;
    let properties = Array.from(p.childNodes).find(
      (n) => n.nodeType === 1 && (n as Element).namespaceURI === W && (n as Element).localName === 'pPr',
    ) as Element | undefined;
    if (!properties) {
      properties = document.createElementNS(W, 'w:pPr');
      p.insertBefore(properties, p.firstChild);
    }
    let marker = Array.from(properties.childNodes).find(
      (n) =>
        n.nodeType === 1 &&
        (n as Element).namespaceURI === W &&
        (n as Element).localName === 'pageBreakBefore',
    ) as Element | undefined;
    if (!marker) {
      marker = document.createElementNS(W, 'w:pageBreakBefore');
      const following = Array.from(properties.childNodes).find(
        (node) =>
          node.nodeType === 1 &&
          !['pStyle', 'keepNext', 'keepLines'].includes((node as Element).localName || ''),
      );
      properties.insertBefore(marker, following || null);
    }
    marker.setAttributeNS(W, 'w:val', '1');
    return;
  }
  const p = document.createElementNS(W, 'w:p');
  const properties = document.createElementNS(W, 'w:pPr');
  const marker = document.createElementNS(W, 'w:pageBreakBefore');
  const spacing = document.createElementNS(W, 'w:spacing');
  for (const [key, value] of Object.entries({ before: '0', after: '0', line: '1', lineRule: 'exact' }))
    spacing.setAttributeNS(W, `w:${key}`, value);
  properties.appendChild(marker);
  properties.appendChild(spacing);
  p.appendChild(properties);
  return p;
}
export function matches(text: string, rule: ReplaceRule): { start: number; end: number }[] {
  if (!rule.find) throw new Error('Введите текст для поиска.');
  const escaped = rule.find.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  const re = new RegExp(escaped, rule.caseSensitive ? 'gu' : 'giu');
  const result = [];
  for (const m of text.matchAll(re)) {
    const start = m.index!,
      end = start + m[0].length;
    if (
      rule.wholeWord &&
      ((start > 0 && /[\p{L}\p{N}_]/u.test(text[start - 1])) ||
        (end < text.length && /[\p{L}\p{N}_]/u.test(text[end])))
    )
      continue;
    result.push({ start, end });
  }
  return result;
}
export class DocxDocumentEngine implements DocumentEngine {
  supports(name: string) {
    return /\.docx$/iu.test(name);
  }
  detectFields = detectFields;
  async parse(source: Uint8Array): Promise<Analysis> {
    const data = await load(source);
    const p = paragraphs(data.parts);
    if (p.some((p) => !p.editable))
      data.warnings.push(
        'Сложные абзацы (исправления, поля Word, текстовые блоки и объекты) защищены от изменения.',
      );
    return { paragraphs: p, fields: detectFields(p), warnings: [...new Set(data.warnings)] };
  }
  async generate(source: Uint8Array, fields: Field[], row: DataRow) {
    const data = await load(source);
    fill(data.parts, fields, row);
    for (const [name, doc] of data.parts) data.zip.file(name, serialize(doc));
    return data.zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
  }
  async combine(
    source: Uint8Array,
    fields: Field[],
    rows: DataRow[],
    onProgress: (current: number, total: number) => void,
    rowNumbers?: number[],
  ): Promise<{ bytes: Uint8Array; count: number; errors: { name: string; message: string }[] }> {
    const data = await load(source);
    const original = data.parts.get('word/document.xml')!;
    const body = original.getElementsByTagNameNS(W, 'body').item(0);
    if (!body) throw new Error('Не найдено содержимое документа.');
    const sections = Array.from(original.getElementsByTagNameNS(W, 'sectPr'));
    if (sections.length > 1 || sections.some((section) => section.parentNode !== body))
      throw new Error(
        'Общий DOCX пока не поддерживает несколько разделов Word. Используйте отдельные файлы.',
      );
    if (
      fields.some((field) => field.occurrences.some((occurrence) => occurrence.part !== 'word/document.xml'))
    )
      throw new Error('Для общего DOCX переменные поля в колонтитулах пока не поддерживаются.');
    const unsupported = [
      'bookmarkStart',
      'bookmarkEnd',
      'commentRangeStart',
      'commentRangeEnd',
      'commentReference',
      'footnoteReference',
      'endnoteReference',
      'drawing',
      'pict',
      'object',
      'altChunk',
      'numPr',
      'sdt',
      'ins',
      'del',
      'moveFrom',
      'moveTo',
      'fldChar',
      'fldSimple',
      'permStart',
      'permEnd',
    ];
    if (unsupported.some((name) => original.getElementsByTagNameNS(W, name).length))
      throw new Error(
        'Общий DOCX пока не поддерживает изображения, закладки, сноски, списки и сложные поля Word. Используйте отдельные файлы.',
      );
    const section = sections[0]?.cloneNode(true);
    const sourceXml = serialize(original);
    const valueBytes = rows.reduce(
      (total, row) =>
        total +
        fields.reduce((sum, field) => sum + (row[field.id]?.length || 0) * field.occurrences.length * 2, 0),
      0,
    );
    if (sourceXml.length * rows.length * 2 + valueBytes > processingLimits.maxRetainedOutputBytes)
      throw new Error('Общий документ слишком большой. Разделите таблицу на несколько пачек.');
    const target = xml(sourceXml);
    const targetBody = target.getElementsByTagNameNS(W, 'body').item(0)!;
    while (targetBody.firstChild) targetBody.removeChild(targetBody.firstChild);
    let count = 0;
    const errors: { name: string; message: string }[] = [];
    for (let i = 0; i < rows.length; i++) {
      onProgress(i, rows.length);
      let imported: Node[];
      try {
        const copy = xml(sourceXml);
        fill(new Map([['word/document.xml', copy]]), fields, rows[i]);
        const copyBody = copy.getElementsByTagNameNS(W, 'body').item(0)!;
        const nodes = Array.from(copyBody.childNodes).filter(
          (node) => node.nodeType === 1 && !(node.namespaceURI === W && node.localName === 'sectPr'),
        );
        if (!nodes.length) throw new Error('В шаблоне нет содержимого.');
        imported = nodes.map((node) => target.importNode(node, true));
      } catch (error) {
        errors.push({
          name: `Строка ${rowNumbers?.[i] ?? i + 1}`,
          message: error instanceof Error ? error.message : 'Не удалось обработать строку.',
        });
        continue;
      }
      const separator = count ? pageStart(target, imported[0]) : undefined;
      if (separator) targetBody.appendChild(separator);
      for (const node of imported) {
        if (node.nodeType === 1) {
          const element = node as Element;
          const all = [element, ...Array.from(element.getElementsByTagNameNS(W, 'p'))];
          for (const p of all) {
            p.removeAttributeNS('http://schemas.microsoft.com/office/word/2010/wordml', 'paraId');
            p.removeAttributeNS('http://schemas.microsoft.com/office/word/2010/wordml', 'textId');
          }
        }
        targetBody.appendChild(node);
      }
      count++;
    }
    onProgress(rows.length, rows.length);
    if (section) targetBody.appendChild(target.importNode(section, true));
    data.zip.file('word/document.xml', serialize(target));
    return {
      bytes: count
        ? await data.zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' })
        : new Uint8Array(),
      count,
      errors,
    };
  }
  async replace(source: Uint8Array, rule: ReplaceRule) {
    const data = await load(source);
    let count = 0;
    if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(rule.replacement))
      throw new Error('Замена содержит недопустимые символы.');
    for (const p of paragraphs(data.parts)) {
      if (p.part !== 'word/document.xml' ? !rule.headers : p.table ? !rule.tables : !rule.body) continue;
      const found = matches(p.text, rule);
      if (found.length && !p.editable)
        throw new Error('Совпадение находится в защищённом сложном абзаце. Документ пропущен.');
      for (const m of found.reverse()) {
        replaceRange(
          data.parts.get(p.part)!.getElementsByTagNameNS(W, 'p').item(p.paragraph)!,
          m.start,
          m.end,
          rule.replacement,
        );
        count++;
      }
    }
    for (const [name, doc] of data.parts) data.zip.file(name, serialize(doc));
    return { bytes: await data.zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' }), count };
  }
}
