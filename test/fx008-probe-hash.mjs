// SHA-256 of JSON.stringify(probes) with every `flipped` removed. It changes
// in the same commit as the table, so it catches only accidental edits; the
// real control is the reviewer's diff of test/fx008-probe-table*.mjs.
export const tableHash = 'cc74ea73a64c47d9730acbfbb89791e2e71ea1cfe94b7e7764ef0b2300f1307c';
