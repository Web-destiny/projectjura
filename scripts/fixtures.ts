import { mkdir, writeFile } from 'node:fs/promises';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import { makeDocx } from '../tests/fixtures';
await mkdir('tests/fixtures', { recursive: true });
const docx = await makeDocx(undefined, '<w:p><w:r><w:t>ДЖУРА · {{ФИО}}</w:t></w:r></w:p>');
await writeFile('tests/fixtures/contract.docx', docx);
await writeFile(
  'tests/fixtures/plain.docx',
  await makeDocx('<w:p><w:r><w:t>Иванов Иван</w:t></w:r><w:r><w:t> Иванович</w:t></w:r></w:p>'),
);
await writeFile(
  'tests/fixtures/data.csv',
  '\uFEFFФИО;Дата;Сумма\r\nИванов Иван;2026-10-02;25000\r\nПетров Пётр;2026-11-03;42000',
);
const book = new ExcelJS.Workbook();
const sheet = book.addWorksheet('Клиенты');
sheet.addRows([
  ['ФИО', 'Дата', 'Сумма'],
  ['Иванов Иван', new Date('2026-10-02'), 25000],
  ['Петров Пётр', new Date('2026-11-03'), 42000],
]);
await book.xlsx.writeFile('tests/fixtures/data.xlsx');
const zip = new JSZip();
zip.file('Первый.docx', docx);
zip.file('Второй.docx', docx);
await writeFile('tests/fixtures/batch.zip', await zip.generateAsync({ type: 'uint8array' }));
await writeFile('tests/fixtures/corrupt.docx', 'not a zip');
console.log('DOCX, XLSX, CSV и ZIP fixtures записаны в tests/fixtures.');
