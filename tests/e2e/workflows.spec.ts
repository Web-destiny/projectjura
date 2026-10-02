import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import JSZip from 'jszip';
async function upload(page: Page, name = 'contract.docx') {
  await page.goto('/create');
  await page.locator('input[type=file]').setInputFiles(`tests/fixtures/${name}`);
  await expect(page.getByText('Найдено полей:')).toBeVisible();
}
async function toData(page: Page) {
  await page.getByRole('button', { name: 'К настройке полей' }).click();
  await page.getByRole('button', { name: 'К данным' }).click();
}
test('new user: home, guide, palette persistence, mobile and 404', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Документы без рутины.' })).toBeVisible();
  await page.screenshot({ path: 'test-results/home-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Палитра: Терракота' }).click();
  await page.getByRole('button', { name: 'Шалфей' }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Палитра: Шалфей' })).toBeVisible();
  await page.getByRole('link', { name: 'Как пользоваться' }).click();
  await expect(page.getByRole('heading', { name: 'Как пользоваться ДЖУРОЙ' })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/home-mobile.png', fullPage: true });
  await page.goto('/missing');
  await expect(page.getByText('Здесь пока нет документа')).toBeVisible();
});
test('single DOCX generation, actual preview and download without file requests', async ({ page }) => {
  const sent: string[] = [];
  page.on('request', (r) => {
    if (r.method() !== 'GET' || !r.url().startsWith('http://127.0.0.1')) sent.push(r.url());
  });
  await upload(page);
  await toData(page);
  await page.getByLabel('ФИО, строка 1', { exact: true }).fill('Иванов & Иван');
  await page.getByLabel('Дата, строка 1', { exact: true }).fill('02.10.2026');
  await page.getByLabel('Сумма, строка 1', { exact: true }).fill('25000');
  await page.getByRole('button', { name: 'Проверить документы' }).click();
  await page.getByRole('button', { name: 'Показать документ' }).click();
  await expect(page.frameLocator('iframe').locator('body')).toContainText('Иванов & Иван');
  await page.screenshot({ path: 'test-results/document-preview.png', fullPage: true });
  await page.getByRole('button', { name: 'Создать 1 документ' }).click();
  await expect(page.getByRole('heading', { name: 'Документы готовы' })).toBeVisible();
  const wait = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Скачать DOCX' }).click();
  const downloaded = await wait;
  const bytes = await readFile((await downloaded.path())!);
  const zip = await JSZip.loadAsync(bytes);
  expect(await zip.file('word/document.xml')!.async('string')).toContain('Иванов &amp; Иван');
  expect(sent).toEqual([]);
});
test('XLSX import creates two DOCX in ZIP', async ({ page }) => {
  await upload(page);
  await toData(page);
  await page.locator('input[type=file]').setInputFiles('tests/fixtures/data.xlsx');
  await expect(page.getByLabel('ФИО, строка 2', { exact: true })).toHaveValue('Петров Пётр');
  await page.getByRole('button', { name: 'Проверить документы' }).click();
  await page.getByRole('button', { name: 'Создать 2 документа' }).click();
  const wait = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Скачать ZIP' }).click();
  const downloaded = await wait;
  const zip = await JSZip.loadAsync(await readFile((await downloaded.path())!));
  expect(Object.keys(zip.files)).toHaveLength(2);
});
test('visual field, local template export/import, and draft recovery', async ({ page }) => {
  await upload(page, 'plain.docx');
  await page.getByRole('button', { name: 'К настройке полей' }).click();
  await page
    .locator('.paragraph')
    .first()
    .evaluate((el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      window.getSelection()?.removeAllRanges();
      window.getSelection()?.addRange(range);
      el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    });
  await page.getByPlaceholder('Например, ФИО').fill('Получатель');
  await page.getByRole('button', { name: '+ Сделать полем', exact: true }).click();
  await expect(page.locator('mark')).toHaveText('Иванов Иван Иванович');
  await page.getByText('Сохранить настроенный шаблон', { exact: true }).click();
  await page.getByLabel('Название шаблона', { exact: true }).fill('Мой договор');
  await page.getByRole('button', { name: 'Сохранить на устройстве' }).click();
  await expect(page.getByText('Шаблон сохранён только на этом устройстве.')).toBeVisible();
  await page.getByRole('button', { name: 'К данным' }).click();
  await page.getByLabel('Получатель, строка 1').fill('Анна');
  await page.waitForTimeout(900);
  await page.reload();
  await page.getByRole('button', { name: 'Продолжить', exact: true }).click();
  await expect(page.getByLabel('Получатель, строка 1')).toHaveValue('Анна');
  await page.goto('/templates');
  const wait = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Экспорт', exact: true }).click();
  const file = await wait;
  await page.locator('input[type=file]').setInputFiles({
    name: 'Мой договор.dzhura',
    mimeType: 'application/octet-stream',
    buffer: await readFile((await file.path())!),
  });
  await expect(page.getByRole('button', { name: 'Заполнить данные' })).toHaveCount(2);
});
test('find/replace in ZIP and structured document data', async ({ page }) => {
  await page.goto('/edit');
  await page.locator('input[type=file]').setInputFiles('tests/fixtures/batch.zip');
  await expect(page.getByText('Документы · 2')).toBeVisible();
  await page.getByLabel('Найти', { exact: true }).fill('Москва');
  await page.getByLabel('Заменить на', { exact: true }).fill('Казань');
  await page.getByRole('button', { name: 'Найти совпадения' }).click();
  await expect(page.getByText('Найдено 2 совпадения в 2 документах.')).toBeVisible();
  await page.getByRole('button', { name: 'Применить замены' }).click();
  const wait = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Скачать ZIP' }).click();
  const file = await wait;
  const zip = await JSZip.loadAsync(await readFile((await file.path())!));
  const doc = await JSZip.loadAsync(await Object.values(zip.files)[0].async('uint8array'));
  expect(await doc.file('word/document.xml')!.async('string')).toContain('Казань');
  await page.getByRole('button', { name: 'Однотипные документы' }).click();
  await page.getByLabel('ФИО, строка 1', { exact: true }).fill('Первый');
  await page.getByLabel('ФИО, строка 2', { exact: true }).fill('Второй');
  await page.getByRole('button', { name: 'Создать изменённые документы' }).click();
  await expect(page.getByRole('heading', { name: 'Документы готовы' })).toBeVisible();
});
test('invalid DOCX, required fields, CSV and cancellation', async ({ page }) => {
  await page.goto('/create');
  await page.locator('input[type=file]').setInputFiles('tests/fixtures/corrupt.docx');
  await expect(page.getByRole('alert')).toContainText('Повреждённый');
  await upload(page);
  await page.getByRole('button', { name: 'К настройке полей' }).click();
  await page.getByRole('button', { name: 'ФИО 3 вх.' }).click();
  await page.getByLabel('Обязательное поле').check();
  await page.getByRole('button', { name: 'К данным' }).click();
  await expect(page.getByText('Обязательное поле')).toBeVisible();
  await page.getByRole('button', { name: 'Проверить документы' }).click();
  await expect(page.getByRole('button', { name: 'Создать 0 документов' })).toBeDisabled();
  await page.getByRole('button', { name: 'Исправить данные' }).click();
  const csv =
    'ФИО;Дата;Сумма\n' + Array.from({ length: 500 }, (_, i) => `Клиент ${i};2026-10-02;100`).join('\n');
  await page
    .locator('input[type=file]')
    .setInputFiles({ name: 'batch.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
  await expect(page.getByText('500 строк · одна строка = один документ')).toBeVisible();
  await page.getByRole('button', { name: 'Проверить документы' }).click();
  await page.getByRole('button', { name: 'Создать 500 документов' }).click();
  await page.getByRole('button', { name: 'Отменить', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Операция отменена');
});
