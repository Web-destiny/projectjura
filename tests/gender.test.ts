import { describe, expect, it } from 'vitest';
import type { DataRow, Field } from '../src/domain/models';
import {
  applyGenderSuggestions,
  genderFields,
  genderSuggestionInfo,
  inferGender,
  removeGenderSuggestions,
} from '../src/domain/gender';

const fields: Field[] = ['ФИО', 'Пол'].map((name, index) => ({
  id: String(index),
  name,
  type: 'text',
  required: false,
  format: '',
  preview: '',
  occurrences: [],
}));

describe('gender suggestions', () => {
  // All names below are invented test strings, not employee records.
  it('uses patronymics first and surnames only as a fallback', () => {
    expect(inferGender('Тестов Пример Никитич')).toEqual({ value: 'мужской', source: 'patronymic' });
    expect(inferGender('Тестова Пример Ильинична')).toEqual({ value: 'женский', source: 'patronymic' });
    expect(inferGender('Тестов Пример')).toEqual({ value: 'мужской', source: 'surname' });
    expect(inferGender('Тестова Пример')).toEqual({ value: 'женский', source: 'surname' });
    expect(inferGender('Тестов-Примеров Пример')).toEqual({ value: 'мужской', source: 'surname' });
    expect(inferGender('Ким Пример')).toBeUndefined();
    expect(inferGender('Тестов')).toBeUndefined();
    expect(inferGender('Тестов-Примерова Пример')).toBeUndefined();
    expect(inferGender('Тестов Пример Тестовна')).toBeUndefined();
  });
  it('fills only missing values, refreshes guesses after a name change and preserves manual edits', () => {
    const imported: DataRow[] = [
      { '0': 'Тестов Тест Тестович', '1': 'значение из Excel' },
      { '0': 'Тестова Пример' },
      { '0': 'Ким Пример' },
    ];
    const initial = applyGenderSuggestions(imported, fields);
    expect(initial[0]['1']).toBe('значение из Excel');
    expect(initial[1]['1']).toBe('женский');
    expect(genderSuggestionInfo(initial[1])).toBe('surname');
    expect(initial[2]['1']).toBeUndefined();
    const changed = applyGenderSuggestions([{ ...initial[1], '0': 'Тестов Тест Тестович' }], fields);
    expect(changed[0]['1']).toBe('мужской');
    expect(genderSuggestionInfo(changed[0])).toBe('patronymic');
    const corrected = applyGenderSuggestions([{ ...changed[0], '1': 'своё значение' }], fields);
    expect(corrected[0]['1']).toBe('своё значение');
    expect(genderSuggestionInfo(corrected[0])).toBeUndefined();
    const cleared = applyGenderSuggestions([{ ...changed[0], '1': '' }], fields);
    expect(applyGenderSuggestions(cleared, fields)[0]['1']).toBe('');
    expect(removeGenderSuggestions(changed, fields)[0]['1']).toBe('');
  });
  it('only enables matching when both field names are unambiguous', () => {
    expect(genderFields(fields)).toBeDefined();
    expect(genderFields([...fields, { ...fields[0], id: 'other' }])).toBeUndefined();
  });
});
