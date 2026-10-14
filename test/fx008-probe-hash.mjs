// SHA-256 of JSON.stringify(probes) with every `flipped` removed. It changes
// in the same commit as the table, so it catches only accidental edits; the
// real control is the reviewer's diff of test/fx008-probe-table*.mjs.
export const tableHash =
  '620b09c6451e20533e243c2b16f11a95b8791fc8b0484a049ac65413390dd0b1';
