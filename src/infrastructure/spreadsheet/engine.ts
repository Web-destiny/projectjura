import type { CellFormulaValue } from 'exceljs';
import Papa from 'papaparse';
import type { DataRow, Field, Sheet } from '../../domain/models';
export type { Sheet } from '../../domain/models';
import { safeZip } from '../archive/safe-zip';
export async function readSpreadsheet(bytes: Uint8Array, name: string): Promise<Sheet[]> {
  if (/\.csv$/iu.test(name)) {
    let text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    text = text.replace(/^\uFEFF/u, '');
    const result = Papa.parse<string[]>(text, { skipEmptyLines: 'greedy' });
    if (result.errors.some((e) => e.code !== 'UndetectableDelimiter'))
      throw new Error('Не удалось прочитать CSV. Проверьте кавычки и разделители.');
    return [toSheet('CSV', result.data)];
  }
  if (!/\.xlsx$/iu.test(name)) throw new Error('Выберите .xlsx или CSV в UTF-8.');
  await safeZip(bytes);
  const { default: ExcelJS } = await import('exceljs');
  const book = new ExcelJS.Workbook();
  await book.xlsx.load(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
  );
  return book.worksheets.map((sheet) => {
    const rows: string[][] = [];
    sheet.eachRow({ includeEmpty: true }, (row) => {
      const cells: string[] = [];
      for (let i = 1; i <= sheet.columnCount; i++) {
        const c = row.getCell(i);
        if (c.type === ExcelJS.ValueType.Formula && (c.value as CellFormulaValue).result === undefined)
          throw new Error(
            'В Excel есть формула без сохранённого результата. Пересчитайте файл и сохраните его.',
          );
        cells.push(c.value instanceof Date ? c.value.toISOString().slice(0, 10) : c.text);
      }
      rows.push(cells);
    });
    return toSheet(sheet.name, rows);
  });
}
function toSheet(name: string, data: string[][]): Sheet {
  const headers = data.shift()?.map((s) => String(s).trim()) || [];
  if (!headers.length || !headers.some(Boolean))
    throw new Error('Первая строка должна содержать названия колонок.');
  return { name, headers, rows: data.filter((r) => r.some((v) => v.trim())) };
}
const normalized = (s: string) => s.toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
export function autoMap(headers: string[], fields: Field[]): Record<string, number> {
  const map: Record<string, number> = {};
  const used = new Set<number>();
  const aliases: Record<string, string[]> = {
    фио: ['фиоклиента', 'fullname', 'name'],
    дата: ['date'],
    сумма: ['amount', 'sum'],
  };
  for (const f of fields) {
    const key = normalized(f.name);
    const exact = headers.map((h, i) => (normalized(h) === key ? i : -1)).filter((i) => i >= 0);
    const candidates = exact.length
      ? exact
      : headers.map((h, i) => (aliases[key]?.includes(normalized(h)) ? i : -1)).filter((i) => i >= 0);
    if (candidates.length === 1 && !used.has(candidates[0])) {
      map[f.id] = candidates[0];
      used.add(candidates[0]);
    }
  }
  return map;
}
export function mapRows(sheet: Sheet, map: Record<string, number>, fields: Field[]): DataRow[] {
  return sheet.rows.map((row) => Object.fromEntries(fields.map((f) => [f.id, row[map[f.id]] ?? ''])));
}
export function csvReport(rows: { name: string; message: string }[]) {
  return (
    '\uFEFF' +
    Papa.unparse(
      rows.map((r) => ({ Файл: r.name, Ошибка: r.message })),
      { escapeFormulae: true },
    )
  );
}
