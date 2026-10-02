import { safeZip } from '../archive/safe-zip';
import { xml, serialize } from './text-index';
/** Remove external relationships before a renderer can create resource-bearing elements. */
export async function previewSource(source: Uint8Array) {
  const zip = await safeZip(source);
  for (const name of Object.keys(zip.files).filter((n) => n.endsWith('.rels'))) {
    const doc = xml(await zip.file(name)!.async('string'));
    for (const rel of Array.from(doc.getElementsByTagName('Relationship'))) {
      const target = rel.getAttribute('Target') || '';
      if (rel.getAttribute('TargetMode') === 'External' || /^(?:[a-z][a-z\d+.-]*:|\/\/)/iu.test(target))
        rel.parentNode?.removeChild(rel);
    }
    zip.file(name, serialize(doc));
  }
  return zip.generateAsync({ type: 'uint8array' });
}
