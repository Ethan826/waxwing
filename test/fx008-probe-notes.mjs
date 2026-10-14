// The notes of the flipped probes that Task 10 adds (plan Task 10), as
// [text of the note's span, message], from the demand back to the source.
// They sit apart from the probe table: notes never change a probe's
// outcome, so the table's hash does not pin them.
const allows = (row, name) => [row,
  `the signature of ${name} allows a failing Log handler; `
  + 'write with nofail Log'];
const handled = (text, label) => [text, `${label} is handled here`];
const fails = (text, operation) => [text,
  `its clause for ${operation} fails with E`];
const cross = [allows('with Log', 'work')];

export const probeNotes = {
  'facts/lexical': [
    handled('with handler Log { log(n) => Fail.fail(E) } '
      + '{ defer Log.log(1);\n  Console.print(2) }', 'Log'),
    fails('log(n) => Fail.fail(E)', 'log')],
  'facts/pending': [allows('with Log + Fail(F)', 'work')],
  'facts/cross': cross,
  'rev6/hole': cross,
  'design-review/c1': cross,
  'design-review/q1': [allows('with Log + ...e', 'run')],
  'rev6/l4b': [
    handled('with handler Log { log(n) => Fail.fail(E) } { k(()) }', 'Log'),
    fails('log(n) => Fail.fail(E)', 'log')],
  'rev7/merge2': [
    handled('with handler Tick { tick() => Fail.fail(E) } { b(()) }', 'Tick'),
    fails('tick() => Fail.fail(E)', 'tick')]
};

// The full notes, [start, end, message] in order, of unflipped probes whose
// notes the plan never touches: those the branch base (8fe4218) printed.
// Task 7 changed them unnoticed (whole-branch review I1) because only the
// flipped probes' notes were pinned, so these four guard the rest.
export const baseNotes = {
  'rev6/amb2': [
    [195, 206, 'Tick is performed here'],
    [72, 212, 'main may perform only Console']],
  // FX018 (2026-10-13): the callback-row text and notes for this call under
  // `with handler Log`, which the pinned old text had called a performance.
  'rev6/around3': [
    [67, 82, 'body\'s row is written here'],
    [108, 168, 'Log is handled here'],
    [90, 105, 'around\'s row is written here']],
  'design-review/p3': [
    [162, 173, 'Fail(E) is raised here'],
    [179, 200, 'Log is handled here'],
    [50, 203, 'main may perform only Console']],
  'rev9/ov1ctl': [
    [232, 243, 'Tick is performed here'],
    [295, 317, 'Log is handled here'],
    [72, 340, 'main may perform only Console']]
};
