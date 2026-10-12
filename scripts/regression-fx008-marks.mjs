// FX008 Task 9 regression rows, imported by scripts/regression.mjs; their
// probes are in test/regression-fx008-marks.mjs. Each replacement still
// compiles; the probe passes on the healthy compiler and fails on it.
export const fx008MarkRows = [
  {
    // Directional consumption (D7): the frame must be at least as strong as
    // the computation assumes. As equalities, p1's local lambda merges the
    // frames of its two handlers and the failing one makes both M.
    name: 'fx008-directional', file: 'src/Features/Check/UnifyMark.purs',
    needle: '  Directional direction → Right\n    ( recorded subst\n'
      + '        { lower: targetMark\n        , upper: stageMark\n'
      + '        , label: stage\n        , reason: Assumed direction.span\n'
      + '        }\n    )',
    replacement: '  Directional _ → maybe\' clash Right\n'
      + '    (equateMarks subst stageMark targetMark)',
    probe: 'fx008-directional', message: /directional: rejected/
  },
  {
    // Copies (review I1): a stage tail bound to the rest of the target gets
    // fresh copies of its labels. Sharing them merges unrelated contexts.
    name: 'fx008-copies', file: 'src/Features/Check/UnifyMark.purs',
    needle: '    | otherwise → maybe unchanged (above direction) (freshened subst label)',
    replacement: '    | otherwise → unchanged',
    probe: 'fx008-copies', message: /copies: rejected/
  },
  {
    // C is never unified with the row it is installed in (rev7 I3): it
    // pairs by key and relates marks directionally.
    name: 'fx008-c-unified', file: 'src/Features/Check/Lend.purs',
    needle: '    ( pairMarks (Directional { span, throwaway: Nothing }) reached',
    replacement: '    ( pairMarks EqualMarks reached',
    probe: 'fx008-c-unified', message: /C unified: rejected/
  },
  {
    // R ≡ ρ at `with` ignores marks (rev7 I2): equal marks would share one
    // handler value's marks between its installations.
    name: 'fx008-r-marks', file: 'src/Features/Check/Consume.purs',
    needle: '  []\n  IgnoreMarks\n  spec.stage',
    replacement: '  []\n  EqualMarks\n  spec.stage',
    probe: 'fx008-r-marks', message: /R marks: rejected/
  },
  {
    // A label that extends the target's tail gets its own fresh mark below
    // the stage's (rev6 I2), never the stage label itself.
    name: 'fx008-extension', file: 'src/Features/Check/UnifyMark.purs',
    needle: '  Directional direction → maybe unchanged (below direction)\n'
      + '    (freshened subst label)',
    replacement: '  Directional direction → unchanged',
    probe: 'fx008-extension', message: /extension: rejected/
  },
  {
    // A local annotation's unwritten marks are metas (rev6 I4); `Plain`
    // would fix them to M before their uses constrain them.
    name: 'fx008-local-plain', file: 'src/Features/Check/MarkUse.purs',
    needle: 'freshMark mark = case mark of\n  Plain → MarkMeta <$> next\n'
      + '  _ → pure mark',
    replacement: 'freshMark mark = pure mark',
    probe: 'fx008-local-plain', message: /local marks: rejected/
  },
  {
    // The R ≡ R and R ≡ ρ extension gives a new label a fresh mark meta with
    // no edge (rev7 I2); keeping the mark shares it between handlers.
    name: 'fx008-r-identity', file: 'src/Features/Check/UnifyMark.purs',
    needle: '  IgnoreMarks → maybe unchanged identity (freshened subst label)\n'
      + '  Directional direction → maybe unchanged (below direction)',
    replacement: '  IgnoreMarks → unchanged\n'
      + '  Directional direction → maybe unchanged (below direction)',
    probe: 'fx008-r-identity', message: /R identity: rejected/
  },
  {
    // A local handler annotation gets a clause row C of its own (rev7 I3);
    // an alias makes the unification with the context reach C.
    name: 'fx008-c-alias', file: 'src/Features/Check/MarkUse.purs',
    needle: '  if outside then withClauses <$> inference <*> inference <*> (Hole <$> next)',
    replacement: '  if outside then onlyInference <$> inference',
    probe: 'fx008-c-alias', message: /C alias: rejected/
  },
  {
    // The body's frame mark is the installation's own, not the handler's
    // m: one handler value installed under two rows would share it (rev6 I1).
    name: 'fx008-frame-m', file: 'src/Features/Check/Install.purs',
    needle: '  let Tuple frame framed = frameOf label reached',
    replacement: '  let Tuple frame framed = Tuple own reached',
    probe: 'fx008-frame-m', message: /frame: rejected/
  },
  {
    // `own ⊑ frame`: a handler that may abort gives its body an M frame.
    // Without it facts/lexical is accepted and its cleanup dies unhandled.
    name: 'fx008-own-frame', file: 'src/Features/Check/Frames.purs',
    needle: 'Array.cons ownEdge (outerEdges <> rigidEdges)',
    replacement: 'outerEdges <> rigidEdges',
    probe: 'fx008-own-frame', message: /own frame: accepted/
  },
  {
    // The clauses reach the outer frames: a forwarding clause into a
    // failing outer handler makes the inner frame M.
    name: 'fx008-outer-frame', file: 'src/Features/Check/Frames.purs',
    needle: 'Array.cons ownEdge (outerEdges <> rigidEdges)',
    replacement: 'Array.cons ownEdge rigidEdges',
    probe: 'fx008-outer-frame', message: /outer frame: accepted/
  },
  {
    // A rigid `nofail(k)` is a source atom: it may not flow into N.
    name: 'fx008-rigid-n', file: 'src/Features/Check/Mark.purs',
    needle: 'atoms = Array.cons Plain (map MarkVariable variables)',
    replacement: 'atoms = [ Plain ]',
    probe: 'fx008-rigid-n', message: /rigid: accepted/
  },
  {
    // Task 9 review C1: a top-level result handler type gets its own C at
    // the function's use. Closing its tail (as a copy taken at install did)
    // misses clause effects that reach R later: a1's cleanup would abort.
    name: 'fx008-result-clauses', file: 'src/Features/Check/ResultClauses.purs',
    needle: '    Hole meta | not (occurs meta) → Nothing',
    replacement: '    Hole _ → Nothing',
    probe: 'fx008-result-clauses', message: /result clauses: accepted/
  },
  {
    // The tail may also occur in the function's own row (review C1).
    name: 'fx008-result-own-row', file: 'src/Features/Check/ResultClauses.purs',
    needle: 'occurs meta = foldHoles (found meta) false (TFun TUnit row TUnit)\n'
      + '    || Array.any',
    replacement: 'occurs meta = Array.any',
    probe: 'fx008-result-own-row', message: /result own row: accepted/
  }
];
