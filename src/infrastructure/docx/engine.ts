import type { Document } from '@xmldom/xmldom';
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
    const replacements: { o: Occurrence; value: string }[] = [];
    for (const f of fields)
      for (const o of f.occurrences) {
        if (replacements.some((r) => overlaps(r.o, o)))
          throw new Error('Поля пересекаются. Удалите пересекающееся поле.');
        replacements.push({ o, value: formatValue(f, row[f.id]) });
      }
    replacements.sort((a, b) => b.o.start - a.o.start);
    for (const { o, value } of replacements) {
      const p = data.parts.get(o.part)?.getElementsByTagNameNS(W, 'p').item(o.paragraph);
      if (!p || !editable(p) || indexParagraph(p).text.slice(o.start, o.end) !== o.text)
        throw new Error('Поле не соответствует исходному документу. Настройте шаблон заново.');
      replaceRange(p, o.start, o.end, value);
    }
    for (const [name, doc] of data.parts) data.zip.file(name, serialize(doc));
    return data.zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
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
