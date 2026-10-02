export type FieldType = 'text' | 'multiline' | 'date' | 'number';
export interface Occurrence {
  part: string;
  paragraph: number;
  start: number;
  end: number;
  text: string;
}
export interface Field {
  id: string;
  name: string;
  type: FieldType;
  required: boolean;
  format: string;
  preview: string;
  occurrences: Occurrence[];
}
export interface Paragraph {
  part: string;
  paragraph: number;
  text: string;
  table: boolean;
  editable: boolean;
}
export interface Analysis {
  paragraphs: Paragraph[];
  fields: Field[];
  warnings: string[];
}
export type DataRow = Record<string, string>;
export interface Sheet {
  name: string;
  headers: string[];
  rows: string[][];
}
export interface Template {
  id: string;
  name: string;
  source: Uint8Array;
  fields: Field[];
  filename: string;
  updatedAt: number;
}
export interface Draft {
  template: Template;
  rows: DataRow[];
  step: number;
  updatedAt: number;
}
export interface EditDraft {
  files: OutputFile[];
  mode: string;
  fields: Field[];
  rows: DataRow[];
  rule: ReplaceRule;
  updatedAt: number;
}
export interface ReplaceRule {
  find: string;
  replacement: string;
  caseSensitive: boolean;
  wholeWord: boolean;
  body: boolean;
  tables: boolean;
  headers: boolean;
}
export interface OutputFile {
  name: string;
  bytes: Uint8Array;
}
export interface JobResult {
  files: OutputFile[];
  errors: { name: string; message: string }[];
  archive?: Uint8Array;
}
export interface DocumentEngine {
  supports(name: string): boolean;
  parse(source: Uint8Array): Promise<Analysis>;
  detectFields(paragraphs: Paragraph[]): Field[];
  generate(source: Uint8Array, fields: Field[], row: DataRow): Promise<Uint8Array>;
  replace(source: Uint8Array, rule: ReplaceRule): Promise<{ bytes: Uint8Array; count: number }>;
}
