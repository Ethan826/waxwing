// The feature census of the FX001 corpus (brief Task 10, step 2): how many
// generated programs exercised each behaviour, as the reference
// interpreter observed it (not as the generator intended it), and the
// minimums a run must meet.
const scoped = 50;
const cleanup = 25;
const texts = 250;
const literals = 75;
// FX020 spellings (test/fx-gen-names.mjs): programs that perform an
// operation written qualified, imported, or through an alias.
const spellings = { qualified: 400, import: 150, alias: 50 };
// R001 records (test/fx-gen-records.mjs); the frame is in 70% of programs.
const records = 250;

// [name, interpreter events (any of them counts), minimum programs]
export const categories = [
  ['nested same-key handlers', ['nested-same-key', 'forward'], scoped],
  ['intercept-and-forward (counted within the row above)', ['forward'], scoped],
  ['aborts crossing an unrelated handle', ['abort-crosses-handle'], scoped],
  ['stage order with over-application', ['over-application'], scoped],
  ['escaped callbacks under another handler', ['escaped-callback'], scoped],
  ['cleanup: normal exit', ['cleanup-exit-normal'], cleanup],
  ['cleanup: abort', ['cleanup-exit-abort'], cleanup],
  ['cleanup: defect', ['cleanup-exit-defect'], cleanup],
  ['cleanup: crash on normal exit', ['cleanup-crash-normal'], cleanup],
  ['cleanup: crash while an abort is pending', ['cleanup-crash-abort'],
    cleanup],
  ['cleanup: several crashes', ['cleanup-multi-crash'], cleanup],
  ['cleanup: handles its own failure during an abort',
    ['cleanup-own-fail-during-abort'], cleanup],
  ['cleanup: registration context while unwinding',
    ['cleanup-registration-context'], cleanup],
  ['cleanup: unreached defer', ['unreached-defer'], cleanup],
  // `w` is reserved for the parameter of generated failing clauses.
  ['failing random clause', ['clause-abort:w'], cleanup],
  // Text v1 (design §5); the frame is in 70% of programs.
  ['text: interpolation', ['text-interpolation'], texts],
  ['text: effectful interpolation hole', ['text-effectful-hole'], texts],
  ['text: several effectful holes in one literal', ['text-ordered-holes'],
    texts],
  ['text: ++', ['text-concat'], texts],
  ['text: ++ with an effectful operand', ['text-effectful-concat'], literals],
  ['text: nested in data', ['text-in-data'], texts],
  ['text: show', ['text-show'], texts],
  ['text: comparison', ['text-compare'], texts],
  ['text: comparison with a non-BMP character', ['text-compare-astral'],
    texts],
  ['text: non-BMP against a BMP scalar above the surrogates',
    ['text-compare-trap'], texts],
  ['text: raw literal', ['text-raw'], literals],
  ['text: block literal', ['text-block'], literals],
  ['spelling: a qualified operation performed', ['spelling-qualified'],
    spellings.qualified],
  ['spelling: an imported operation performed', ['spelling-import'],
    spellings.import],
  ['spelling: an operation performed through an alias', ['spelling-alias'],
    spellings.alias],
  ['record: literal', ['record-literal'], records],
  ['record: access', ['record-access'], records],
  ['record: update', ['record-update'], records],
  ['record: generic function over an open record', ['record-generic'],
    records],
  ['record: comparison', ['record-compare'], records],
  ['record: printed', ['record-print', 'record-show'], records],
  ['record: Fail payload', ['record-fail'], records]
];

// outcomes: the interpreter outcomes of the run's programs.
export const census = outcomes => categories.map(([name, events, minimum]) => ({
  name, minimum,
  programs: outcomes.filter(found =>
    events.some(event => found.events.has(event))).length
}));

export const shortfalls = rows =>
  rows.filter(row => row.programs < row.minimum);

export const table = rows => rows.map(row =>
  `${row.name}: ${row.programs} (minimum ${row.minimum})`).join('\n');
