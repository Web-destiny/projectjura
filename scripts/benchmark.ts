import { mkdir, writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { makeDocx } from '../tests/fixtures';
import { DocxDocumentEngine } from '../src/infrastructure/docx/engine';
import { execute } from '../src/workers/tasks';
const engine = new DocxDocumentEngine();
const results = [];
for (const padding of [0, 100_000]) {
  const source = await makeDocx(undefined, undefined, padding);
  const fields = (await engine.parse(source)).fields;
  for (const count of [1, 10, 100, 500]) {
    const start = performance.now();
    const result = await execute(
      'generate',
      {
        source,
        fields,
        rows: Array.from({ length: count }, (_, i) =>
          Object.fromEntries(fields.map((f) => [f.id, `Значение ${i + 1}`])),
        ),
        filename: '',
      },
      () => {},
    );
    const sample = {
      count,
      inputBytes: source.length,
      outputBytes: result.files.reduce((n, f) => n + f.bytes.length, 0),
      elapsedMs: Math.round(performance.now() - start),
      rssMiB: Math.round(process.memoryUsage().rss / 1024 / 1024),
      errors: result.errors.length,
    };
    results.push(sample);
    console.log(sample);
  }
}
await mkdir('docs', { recursive: true });
await writeFile(
  'docs/benchmark.json',
  JSON.stringify(
    { runtime: process.version, platform: process.platform, date: new Date().toISOString(), results },
    null,
    2,
  ),
);
