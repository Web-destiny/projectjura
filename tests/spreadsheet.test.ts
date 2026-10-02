import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import { readSpreadsheet, autoMap, mapRows, csvReport } from '../src/infrastructure/spreadsheet/engine';
import type { Field } from '../src/domain/models';
const fields: Field[] = ['ФИО', 'Дата', 'ИНН'].map((name, i) => ({
  id: String(i),
  name,
  type: 'text',
  required: false,
  format: '',
  preview: '',
  occurrences: [],
}));
describe('spreadsheet import', () => {
  it('reads quoted CSV, preserves leading zeros and maps aliases', async () => {
    const sheets = await readSpreadsheet(
      new TextEncoder().encode('\uFEFFФИО клиента;date;ИНН\r\n"Иванов; Иван";2026-10-02;001234'),
      'data.csv',
    );
    const map = autoMap(sheets[0].headers, fields);
    expect(mapRows(sheets[0], map, fields)[0]).toEqual({
      '0': 'Иванов; Иван',
      '1': '2026-10-02',
      '2': '001234',
    });
  });
  it('imports real XLSX dates and text cells', async () => {
    const book = new ExcelJS.Workbook();
    book.addWorksheet('Лист').addRows([
      ['ФИО', 'Дата', 'ИНН'],
      ['Иван', new Date('2026-10-02'), '00123'],
    ]);
    const sheets = await readSpreadsheet(new Uint8Array(await book.xlsx.writeBuffer()), 'data.xlsx');
    expect(sheets[0].rows[0]).toEqual(['Иван', '2026-10-02', '00123']);
  });
  it('leaves duplicate headers unresolved and handles invalid input', async () => {
    expect(autoMap(['ФИО', 'ФИО'], fields)).toEqual({});
    await expect(readSpreadsheet(new Uint8Array([1, 2]), 'data.xlsx')).rejects.toThrow();
    await expect(readSpreadsheet(new Uint8Array(), 'data.csv')).rejects.toThrow('Первая строка');
    expect(csvReport([{ name: '=CMD()', message: 'Ошибка' }])).toContain("'=CMD()");
  });
});
