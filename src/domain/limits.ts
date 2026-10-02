/** Output retention measured with scripts/benchmark.ts; see docs/benchmark.json. */
export const processingLimits = {
  softDocuments: 100,
  maxRetainedOutputBytes: 64 * 1024 * 1024,
  maxInputBatchBytes: 128 * 1024 * 1024,
};
