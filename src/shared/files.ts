export function download(bytes: Uint8Array | string, name: string, type = 'application/octet-stream') {
  const blob = new Blob([typeof bytes === 'string' ? bytes : new Uint8Array(bytes)], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export const readFile = async (file: File) => {
  if (file.size > 128 * 1024 * 1024)
    throw new Error('Файл превышает безопасный объём 128 МиБ. Разделите его на меньшие части.');
  return new Uint8Array(await file.arrayBuffer());
};
export const errorMessage = (e: unknown) =>
  e instanceof Error ? e.message : 'Не удалось выполнить действие. Попробуйте ещё раз.';
