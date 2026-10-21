// Stream 9's results as Markdown tables. Counts are log2 of the number
// of cases each enumeration tries (../measure/metrics.mjs); sliced
// counts are summed over the slices that hold a rigid row
// (../measure/variants.mjs).

import { log2Sum } from '../measure/counting.mjs';

const shown = value =>
  Number.isInteger(value) ? `${value}` : value.toFixed(1);

const names = ['rows', '7b', 'joined', 'solved'];
const titles = { rows: '(i)', '7b': '7b', joined: '(ii)', solved: '(ii)σ' };
const none = { patterns: 0, consistent: 0, bitCheck: 0, writtenCheck: 0,
  slices: 0, largest: 0, ground: 0 };

const sizes = entry => [
  '| function | verdict | R | Rm | L | L rel. | F | pat. | cons. | bit | ' +
    'wr. |',
  '|---|---|---|---|---|---|---|---|---|---|---|',
  ...entry.functions.map(row => {
    const l = row.log2;
    return `| ${row.name} | ${row.verdict} | ${row.R} | ${row.Rm} | ` +
      `${row.L} | ${row.Lrelevant} | ${row.flexRows} | ${l.patterns} | ` +
      `${shown(l.consistent)} | ${l.bitCheck} | ${l.writtenCheck} |`;
  })
].join('\n');

// One line per function with a rigid row and per variant.
const slicing = entry => [
  '| function | slicing | slices | pat. | cons. | bit | wr. | ' +
    'largest pat. | ground |',
  '|---|---|---|---|---|---|---|---|---|',
  ...entry.functions.filter(row => row.R > 0).flatMap(row =>
    names.map(name => {
      const v = row.sliced[name] ?? none;
      return `| ${row.name} | ${titles[name]} | ${v.slices} | ` +
        `${shown(v.patterns)} | ${shown(v.consistent)} | ` +
        `${shown(v.bitCheck)} | ${shown(v.writtenCheck)} | ${v.largest} | ` +
        `${v.ground} |`;
    }))
].join('\n');

// Each function is checked on its own, so a module costs the sum.
const total = entry => {
  const sum = read => shown(log2Sum(entry.functions.map(read)) ?? 0);
  const sliced = name => sum(row => (row.sliced[name] ?? none).patterns);
  return `Module total over ${entry.functions.length} functions (log2 of ` +
    `the sum): patterns ${sum(row => row.log2.patterns)}, consistent ` +
    `${sum(row => row.log2.consistent)}, sliced patterns (i) ` +
    `${sliced('rows')}, (ii) ${sliced('joined')}, (ii)σ ${sliced('solved')}.`;
};

const program = entry => {
  const mark = entry.joins ? ` (j: ${entry.joins} joins)` : '';
  return [`### ${entry.origin}${mark}`,
    `Whole program: ${entry.program ?? `not resolved (${entry.stage})`}.`,
    sizes(entry), slicing(entry), total(entry)].join('\n\n');
};

export const programTables = programs =>
  ['## Programs', ...programs.map(program)].join('\n\n');

const point = ({ size, joins, program, row }) => {
  const l = row.log2;
  const s = name => row.sliced[name] ?? none;
  return `| ${size}${joins ? ' (j)' : ''} | ${row.verdict} | ` +
    `${program === 'accepted' ? 'yes' : 'no'} | ${row.R} | ${row.L} | ` +
    `${row.flexRows} | ${l.patterns} | ${shown(l.consistent)} | ` +
    `${l.writtenCheck} | ${shown(s('rows').patterns)} | ` +
    `${shown(s('joined').patterns)} | ${shown(s('joined').consistent)} | ` +
    `${shown(s('joined').writtenCheck)} | ${shown(s('solved').patterns)} | ` +
    `${shown(s('solved').writtenCheck)} |`;
};

const limit = 30;
const columns = [['pat.', row => row.log2.patterns],
  ['cons.', row => row.log2.consistent],
  ['(i) pat.', row => (row.sliced.rows ?? none).patterns],
  ['(ii) pat.', row => (row.sliced.joined ?? none).patterns],
  ['(ii) cons.', row => (row.sliced.joined ?? none).consistent],
  ['(ii)σ pat.', row => (row.sliced.solved ?? none).patterns]];

// The first measured n whose count passes 2^30, per column.
const past = points => `First measured n past 2^${limit}: ` +
  columns.map(([title, read]) => {
    const first = points.find(entry => read(entry.row) > limit);
    return `${title} ${first ? first.size : 'none'}`;
  }).join('; ') + '.';

const family = ({ name, target, points }) => [
  `### ${name} (\`${target}\`)`, '', past(points), '',
  '| n | verdict | program | R | L | F | pat. | cons. | wr. | (i) pat. | ' +
    '(ii) pat. | (ii) cons. | (ii) wr. | (ii)σ pat. | (ii)σ wr. |',
  '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|',
  ...points.map(point)
].join('\n');

export const scaleTables = scaling =>
  ['', '## Scaling', ...scaling.map(family)].join('\n\n');
