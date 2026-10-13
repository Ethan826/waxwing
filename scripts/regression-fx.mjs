// FX001 Task 12 regression rows (checker and diagnostics), imported by
// scripts/regression.mjs; their probes are in test/regression-fx.mjs. The
// runtime rows are in scripts/regression-fx-go.mjs. Each replacement still
// compiles. Already covered, not repeated here: `effect-free-ctx` (the
// context emitted for an effect-free program).
import { fxGoRows } from './regression-fx-go.mjs';

const checkRows = [
  {
    // Leijen's side condition `tail(r1) not in dom(θ)`: without it,
    // `Clock + ...r` against `Log + ...r` extends the shared tail forever.
    name: 'fx-side-condition', file: 'src/Features/Check/UnifyRow.purs',
    needle: '    | tailOf pending.left.tail == MetaTail meta → Done',
    replacement: '    | false → Done',
    probe: 'fx-side-condition', message: /side condition: timed out/
  },
  {
    // A closed row stays closed: `with pure` on a parameter is a demand. A
    // left-over label of the argument's row, met by a closed row, is
    // dropped as if the closed row had been opened.
    name: 'fx-closed-opened', file: 'src/Features/Check/RowFinish.purs',
    needle: '    _ → Done\n      ( Left\n          ( RowExtra (resolveLabel',
    replacement: '    Closed → Loop (pending { right = pending.right'
      + ' { entries = Array.drop 1 pending.right.entries } })\n'
      + '    _ → Done\n      ( Left\n          ( RowExtra (resolveLabel',
    probe: 'fx-closed-opened', message: /closed parameter row: accepted/
  },
  {
    // FX001 design §2: a `Fail` in a deferred row is E_EFFECT, both where
    // the `defer` is checked and after settling.
    name: 'fx-defer-fail', file: 'src/Features/Check/Defer.purs',
    needle: 'if failing label then named else Right unit',
    replacement: 'if false then named else Right unit',
    probe: 'fx-defer-fail', message: /defer Fail: accepted/
  },
  {
    // A deferred row ending in a rigid variable may be filled with a `Fail`
    // by a caller: a callback parameter with an ambient row is refused.
    name: 'fx-defer-rigid', file: 'src/Features/Check/Defer.purs',
    needle: 'maybe (Right unit) (rigidTail env state found) tail',
    replacement: 'Right unit',
    probe: 'fx-defer-rigid', message: /defer rigid tail: accepted/
  },
  {
    // The deferred expression has a row of its own. Checked directly
    // against the current row, the `Fail` a closure gets after the `defer`
    // is never seen in the deferred row.
    name: 'fx-defer-unified', file: 'src/Features/Check/Defer.purs',
    needle: 'infer (env { current = row, sites = [] })',
    replacement: 'infer (env { current = env.current, sites = [] })',
    probe: 'fx-defer-unified', message: /defer late Fail: accepted/
  },
  {
    // Layout dependencies (FX001 design §4): a `Handler(L ...)` mentions L.
    // Without that edge the mutual pair A, B is in no component and its
    // growing layouts are accepted.
    name: 'fx-layout-edges', file: 'src/Features/Check/Nested.purs',
    needle: '  THandler (Label (UserEffect (EffectId index)) arguments _) _ → '
      + 'Array.cons\n    (offset + index)\n    (Array.concatMap recur arguments)',
    replacement: '  THandler (Label (UserEffect (EffectId index)) arguments _) _ → '
      + 'Array.concatMap recur arguments',
    probe: 'fx-layout-edges', message: /layout edges: "accepted"/
  },
  {
    // Design §6: the origin of a label is the first expression that
    // consumed it; without it a defer error has no origin note.
    name: 'fx-provenance', file: 'src/Features/Check/Provenance.purs',
    needle: 'remember occurrence origin = Map.insertWith keepFirst'
      + ' occurrence origin',
    replacement: 'remember _ _ origins = origins',
    probe: 'fx-provenance', message: /provenance: notes/
  },
  {
    // FX017: a caller label the callback's row lacks is the callback's
    // fault. Without the classification the call is reported as the caller
    // performing the label, which its own signature allows.
    name: 'fx-callback-row', file: 'src/Features/Check/Callback.purs',
    needle: '    | isNothing origin.via && signatureOnly env →',
    replacement: '    | false →',
    probe: 'fx-callback-row', message: /callback row: /
  },
  {
    // A row of more than `visibleLabels` labels is abbreviated; printed in
    // full, a 50-label conflict exceeds the 2,000-character bound.
    name: 'fx-abbreviation', file: 'src/Format/Diagnostic/Row.purs',
    needle: 'if total <= visibleLabels then map textOf row.labels',
    replacement: 'if true then map textOf row.labels',
    probe: 'fx-abbreviation', message: /abbreviation: bound exceeded/
  }
];

export const fxRows = [...checkRows, ...fxGoRows];
