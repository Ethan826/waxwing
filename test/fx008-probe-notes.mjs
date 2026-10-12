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
