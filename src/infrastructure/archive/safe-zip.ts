import JSZip from 'jszip';
// Resource ceilings protect against malicious archives, not ordinary batch sizes.
export const archiveLimits = {
  compressedBytes: 128 * 1024 * 1024,
  expandedBytes: 256 * 1024 * 1024,
  entries: 10000,
};
export async function safeZip(bytes: Uint8Array): Promise<JSZip> {
  if (bytes.byteLength > archiveLimits.compressedBytes)
    throw new Error('Архив превышает безопасный объём 128 МиБ. Разделите его.');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--)
    if (view.getUint32(i, true) === 0x06054b50 && i + 22 + view.getUint16(i + 20, true) === bytes.length) {
      end = i;
      break;
    }
  if (end < 0) throw new Error('Повреждённый ZIP или DOCX. Не найден каталог архива.');
  const count = view.getUint16(end + 10, true);
  let cursor = view.getUint32(end + 16, true);
  let total = 0;
  if (
    view.getUint16(end + 4, true) ||
    view.getUint16(end + 6, true) ||
    count === 65535 ||
    count > archiveLimits.entries
  )
    throw new Error('Многотомные, ZIP64 и архивы с чрезмерным количеством файлов не поддерживаются.');
  const names = new Set<string>();
  for (let i = 0; i < count; i++) {
    if (cursor + 46 > end || view.getUint32(cursor, true) !== 0x02014b50)
      throw new Error('Повреждённый каталог ZIP.');
    const size = view.getUint32(cursor + 24, true),
      length = view.getUint16(cursor + 28, true),
      extra = view.getUint16(cursor + 30, true),
      comment = view.getUint16(cursor + 32, true);
    if (view.getUint16(cursor + 8, true) & 1)
      throw new Error('Архив защищён паролем. Сохраните незашифрованную копию.');
    if (cursor + 46 + length + extra + comment > end) throw new Error('Повреждённый каталог ZIP.');
    const name = new TextDecoder().decode(bytes.subarray(cursor + 46, cursor + 46 + length));
    if (
      name.includes('\\') ||
      name.startsWith('/') ||
      name.includes(':') ||
      name.includes('\0') ||
      name.split('/').some((s) => s === '..') ||
      names.has(name)
    )
      throw new Error('Небезопасные или повторяющиеся пути внутри архива.');
    names.add(name);
    total += size;
    if (total > archiveLimits.expandedBytes || size === 0xffffffff)
      throw new Error('Распакованный архив слишком велик для безопасной обработки.');
    cursor += 46 + length + extra + comment;
  }
  const zip = await JSZip.loadAsync(bytes);
  if (Object.keys(zip.files).length !== count)
    throw new Error('Повторяющиеся или неоднозначные имена файлов внутри ZIP.');
  for (const file of Object.values(zip.files)) {
    const original = (file as unknown as { unsafeOriginalName?: string }).unsafeOriginalName || file.name;
    if (
      original.includes('\\') ||
      original.startsWith('/') ||
      original.includes(':') ||
      original.split('/').includes('..')
    )
      throw new Error('Небезопасные пути внутри ZIP.');
  }
  // Read each entry with a streaming counter: do not trust central-directory sizes.
  let actual = 0;
  for (const file of Object.values(zip.files).filter((f) => !f.dir)) {
    await new Promise<void>((resolve, reject) => {
      const stream = (
        file as unknown as { internalStream(type: 'uint8array'): JSZip.JSZipStreamHelper<Uint8Array> }
      ).internalStream('uint8array');
      stream
        .on('data', (chunk: Uint8Array) => {
          actual += chunk.length;
          if (actual > archiveLimits.expandedBytes) {
            stream.pause();
            reject(new Error('Превышен безопасный объём распаковки.'));
          }
        })
        .on('error', reject)
        .on('end', resolve)
        .resume();
    });
  }
  return zip;
}
export async function createArchive(files: { name: string; bytes: Uint8Array }[]) {
  const zip = new JSZip();
  for (const f of files) zip.file(f.name, f.bytes);
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
}
