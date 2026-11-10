import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import { makeDocx } from '../fixtures';

test('Excel rows produce one DOCX with gender suggestions and page starts', async ({ page }) => {
  // These are synthetic test values, not actual employee records or insurance numbers.
  const source = await makeDocx(
    '<w:p><w:r><w:t>{{Номер}} | {{ФИО}} | {{Дата рождения}} | {{Пол}} | {{СНИЛС}} | {{Должность}}</w:t></w:r></w:p>',
  );
  const book = new ExcelJS.Workbook();
  book.addWorksheet('Сотрудники').addRows([
    ['Номер', 'ФИО', 'Дата рождения', 'СНИЛС', 'Должность'],
    ['1/2026', 'Тестов Тест Тестович', new Date('1990-04-15'), '000-000-000 01', 'Водитель'],
    ['2/2026', 'Тестова Пример', '20.08.1985', '000-000-000 02', 'Слесарь'],
    ['3/2026', 'Ким Пример', '01.01.1991', '000-000-000 03', 'Специалист'],
  ]);
  const sent: string[] = [];
  page.on('request', (request) => {
    if (request.method() !== 'GET' || !request.url().startsWith('http://127.0.0.1')) sent.push(request.url());
  });
  await page.goto('/create');
  await page.locator('input[type=file]').setInputFiles({
    name: 'template.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    buffer: Buffer.from(source),
  });
  await page.getByRole('button', { name: 'К настройке полей' }).click();
  await page.getByRole('button', { name: 'К данным' }).click();
  await page.locator('input[type=file]').setInputFiles({
    name: 'staff.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: Buffer.from(new Uint8Array(await book.xlsx.writeBuffer())),
  });
  await page.getByRole('button', { name: 'Импортировать 3 строк' }).click();
  await expect(page.getByLabel('Пол, строка 1', { exact: true })).toHaveValue('мужской');
  await expect(page.getByLabel('Пол, строка 2', { exact: true })).toHaveValue('женский');
  await expect(page.getByLabel('Пол, строка 3', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('Дата рождения, строка 2', { exact: true })).toHaveValue('1985-08-20');
  await expect(page.getByText(/По фамилии определены строки 2/)).toBeVisible();
  await expect(page.getByText(/Не удалось определить пол: строки 3/)).toBeVisible();
  await page.getByRole('button', { name: 'Проверить документы' }).click();
  await expect(page.getByText(/Строка 3: Пол — Не удалось определить/)).toBeVisible();
  await page.getByRole('button', { name: 'Изменить данные' }).click();
  await page.getByLabel('Пол, строка 3', { exact: true }).fill('мужской');
  await page.getByRole('button', { name: 'Проверить документы' }).click();
  await page.getByRole('button', { name: /Один общий DOCX/ }).click();
  await page.getByRole('button', { name: 'Создать 3 документа' }).click();
  await expect(page.getByRole('heading', { name: 'Документы готовы' })).toBeVisible();
  await expect(page.getByText(/Создано: 3/)).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Скачать DOCX' }).click();
  const file = await download;
  const zip = await JSZip.loadAsync(await readFile((await file.path())!));
  const xml = await zip.file('word/document.xml')!.async('string');
  expect(xml).toContain('Тестов Тест Тестович');
  expect(xml).toContain('Тестова Пример');
  expect(xml).toContain('Ким Пример');
  expect(xml).toContain('000-000-000 01');
  expect(xml).toContain('20.08.1985');
  expect(xml.match(/pageBreakBefore/gu) || []).toHaveLength(2);
  expect(sent).toEqual([]);
});
