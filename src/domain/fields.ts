import type { DataRow, Field, Occurrence, Paragraph } from './models';
export function detectFields(paragraphs: Paragraph[]): Field[] {
  const fields = new Map<string, Field>();
  for (const p of paragraphs.filter((p) => p.editable)) {
    for (const m of p.text.matchAll(/\{\{[ \u00a0]*([^{}\r\n\t]+?)[ \u00a0]*\}\}/gu)) {
      const name = m[1].trim();
      if (!name) continue;
      let f = fields.get(name);
      if (!f) {
        f = {
          id: `field-${fields.size + 1}`,
          name,
          type: 'text',
          required: false,
          format: '',
          preview: '',
          occurrences: [],
        };
        fields.set(name, f);
      }
      f.occurrences.push({
        part: p.part,
        paragraph: p.paragraph,
        start: m.index!,
        end: m.index! + m[0].length,
        text: m[0],
      });
    }
  }
  return [...fields.values()];
}
export function overlaps(a: Occurrence, b: Occurrence) {
  return a.part === b.part && a.paragraph === b.paragraph && a.start < b.end && b.start < a.end;
}
export function validateValue(field: Field, value = ''): string {
  if (!value.trim()) return field.required ? 'Обязательное поле' : '';
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(value)) return 'Недопустимые управляющие символы';
  if (field.type === 'number' && !/^[+-]?\d+(?:[.,]\d+)?$/u.test(value.replace(/[\s\u00a0]/gu, '')))
    return 'Введите число';
  if (field.type === 'number' && !Number.isFinite(Number(value.replace(/\s/gu, '').replace(',', '.'))))
    return 'Число вне диапазона';
  if (field.type === 'number') {
    const raw = value.replace(/[ \u00a0\u202f]/gu, '').replace(',', '.');
    if (/[\n\r\t]/u.test(raw)) return 'Введите число без разрывов строки';
    if (!raw.includes('.') && !Number.isSafeInteger(Number(raw)))
      return 'Слишком большое число. Для идентификатора выберите тип «Текст»';
    if (raw.includes('.') && raw.replace(/^[+-]?0*/u, '').replace('.', '').length > 15)
      return 'Не более 15 значащих цифр для десятичного числа';
  }
  if (
    field.type === 'date' &&
    (!/^\d{4}-\d{2}-\d{2}$/u.test(value) ||
      !Number.isFinite(Date.parse(value)) ||
      new Date(value).toISOString().slice(0, 10) !== value)
  )
    return 'Введите существующую дату';
  return '';
}
export function formatValue(field: Field, value = ''): string {
  const error = validateValue(field, value);
  if (error) throw new Error(`${field.name}: ${error}`);
  if (!value.trim()) return '';
  if (field.type === 'date') {
    const [y, m, d] = value.split('-');
    return field.format === 'long'
      ? new Intl.DateTimeFormat('ru-RU', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(value))
      : field.format === 'iso'
        ? value
        : `${d}.${m}.${y}`;
  }
  if (field.type === 'number') {
    const number = Number(value.replace(/\s/gu, '').replace(',', '.'));
    return field.format === 'plain'
      ? String(number)
      : new Intl.NumberFormat('ru-RU', {
          useGrouping: true,
          minimumFractionDigits: field.format === 'money' ? 2 : 0,
          maximumFractionDigits: field.format === 'money' ? 2 : 10,
        }).format(number);
  }
  return value;
}
export function rowErrors(fields: Field[], row: DataRow) {
  return fields
    .map((f) => ({ field: f.name, message: validateValue(f, row[f.id]) }))
    .filter((e) => e.message);
}
export function filename(
  pattern: string,
  fields: Field[],
  row: DataRow,
  index: number,
  used: Set<string>,
): string {
  let base =
    (pattern || `Документ_${String(index + 1).padStart(3, '0')}`)
      .replace(/\{\{([^{}]+)\}\}/gu, (_, name: string) => {
        const f = fields.find((f) => f.name === name.trim());
        return f ? formatValue(f, row[f.id]) : '';
      })
      .replace(/\.docx$/iu, '')
      .replace(/[<>:"/\\|?*\u0000-\u001f]/gu, '_')
      .replace(/[. ]+$/u, '')
      .trim()
      .slice(0, 150) || 'Документ';
  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/iu.test(base)) base = `_${base}`;
  let result = `${base}.docx`;
  let n = 2;
  while (used.has(result.toLocaleLowerCase())) result = `${base}_${n++}.docx`;
  used.add(result.toLocaleLowerCase());
  return result;
}
