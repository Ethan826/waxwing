// R0 Task 7.1a's regression rows (D1 spec §10), spread into r0Rows
// (scripts/regression-r0.mjs); probes in test/regression-r0-elab.mjs.
// Each restores one defect in a whole, compiling form.
const elaborate = 'src/Features/Check/Elaborate.purs';

export const r0ElabRows = [
  {
    // `readRow` stops recording its use, so `run` reads a binding outside
    // `uses` (Tr fails; §5 layer 1).
    name: 'r0-elab-untracked-read',
    file: 'src/Features/Check/Generate/Elab.purs',
    needle: 'readRow = readAs RecordSort\n',
    replacement: 'readRow site handle = forgot (readAs RecordSort site'
      + ' handle)\n  where\n  forgot (Elab elab) = Elab elab'
      + ' { uses = mempty }\n',
    probe: 'r0-elab-untracked-read',
    message: /a binding outside requests changed build/
  },
  {
    // `Free i` elaborated as the representative instead of hole `i` (§9).
    name: 'r0-elab-free-not-hole',
    file: 'src/Features/Check/Generate/Elab/Internal.purs',
    needle: '    Free index → Right (TVar (Hole index))\n',
    replacement: '    Free _ → Right TInt\n',
    probe: 'r0-elab-free-not-hole',
    message: /Free 5 elaborated as TInt/
  },
  {
    // A `build` fault mapped to a non-stopping outcome (§8.2).
    name: 'r0-elab-fault-continues',
    edits: [{ file: elaborate,
      needle: '  either (Broken <<< BrokenInvariant <<< faultText)'
        + ' Elaborated\n',
      replacement: '  either (NotCompiled <<< Uncovered <<< faultVar)'
        + ' Elaborated\n' },
    { file: elaborate, needle: '  , NoWitnessReason\n',
      replacement: '  , NoWitnessReason(..)\n' },
    { file: elaborate, needle: '\nfaultText ∷ ElabFault → String\n',
      replacement: '\nfaultVar ∷ ElabFault → Var\nfaultVar = case _ of\n'
        + '  Fault.Unbound variable → variable\n'
        + '  SortMismatch variable → variable\n'
        + '  NamedUnread variable → variable\n'
        + '  DuplicateLabel variable _ → variable\n'
        + '  ImageVariable variable _ → variable\n'
        + '\nfaultText ∷ ElabFault → String\n' }],
    probe: 'r0-elab-fault-continues',
    message: /an injected Unbound did not stop: NotCompiled/
  },
  {
    // The problem-identity check removed (§6.2, T11).
    name: 'r0-elab-wrong-problem',
    file: elaborate,
    needle: '  | fields (judgedProblem judged) /= fields (problem'
      + ' elaborating) =\n',
    replacement: '  | false =\n',
    probe: 'r0-elab-wrong-problem',
    message: /another declaration's solution elaborated: Elaborated/
  },
  {
    // The nominal roles removed: `coerce` changes a scope (S11, T3c iv).
    name: 'r0-elab-phantom-role',
    edits: [{ file: 'src/Features/Check/Generate/Elab/Internal.purs',
      needle: '\ntype role Handle nominal\n', replacement: '\n' },
    { file: 'src/Features/Check/Generate/Elab/Internal.purs',
      needle: '\ntype role Elab nominal representational\n',
      replacement: '\n' }],
    probe: 'r0-elab-phantom-role',
    message: /coerce compiled: Test.ElabScope.CoerceElab, Test.ElabScope/
  }
];
