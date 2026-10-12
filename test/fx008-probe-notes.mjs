// The notes of the flipped probes that Task 10 adds (plan Task 10), as
// [text of the note's span, message], from the demand back to the source.
// They sit apart from the probe table: notes never change a probe's
// outcome, so the table's hash does not pin them.
const allows = (row, name) => [row,
  `the signature of ${name} allows a failing Log handler; write with nofail Log`];
const handled = (text, label) => [text, `${label} is handled here`];
const fails = (text, operation) => [text,
  `its clause for ${operation} fails with E`];
const cross = [allows('with Log', 'work')];

export const probeNotes = {
  'facts/lexical': [
    handled('with handler Log { log(n) => fail(E) } { defer log(1); print(2) }',
      'Log'),
    fails('log(n) => fail(E)', 'log')],
  'facts/pending': [allows('with Log + Fail(F)', 'work')],
  'facts/cross': cross,
  'rev6/hole': cross,
  'design-review/c1': cross,
  'design-review/q1': [allows('with Log + ...e', 'run')],
  'rev6/l4b': [
    handled('with handler Log { log(n) => fail(E) } { k(()) }', 'Log'),
    fails('log(n) => fail(E)', 'log')],
  'rev7/merge2': [
    handled('with handler Tick { tick() => fail(E) } { b(()) }', 'Tick'),
    fails('tick() => fail(E)', 'tick')]
};

// The full notes, [start, end, message] in order, of unflipped probes whose
// notes the plan never touches: those the branch base (8fe4218) printed.
// Task 7 changed them unnoticed (whole-branch review I1) because only the
// flipped probes' notes were pinned, so these four guard the rest.
export const baseNotes = {
  'rev6/amb2': [
    [191, 197, 'Tick is performed here'],
    [72, 203, 'main may perform only Console']],
  'rev6/around3': [
    [108, 164, 'Log comes from this function value'],
    [137, 149, 'Log is performed here'],
    [108, 164, 'Log is handled here'],
    [90, 105, 'the signature of around does not allow Log']],
  'design-review/p3': [
    [162, 168, 'Fail(E) is raised here'],
    [174, 191, 'Log is handled here'],
    [50, 194, 'main may perform only Console']],
  'rev9/ov1ctl': [
    [232, 238, 'Tick is performed here'],
    [290, 308, 'Log is handled here'],
    [72, 323, 'main may perform only Console']]
};
