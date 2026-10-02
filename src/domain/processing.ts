import type { Analysis, DataRow, Field, JobResult, OutputFile, ReplaceRule, Template } from './models';
import type { Sheet } from './models';
export interface TaskMap {
  renderSource: { input: Uint8Array; output: Uint8Array };
  analyze: { input: Uint8Array; output: Analysis };
  preview: { input: { source: Uint8Array; fields: Field[]; row: DataRow }; output: Uint8Array };
  generate: {
    input: { source: Uint8Array; fields: Field[]; rows: DataRow[]; filename: string; rowNumbers?: number[] };
    output: JobResult;
  };
  spreadsheet: { input: { bytes: Uint8Array; name: string }; output: Sheet[] };
  unpack: { input: Uint8Array; output: OutputFile[] };
  replace: {
    input: { files: OutputFile[]; rule: ReplaceRule; dryRun: boolean };
    output: JobResult & { count: number; documents: number };
  };
  structured: { input: { files: OutputFile[]; fields: Field[]; rows: DataRow[] }; output: JobResult };
  importTemplate: { input: Uint8Array; output: Template };
  exportTemplate: { input: Template; output: Uint8Array };
}
export interface Progress {
  current: number;
  total: number;
  stage: string;
}
export interface ProcessingProvider {
  run<K extends keyof TaskMap>(
    task: K,
    input: TaskMap[K]['input'],
    progress?: (value: Progress) => void,
  ): Promise<TaskMap[K]['output']>;
  cancel(): void;
}
