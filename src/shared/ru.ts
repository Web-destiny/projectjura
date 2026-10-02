const rules = new Intl.PluralRules('ru-RU');
export function counted(n: number, forms: [string, string, string]): string {
  const form = rules.select(n);
  return `${n} ${forms[form === 'one' ? 0 : form === 'few' ? 1 : 2]}`;
}
export const documents = (n: number) => counted(n, ['документ', 'документа', 'документов']);
