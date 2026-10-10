// SHA-256 of JSON.stringify(probes) with every `flipped` removed. It changes
// in the same commit as the table, so it catches only accidental edits; the
// real control is the reviewer's diff of test/fx008-probe-table*.mjs.
export const tableHash = '669451301ce26e0d082a395ed4359dfd4189bddf014dc8b120b4bd4106e91cf5';
