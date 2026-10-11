// SHA-256 of JSON.stringify(probes) with every `flipped` removed. It changes
// in the same commit as the table, so it catches only accidental edits; the
// real control is the reviewer's diff of test/fx008-probe-table*.mjs.
export const tableHash = '5e5f74bbe031104811c42d42e8257738e4669f43664684d2d1a6fa75a201f6d8';
