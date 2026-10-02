import { z } from 'zod';
import JSZip from 'jszip';
import { safeZip } from './safe-zip';
import { DocxDocumentEngine } from '../docx/engine';
import type { Template } from '../../domain/models';
import { overlaps } from '../../domain/fields';
const occurrence = z.object({
  part: z.string().regex(/^word\/(document|header\d*|footer\d*)\.xml$/u),
  paragraph: z.number().int().nonnegative(),
  start: z.number().int().nonnegative(),
  end: z.number().int().positive(),
  text: z.string(),
});
const field = z.object({
  id: z.string().min(1).max(200),
  name: z.string().min(1).max(200),
  type: z.enum(['text', 'multiline', 'date', 'number']),
  required: z.boolean(),
  format: z.string().max(40),
  preview: z.string(),
  occurrences: z.array(occurrence).min(1),
});
const schema = z.object({
  name: z.string().min(1).max(200),
  filename: z.string().max(200),
  fields: z.array(field),
});
export async function exportTemplate(t: Template) {
  const zip = new JSZip();
  zip.file('manifest.json', JSON.stringify({ format: 'dzhura-template', version: 1 }));
  zip.file('project.json', JSON.stringify({ name: t.name, filename: t.filename, fields: t.fields }));
  zip.file('template.docx', t.source);
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
}
export async function importTemplate(bytes: Uint8Array): Promise<Template> {
  const zip = await safeZip(bytes);
  const expected = ['manifest.json', 'project.json', 'template.docx'];
  if (Object.keys(zip.files).some((n) => !expected.includes(n)) || expected.some((n) => !zip.file(n)))
    throw new Error('Некорректный пакет .dzhura.');
  const manifest = JSON.parse(await zip.file('manifest.json')!.async('string'));
  if (manifest.format !== 'dzhura-template' || manifest.version !== 1)
    throw new Error('Версия .dzhura не поддерживается.');
  const parsed = schema.safeParse(JSON.parse(await zip.file('project.json')!.async('string')));
  if (!parsed.success) throw new Error('Настройки шаблона повреждены.');
  const project = parsed.data,
    source = await zip.file('template.docx')!.async('uint8array');
  const analysis = await new DocxDocumentEngine().parse(source);
  if (
    new Set(project.fields.map((f) => f.id)).size !== project.fields.length ||
    new Set(project.fields.map((f) => f.name)).size !== project.fields.length
  )
    throw new Error('Повторяющиеся поля шаблона.');
  const seen: z.infer<typeof occurrence>[] = [];
  for (const f of project.fields)
    for (const o of f.occurrences) {
      const p = analysis.paragraphs.find((p) => p.part === o.part && p.paragraph === o.paragraph);
      if (
        !p?.editable ||
        o.end <= o.start ||
        p.text.slice(o.start, o.end) !== o.text ||
        seen.some((s) => overlaps(s, o))
      )
        throw new Error('Поля шаблона не соответствуют документу или пересекаются.');
      seen.push(o);
    }
  return { ...project, source, id: crypto.randomUUID(), updatedAt: Date.now() };
}
