// FX001 Task 12 regression probes (checker and diagnostics), imported
// through test/regression-probes.mjs; the rows are in scripts/regression-fx.mjs.
// Each compiles with the compiler under test only. A probe that can hang
// compiles in a child process with its own timeout (plan ruling F17).
import { compileWithin } from './regression-fx008.mjs';
import { goProbes } from './regression-fx-go.mjs';

const timeoutMs = 20_000;
const log = 'effect Log { fn log(x: Int): Unit; }; ';
const clock = 'effect Clock { fn now(): Int; }; ';
const unit = 'type E = E; ';
const main = ' fn main(): Unit = ();';

const fail = message => {
  console.error(message);
  process.exit(1);
};

const detected = context =>
  console.log(`${context.probe} regression detects the defect`);

// The program must be refused with this code and message, within the
// timeout; `label` starts every report.
const refused = (source, code, message, label) => context => {
  const found = compileWithin(context, source, timeoutMs);
  if (found.timedOut) fail(`${label}: timed out`);
  if (found.diagnostic === null) fail(`${label}: accepted`);
  if (found.diagnostic.code !== code || found.diagnostic.message !== message) {
    fail(`${label}: ${JSON.stringify(found.diagnostic)}`);
  }
  detected(context);
};

const effect = 'E_EFFECT';
const deferText = 'defer must not fail, but it ';
const both = 'fn both(f: Int -> Int with Clock + ...r, '
  + 'g: Int -> Int with Log + ...r): Int = 0; ';
const sideCondition = log + clock + both
  + 'fn main(): Int = { let h = fn(x) => x; both(h, h) };';

const pureCallback = 'fn use(f: Int -> Int with pure): Int = f(1); '
  + 'fn main(): Int with Console = use(fn(x) => { print(x); x });';

// P3: the closure's `Fail` arrives after the `defer` was checked.
const lateFail = unit + 'fn work(): Unit with Console = handle { '
  + 'let f = fn(x) => fail(x); let g = fn(y) => { defer f(y); () }; g(E) } '
  + '{ fail(error: E) => print(9) };' + main;

// A and B grow each other's layouts through handler types (design §4); the
// cycle is seen only through the handler-type edges between the effects.
const grow = 'type Box(a) = Box(a); '
  + 'effect A(x) { fn f(): Handler(B(Box(x))); }; '
  + 'effect B(y) { fn g(): Handler(A(y)); }; fn main(): Int = 0;';

const risky = unit + 'fn risky(): Unit with Fail(E) = fail(E); '
  + 'fn work(): Unit with Fail(E) = { defer risky(); () };' + main;

const provenance = context => {
  const result = context.compile(risky);
  const found = result instanceof context.Left
    ? context.wire(result.value0) : null;
  const notes = found === null ? [] : found.related.map(note => note.message);
  const expected = ['Fail(E) comes from this call of risky',
    'Fail(E) is raised here'];
  if (JSON.stringify(notes) !== JSON.stringify(expected)) {
    fail(`provenance: notes ${JSON.stringify(notes)}`);
  }
  detected(context);
};

const layoutEdges = context => {
  const found = compileWithin(context, grow, timeoutMs);
  const text = 'Recursive use of B changes its type arguments';
  if (found.timedOut) fail('layout edges: timed out');
  if (found.diagnostic?.message !== text) {
    fail(`layout edges: ${JSON.stringify(found.diagnostic ?? 'accepted')}`);
  }
  detected(context);
};

// Two written 50-label rows that differ by one label share a tail; the
// message names the rows abbreviated, within the 2,000-character bound.
const labelCount = 50;
const maxCharacters = 2000;
const argument = 'Pair(Int, Bool)';
const written = count => Array.from({ length: count },
  (_, at) => `E${at + 1}(${argument})`);
const wideBoth = 'fn both(f: Int -> Int with '
  + `${written(labelCount - 1).join(' + ')} + ...r, g: Int -> Int with `
  + `${written(labelCount).join(' + ')} + ...r): Int = 0;`;
const wide = 'type Pair(a, b) = Pair(a, b); '
  + Array.from({ length: labelCount }, (_, at) =>
    `effect E${at + 1}(a) { fn op${at + 1}(): a; };`).join(' ')
  + ` ${wideBoth} fn main(): Int = { let h = fn(x) => x; both(h, h) };`;
const wideMessage = `E50(${argument}) + ${written(3).join(' + ')} + … 46 more`
  + ` + ...r and ${written(4).join(' + ')} + … 45 more + ...r `
  + 'cannot be made equal: both end in ...r';

const abbreviation = context => {
  const found = compileWithin(context, wide, timeoutMs);
  if (found.timedOut) fail('abbreviation: timed out');
  const message = found.diagnostic?.message ?? '';
  if (message.length > maxCharacters) {
    fail(`abbreviation: bound exceeded (${message.length} characters)`);
  }
  if (message !== wideMessage) fail(`abbreviation: ${message}`);
  detected(context);
};

// FX017: the callback's written row lacks a label of its caller's.
const callbackRow = 'effect L { fn l(): Int; }; effect M { fn m(): Int; }; '
  + 'fn a(q: Int -> Int with L, x: Int): Int with L + M = q(x);' + main;
const callbackMessage = 'q must allow every effect of a (L + M), but its row '
  + 'is L; write q\'s row as `with L + M`; a callback\'s row must equal its '
  + 'caller\'s (FX017)';

export const fxProbes = {
  'fx-callback-row': refused(callbackRow, effect, callbackMessage,
    'callback row'),
  'fx-side-condition': refused(sideCondition, effect,
    'Log + ...r and Clock + ...r cannot be made equal: both end in ...r',
    'side condition'),
  'fx-closed-opened': refused(pureCallback, effect,
    'This function must be pure, but it performs Console',
    'closed parameter row'),
  'fx-defer-fail': refused(
    unit + 'fn work(): Unit with Fail(E) = { defer fail(E); () };' + main,
    effect, `${deferText}performs Fail(E)`, 'defer Fail'),
  'fx-defer-rigid': refused(unit + 'fn bracket(release: Unit -> Unit): Unit '
    + '= { defer release(()); () };' + main, effect,
  `${deferText}may perform any effect of ...`, 'defer rigid tail'),
  'fx-defer-unified': refused(lateFail, effect,
    `${deferText}performs Fail(E)`, 'defer late Fail'),
  'fx-layout-edges': layoutEdges,
  'fx-provenance': provenance,
  'fx-abbreviation': abbreviation,
  ...goProbes
};
