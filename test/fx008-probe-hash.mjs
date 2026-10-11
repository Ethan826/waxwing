// SHA-256 of JSON.stringify(probes) with every `flipped` removed. It changes
// in the same commit as the table, so it catches only accidental edits; the
// real control is the reviewer's diff of test/fx008-probe-table*.mjs.
export const tableHash = '4c48bb1ac91e6c10d1e8d76f8ed943a303797fd0f17cdeb9afaae057e05c115b';
