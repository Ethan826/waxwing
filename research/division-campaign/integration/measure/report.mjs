// The measurements as Markdown tables: distributions, the worst
// functions, and what was left out.

const columns = [
  ['R', row => row.R],
  ['L', row => row.L],
  ['L rel.', row => row.Lrelevant],
  ['flex rows', row => row.flexRows],
  ['log2 pat.', row => row.log2.patterns],
  ['log2 cons.', row => row.log2.consistent],
  ['log2 bit', row => row.log2.bitCheck],
  ['log2 wr.', row => row.log2.writtenCheck],
  ['log2 sl. pat.', row => row.log2.slicedPatterns ?? 0],
  ['log2 sl. bit', row => row.log2.slicedBitCheck ?? 0],
  ['log2 sl. wr.', row => row.log2.slicedWritten ?? 0]
];

const quantile = (sorted, q) =>
  sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
const shown = value => Number.isInteger(value) ? `${value}` : value.toFixed(1);

const distribution = (rows, title) => {
  const lines = [`${title} (${rows.length} functions)`, '',
    '| measure | p50 | p90 | p99 | max |', '|---|---|---|---|---|'];
  for (const [name, read] of columns) {
    const sorted = rows.map(read).sort((a, b) => a - b);
    if (sorted.length === 0) continue;
    lines.push(`| ${name} | ${[0.5, 0.9, 0.99].map(q =>
      shown(quantile(sorted, q))).join(' | ')} | ${shown(sorted.at(-1))} |`);
  }
  return lines.join('\n');
};

const worst = (rows, count) => {
  const lines = ['| function | origin | verdict | R | Rm | L | L rel. | ' +
    'flex | pat. | cons. | bit | wr. | sl. pat. | sl. wr. | slices |',
  '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|'];
  const marked = row => `${row.origin}${row.joined ? ' (j)' : ''}`;
  const ranked = [...rows].sort((a, b) =>
    b.log2.patterns - a.log2.patterns || b.log2.writtenCheck -
      a.log2.writtenCheck).slice(0, count);
  for (const row of ranked) {
    const l = row.log2;
    lines.push(`| ${row.name} | ${marked(row)} | ${row.verdict} | ${row.R} | ` +
      `${row.Rm} | ${row.L} | ${row.Lrelevant} | ${row.flexRows} | ` +
      `${l.patterns} | ${shown(l.consistent)} | ${l.bitCheck} | ` +
      `${l.writtenCheck} | ${shown(l.slicedPatterns ?? 0)} | ` +
      `${shown(l.slicedWritten ?? 0)} | ${row.slices} |`);
  }
  return lines.join('\n');
};

const category = origin => {
  if (origin.endsWith('.wxw')) return '.wxw files';
  if (origin.startsWith('test/fixtures/')) return 'JSON fixtures';
  if (origin.includes('.md#')) return 'Markdown blocks';
  if (origin.startsWith('generated:')) return 'generated (seeded)';
  return 'test data modules';
};

const categories = (results, refused) => {
  const lines = ['| origin | sources | not resolved | functions | R > 0 | ' +
    'from joined sources |', '|---|---|---|---|---|---|'];
  const names = [...new Set([...results, ...refused]
    .map(row => category(row.origin)))];
  for (const name of names) {
    const rows = results.filter(row => category(row.origin) === name);
    lines.push(`| ${name} | ${new Set(rows.map(row => row.origin)).size} | ` +
      `${refused.filter(row => category(row.origin) === name).length} | ` +
      `${rows.length} | ${rows.filter(row => row.R > 0).length} | ` +
      `${rows.filter(row => row.joined).length} |`);
  }
  return lines.join('\n');
};

const generatedRow = row => row.origin.startsWith('generated:');

const over = (rows, read, limit) =>
  rows.filter(row => read(row) > limit).length;

const thresholds = rows => {
  const lines = ['| log2 cases | > 10 | > 20 | > 30 | > 40 |',
    '|---|---|---|---|---|'];
  for (const [name, read] of columns.slice(4)) {
    lines.push(`| ${name} | ${[10, 20, 30, 40].map(limit =>
      over(rows, read, limit)).join(' | ')} |`);
  }
  return lines.join('\n');
};

export const report = (results, refused, sources) => {
  const rigid = results.filter(row => row.R > 0);
  const stages = refused.reduce((tally, entry) => {
    tally[entry.stage] = (tally[entry.stage] ?? 0) + 1;
    return tally;
  }, {});
  const verdicts = results.reduce((tally, row) => {
    tally[row.verdict] = (tally[row.verdict] ?? 0) + 1;
    return tally;
  }, {});
  return [
    `Sources measured: ${sources}; not resolved: ` +
      `${JSON.stringify(stages)}.`,
    `Functions: ${results.length}, verdicts ${JSON.stringify(verdicts)}; ` +
      `with a rigid record row: ${rigid.length}.`,
    '', categories(results, refused),
    '', distribution(results, 'All functions'),
    '', distribution(rigid.filter(row => !generatedRow(row)),
      'Hand-written functions with R > 0'),
    '', distribution(rigid.filter(generatedRow),
      'Generated functions with R > 0'),
    '', 'Functions over a threshold (all functions)', '', thresholds(results),
    '', 'Worst 20 by log2 patterns ((j): two-spread literals joined)', '',
    worst(results, 20)
  ].join('\n');
};
