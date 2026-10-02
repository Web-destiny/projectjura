import { toRaw } from 'vue';
/** Make a serializable boundary value, including nested proxies from edited arrays. */
export function snapshot<T>(value: T): T {
  const raw = toRaw(value);
  if (raw instanceof Uint8Array) return new Uint8Array(raw) as T;
  if (Array.isArray(raw)) return raw.map((item) => snapshot(item)) as T;
  if (raw && typeof raw === 'object')
    return Object.fromEntries(Object.entries(raw).map(([key, item]) => [key, snapshot(item)])) as T;
  return raw;
}
