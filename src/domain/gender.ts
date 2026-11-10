import type { DataRow, Field } from './models';

type Gender = 'мужской' | 'женский';
export interface GenderGuess {
  value: Gender;
  source: 'patronymic' | 'surname';
}

const nameKey = '__dzhura_gender_name';
const valueKey = '__dzhura_gender_value';
const sourceKey = '__dzhura_gender_source';
const manualKey = '__dzhura_gender_manual';
const normalize = (value: string) => value.toLocaleLowerCase('ru-RU').replace(/[^\p{L}\p{N}]/gu, '');

export function genderFields(fields: Field[]): { name: Field; gender: Field } | undefined {
  const names = fields.filter((field) =>
    ['фио', 'фиосотрудника', 'фиоработника', 'фамилияимяотчество'].includes(normalize(field.name)),
  );
  const genders = fields.filter((field) =>
    ['пол', 'полсотрудника', 'полработника'].includes(normalize(field.name)),
  );
  return names.length === 1 && genders.length === 1 ? { name: names[0], gender: genders[0] } : undefined;
}

function surnameGender(surname: string): Gender | undefined {
  if (!/^[а-яё]+(?:-[а-яё]+)*$/iu.test(surname)) return;
  const genders = surname
    .toLocaleLowerCase('ru-RU')
    .split('-')
    .map((part) => {
      if (/(?:ова|ева|ёва|ина|ына|ская|цкая)$/u.test(part)) return 'женский';
      if (/(?:ов|ев|ёв|ин|ын|ский|цкий)$/u.test(part)) return 'мужской';
      return undefined;
    });
  return genders[0] && genders.every((value) => value === genders[0]) ? genders[0] : undefined;
}

export function inferGender(fullName: string): GenderGuess | undefined {
  const parts = fullName.trim().split(/\s+/u).filter(Boolean);
  if (parts.length < 2) return;
  const surname = surnameGender(parts[0]);
  if (parts.length >= 3) {
    const patronymic = parts.at(-1)!.toLocaleLowerCase('ru-RU');
    if (/^[а-яё]+$/u.test(patronymic)) {
      const value = /(?:овна|евна|ична)$/u.test(patronymic)
        ? 'женский'
        : /(?:ович|евич|ич)$/u.test(patronymic)
          ? 'мужской'
          : undefined;
      if (value) return !surname || surname === value ? { value, source: 'patronymic' } : undefined;
    }
  }
  return surname ? { value: surname, source: 'surname' } : undefined;
}

function clearMarker(row: DataRow) {
  delete row[nameKey];
  delete row[valueKey];
  delete row[sourceKey];
}

/** Only fills empty cells; remembers guesses so edited names are recalculated without overwriting user input. */
export function applyGenderSuggestions(rows: DataRow[], fields: Field[]): DataRow[] {
  const selected = genderFields(fields);
  if (!selected) return rows;
  return rows.map((original) => {
    const row = { ...original };
    const name = (row[selected.name.id] || '').trim();
    const value = row[selected.gender.id] || '';
    if (row[valueKey] && value !== row[valueKey]) {
      clearMarker(row);
      row[manualKey] = '1';
      return row;
    }
    if (row[valueKey] && name !== row[nameKey]) {
      row[selected.gender.id] = '';
      clearMarker(row);
    }
    if (!row[selected.gender.id]?.trim() && !row[manualKey]) {
      const guess = inferGender(name);
      if (guess) {
        row[selected.gender.id] = guess.value;
        row[nameKey] = name;
        row[valueKey] = guess.value;
        row[sourceKey] = guess.source;
      }
    }
    return row;
  });
}

export function removeGenderSuggestions(rows: DataRow[], fields: Field[]): DataRow[] {
  const selected = genderFields(fields);
  if (!selected) return rows;
  return rows.map((original) => {
    const row = { ...original };
    if (row[valueKey] && row[selected.gender.id] === row[valueKey]) row[selected.gender.id] = '';
    clearMarker(row);
    delete row[manualKey];
    return row;
  });
}

export function genderSuggestionInfo(row: DataRow): 'patronymic' | 'surname' | undefined {
  return row[sourceKey] === 'surname' || row[sourceKey] === 'patronymic' ? row[sourceKey] : undefined;
}
