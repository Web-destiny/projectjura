import type { JobResult, OutputFile } from '../domain/models';
import type { Progress, TaskMap } from '../domain/processing';
import { filename } from '../domain/fields';
import { DocxDocumentEngine } from '../infrastructure/docx/engine';
import { createArchive, safeZip } from '../infrastructure/archive/safe-zip';
import { importTemplate, exportTemplate } from '../infrastructure/archive/template-transfer';
import { readSpreadsheet } from '../infrastructure/spreadsheet/engine';
import { previewSource } from '../infrastructure/docx/preview-source';
import { processingLimits } from '../domain/limits';
const engine = new DocxDocumentEngine();
const message = (e: unknown) => (e instanceof Error ? e.message : 'Не удалось обработать документ.');
async function batch<T>(
  items: T[],
  process: (item: T, index: number) => Promise<OutputFile>,
  progress: (p: Progress) => void,
  label: (item: T, index: number) => string = (_, i) => `Строка ${i + 1}`,
): Promise<JobResult> {
  const result: JobResult = { files: [], errors: [] };
  let retained = 0;
  let full = false;
  for (let i = 0; i < items.length; i++) {
    progress({ current: i, total: items.length, stage: 'Обработка документов' });
    try {
      if (full)
        throw new Error(
          'Пачка достигла безопасного объёма результатов. Разделите оставшиеся документы на несколько пачек.',
        );
      const file = await process(items[i], i);
      if (retained + file.bytes.length > processingLimits.maxRetainedOutputBytes) {
        full = true;
        throw new Error(
          'Результаты превышают безопасный объём 64 МиБ. Этот и следующие документы пропущены.',
        );
      }
      retained += file.bytes.length;
      result.files.push(file);
    } catch (e) {
      result.errors.push({ name: label(items[i], i), message: message(e) });
    }
  }
  progress({ current: items.length, total: items.length, stage: 'Создание архива' });
  if (result.files.length > 1) result.archive = await createArchive(result.files);
  return result;
}
export async function execute<K extends keyof TaskMap>(
  task: K,
  input: TaskMap[K]['input'],
  progress: (p: Progress) => void,
): Promise<TaskMap[K]['output']> {
  const handlers = {
    renderSource: previewSource,
    analyze: (p: TaskMap['analyze']['input']) => engine.parse(p),
    preview: (p: TaskMap['preview']['input']) => engine.generate(p.source, p.fields, p.row),
    generate: (p: TaskMap['generate']['input']) => {
      const used = new Set<string>();
      return batch(
        p.rows,
        async (row, i) => {
          const bytes = await engine.generate(p.source, p.fields, row);
          return { name: filename(p.filename, p.fields, row, i, used), bytes };
        },
        progress,
        (_, i) => `Строка ${p.rowNumbers?.[i] ?? i + 1}`,
      );
    },
    spreadsheet: (p: TaskMap['spreadsheet']['input']) => readSpreadsheet(p.bytes, p.name),
    unpack: async (p: Uint8Array) => {
      const zip = await safeZip(p);
      const files: OutputFile[] = [];
      const used = new Set<string>();
      for (const entry of Object.values(zip.files)) {
        if (entry.dir) continue;
        if (!/\.docx$/iu.test(entry.name))
          throw new Error('ZIP должен содержать только DOCX. Удалите остальные файлы.');
        files.push({
          name: filename(entry.name.split('/').pop()!, [], {}, files.length, used),
          bytes: await entry.async('uint8array'),
        });
      }
      if (!files.length) throw new Error('В ZIP нет DOCX.');
      return files;
    },
    replace: async (p: TaskMap['replace']['input']) => {
      let count = 0,
        documents = 0;
      const used = new Set<string>();
      const result = await batch(
        p.files,
        async (file, i) => {
          const replaced = await engine.replace(file.bytes, p.rule);
          count += replaced.count;
          if (replaced.count) documents++;
          return {
            name: filename(file.name, [], {}, i, used),
            bytes: p.dryRun ? new Uint8Array() : replaced.bytes,
          };
        },
        progress,
        (file) => file.name,
      );
      if (p.dryRun) {
        result.files = [];
        delete result.archive;
      }
      return { ...result, count, documents };
    },
    structured: (p: TaskMap['structured']['input']) => {
      const used = new Set<string>();
      return batch(
        p.files,
        async (file, i) => {
          const analysis = await engine.parse(file.bytes);
          if (!analysis.fields.length) throw new Error('В файле нет явных плейсхолдеров.');
          const fields = analysis.fields.map((f) => {
            const configured = p.fields.find((v) => v.name === f.name);
            return configured ? { ...configured, occurrences: f.occurrences } : f;
          });
          return {
            name: filename(file.name, [], {}, i, used),
            bytes: await engine.generate(file.bytes, fields, p.rows[i] || {}),
          };
        },
        progress,
        (file) => file.name,
      );
    },
    importTemplate,
    exportTemplate,
  };
  // The task map ties input and output types; the worker protocol preserves the discriminant.
  const handler = handlers[task] as (value: TaskMap[K]['input']) => Promise<TaskMap[K]['output']>;
  return handler(input);
}
