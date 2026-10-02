import { it, expect } from 'vitest';
import { reactive } from 'vue';
import { snapshot } from '../src/shared/snapshot';
it('serializes nested Vue proxies for IndexedDB and worker boundaries', () => {
  const nested = reactive({ id: 'field', occurrences: [{ start: 0, end: 3 }] });
  const value = reactive({ fields: [nested], source: new Uint8Array([1, 2, 3]) });
  const cloned = structuredClone(snapshot(value));
  expect(cloned.fields[0].occurrences[0].end).toBe(3);
  expect(cloned.source).toEqual(new Uint8Array([1, 2, 3]));
});
