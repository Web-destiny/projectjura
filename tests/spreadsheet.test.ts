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
  it('normalizes day-first text only for date fields', () => {
    const dateFields = [{ ...fields[1], name: 'Дата рождения', type: 'date' as const }, fields[2]];
    const sheet = { name: '1С', headers: ['Дата рождения', 'ИНН'], rows: [['2.11.1990', '00123']] };
    expect(mapRows(sheet, autoMap(sheet.headers, dateFields), dateFields)[0]).toEqual({
      '1': '1990-11-02',
      '2': '00123',
    });
  });
  it('maps common 1C employee headings without guessing ambiguous columns', () => {
    const employeeFields = [
      { ...fields[0], id: 'name' },
      { ...fields[0], id: 'job', name: 'Должность' },
    ];
    expect(autoMap(['Сотрудник', 'Должность сотрудника'], employeeFields)).toEqual({ name: 0, job: 1 });
    expect(autoMap(['Сотрудник', 'ФИО сотрудника', 'Должность сотрудника'], employeeFields)).toEqual({
      job: 2,
    });
  });
  it('leaves duplicate headers unresolved and handles invalid input', async () => {
    expect(autoMap(['ФИО', 'ФИО'], fields)).toEqual({});
    await expect(readSpreadsheet(new Uint8Array([1, 2]), 'data.xlsx')).rejects.toThrow();
    await expect(readSpreadsheet(new Uint8Array(), 'data.csv')).rejects.toThrow('Первая строка');
    expect(csvReport([{ name: '=CMD()', message: 'Ошибка' }])).toContain("'=CMD()");
  });
});
