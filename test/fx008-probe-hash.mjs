// SHA-256 of JSON.stringify(probes) with every `flipped` removed. It changes
// in the same commit as the table, so it catches only accidental edits; the
// real control is the reviewer's diff of test/fx008-probe-table*.mjs.
export const tableHash = '241d19ce1ffd181846465cb32b9b75227d29f0108609a37fc512820665079a94';
