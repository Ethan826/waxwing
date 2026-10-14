// SHA-256 of JSON.stringify(probes) with every `flipped` removed. It changes
// in the same commit as the table, so it catches only accidental edits; the
// real control is the reviewer's diff of test/fx008-probe-table*.mjs.
export const tableHash =
  'c4508bb2d2eab8e6aadda513483cf12b80412f6bf5b089f95e43a91fc7f0b5b7';
