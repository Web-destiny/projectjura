import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
import JSZip from 'jszip';
test('500-row batch: virtual scrolling, arbitrary preview row and actual archive', async ({ page }) => {
  await page.goto('/create');
  await page.locator('input[type=file]').setInputFiles('tests/fixtures/contract.docx');
  await page.getByRole('button', { name: 'К настройке полей' }).click();
  await page.getByRole('button', { name: 'К данным' }).click();
  const csv =
    'ФИО;Дата;Сумма\n' + Array.from({ length: 500 }, (_, i) => `Клиент ${i + 1};2026-10-02;100`).join('\n');
  await page
    .locator('input[type=file]')
    .setInputFiles({ name: '500.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
  await expect(page.getByText('500 строк · одна строка = один документ')).toBeVisible();
  await page.locator('.table-scroll').evaluate((el) => (el.scrollTop = el.scrollHeight));
  await expect(page.getByLabel('ФИО, строка 500', { exact: true })).toHaveValue('Клиент 500');
  await page.getByRole('button', { name: 'Проверить документы' }).click();
  await page.getByRole('combobox', { name: 'Предпросмотр строки' }).click();
  await page.getByRole('option', { name: '237', exact: true }).click();
  await page.getByRole('button', { name: 'Показать документ' }).click();
  await expect(page.frameLocator('iframe').locator('body')).toContainText('Клиент 237');
  await page.getByRole('button', { name: 'Создать 500 документов' }).click();
  await expect(page.getByRole('heading', { name: 'Документы готовы' })).toBeVisible();
  const wait = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Скачать ZIP' }).click();
  const result = await wait;
  const zip = await JSZip.loadAsync(await readFile((await result.path())!));
  expect(Object.keys(zip.files)).toHaveLength(500);
});
test('accessibility in each palette and main working screens', async ({ page }) => {
  for (const [palette, label] of [
    ['terracotta', 'Терракота'],
    ['sage', 'Шалфей'],
    ['sand', 'Песок'],
    ['ink', 'Чернила'],
  ]) {
    await page.goto('/');
    await page.getByRole('button', { name: /Палитра:/u }).click();
    await page.locator('.palette-option').filter({ hasText: label }).click();
    await expect(page.locator('html')).toHaveAttribute('data-palette', palette);
    const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(
      audit.violations,
      JSON.stringify(audit.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) }))),
    ).toEqual([]);
  }
  for (const path of ['/create', '/edit', '/guide', '/templates']) {
    await page.goto(path);
    const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(audit.violations, `${path}: ${JSON.stringify(audit.violations.map((v) => v.id))}`).toEqual([]);
  }
});
test('edit draft restores file list and replacement rule', async ({ page }) => {
  await page.goto('/edit');
  await page.locator('input[type=file]').setInputFiles('tests/fixtures/contract.docx');
  await expect(page.getByText('Документы · 1')).toBeVisible();
  await page.getByLabel('Найти', { exact: true }).fill('Москва');
  await page.getByLabel('Заменить на', { exact: true }).fill('Казань');
  await page.waitForTimeout(900);
  await page.reload();
  await page.getByRole('button', { name: 'Продолжить', exact: true }).click();
  await expect(page.getByLabel('Найти', { exact: true })).toHaveValue('Москва');
  await expect(page.getByLabel('Заменить на', { exact: true })).toHaveValue('Казань');
  await expect(page.getByText('Документы · 1')).toBeVisible();
});
test('privacy headers also cover worker resources', async ({ page, request }) => {
  const response = await page.goto('/');
  expect(response?.headers()['content-security-policy']).toContain("connect-src 'none'");
  await page.goto('/create');
  const workerRequest = page.waitForRequest((r) => r.url().includes('processing.worker-'));
  await page.locator('input[type=file]').setInputFiles('tests/fixtures/contract.docx');
  const worker = await workerRequest;
  const headers = await request.get(worker.url());
  expect(headers.headers()['content-security-policy']).toContain("connect-src 'none'");
});
