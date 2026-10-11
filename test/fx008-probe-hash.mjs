// SHA-256 of JSON.stringify(probes) with every `flipped` removed. It changes
// in the same commit as the table, so it catches only accidental edits; the
// real control is the reviewer's diff of test/fx008-probe-table*.mjs.
export const tableHash = 'a3fca6e7c5b59452ba59e5ff9a96648a3f7a5ec3e983ba792cac5311a3560891';
