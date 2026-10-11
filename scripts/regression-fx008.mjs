// FX008 regression rows, imported by scripts/regression.mjs; their probes
// are in test/regression-fx008.mjs. Each replacement still compiles.
export const fx008Rows = [
  {
    // §3.5 (c): a cycle's weight for a key is how many more labels of it the
    // row has than its target. A presence-only weight sees dup.wxw's extra
    // `Log` as harmless and the settling loop never ends.
    name: 'fx008-cycle-presence', file: 'src/Features/Check/Cycle.purs',
    needle: 'excess own target = own - target',
    replacement: 'excess own target = if own > 0 && target == 0 then 1 else 0',
    probe: 'fx008-cycle-presence', message: /cycle weight: timed out/
  },
  {
    // Task 5 review I1: a fallback computed eagerly is evaluated at every
    // release step, which made the settle order quadratic in the number of
    // deferrals (16,000 defers: 26 s against 2 s).
    name: 'fx008-settle-order-linear',
    file: 'src/Features/Check/FeedOrder.purs',
    needle: 'release graph state = maybe\' finished released'
      + ' (Set.findMin state.ready)',
    replacement: 'release graph state = maybe (Done (stackItems state.order))'
      + ' released (Set.findMin state.ready)',
    probe: 'fx008-settle-order-linear', message: /settle order: timed out/
  },
  {
    // Task 7: without the hook R never sees the clause rows, so a handler
    // head decided before settling (late1) finds no label.
    name: 'fx008-hook', file: 'src/Features/Check/Sync.purs',
    needle: 'sync env state span = tailRecM (round env (Checking span)) state',
    replacement: 'sync env state span = Right state',
    probe: 'fx008-hook', message: /hook: Expected a handler/
  },
  {
    // F1' (rev10): a clause that finds another group on its tail joins it,
    // consuming into that group's remainder phi; one that keeps its own phi
    // leaves two1's handlers unlinked.
    name: 'fx008-phi', file: 'src/Features/Check/Filing.purs',
    needle: 'pure (stay consumed (min entry.group group))',
    replacement: 'pure (stay state entry.group)',
    probe: 'fx008-phi', message: /remainder: Ambiguous/
  },
  {
    // F1' (rev10 N1): unifying the merged handlers' R with R (review rev9
    // F1) leaks a label in front of one clause's tail into the other's R.
    name: 'fx008-phi-equal', file: 'src/Features/Check/Filing.purs',
    needle: 'consumed ← consumeIgnoring env state { origin, stage: old, '
      + 'target: kept }',
    replacement: 'consumed ← consumeIgnoring env state { origin, '
      + 'stage: entry.inference, target: maybe entry.inference '
      + '_.value.inference (Map.findMin (Map.filter '
      + '(eq group <<< _.group) state.restricted.clauses)) }',
    probe: 'fx008-phi-equal', message: /R≡R: rejected/
  },
  {
    // F2: without the cycle test cyc2 grows its clause row forever.
    name: 'fx008-f2', file: 'src/Features/Check/Sync.purs',
    needle: 'cycleTest env mode refiled ids',
    replacement: 'pure unit',
    probe: 'fx008-f2', message: /F2: timed out/
  },
  {
    // Correction T: consuming only labels past the recorded count misses
    // the labels already pushed into another class's R (one3). F2 rejects
    // cyc2 before any consumption, so cyc2 cannot show this defect.
    name: 'fx008-new-labels', file: 'src/Features/Check/Sync.purs',
    needle: 'stage: Row (labelsOf entry) tail',
    replacement: 'stage: Row (Array.drop (maybe 0 (foldl (+) 0 <<< _.counts) '
      + 'entry.signature) (labelsOf entry)) tail',
    probe: 'fx008-new-labels', message: /new labels: rejected/
  },
  {
    // F1' (rev10): T consumes a clause as `labels(c) + phi`. A stage that
    // ends in nothing gets a fresh tail in `consume`, which leaves phi (and
    // so the other handlers of the class) out of it; two3 then loses the
    // handler head it needs.
    name: 'fx008-phi-tail', file: 'src/Features/Check/Sync.purs',
    needle: 'stage: Row (labelsOf entry) tail',
    replacement: 'stage: Row (labelsOf entry) Nothing',
    probe: 'fx008-phi-tail', message: /remainder tail: Expected a handler/
  },
  {
    // Correction T: the signature carries the label counts, so a clause
    // whose row grew is seen to have grown (a new class with its own phi,
    // rev10 N1). Without them argbind's late label meets the old phi and
    // is refused as a shared tail. (A signature that always reads "changed"
    // only repeats an idempotent consumption here; cyc1 still ends.)
    name: 'fx008-signature', file: 'src/Features/Check/Groups.purs',
    needle: 'counts: counted true (headedRow subst found.row)',
    replacement: 'counts: Map.empty',
    probe: 'fx008-signature', message: /signature: rejected/
  },
  {
    // Correction S needs the classes kept up to date in settling (a merge
    // or an extension made by (a) or (d) gets its phi), which the round's
    // sync does. Without it set1's merged handlers are never linked. (With
    // the sync in place, c to R entries ending in Fresh instead of phi do
    // not change set1, so the sync is what this row proves.)
    name: 'fx008-settle-phi', file: 'src/Features/Check/Settle.purs',
    needle: 'keyed ← syncSettling env settled',
    replacement: 'keyed ← pure settled',
    probe: 'fx008-settle-phi', message: /settling φ: Ambiguous/
  },
  {
    // The installation consumes R as it stands; a fresh tail drops the link
    // that meta2 needs.
    name: 'fx008-r-consumed', file: 'src/Features/Check/Install.purs',
    needle: ', stage: rows.inference',
    replacement: ', stage: (case rows.inference of Row ls _ → Row ls (Just '
      + '(Checked.Hole (state.next + 1000000))))',
    probe: 'fx008-r-consumed', message: /R consumed: Ambiguous/
  },
  {
    // The settling exit test counts the labels of the rows themselves; one
    // that counts targets exits before ec2's late Fail(E) arrives.
    name: 'fx008-exit-count', file: 'src/Features/Check/Settle.purs',
    needle: 'Row labels _ = walkedRow subst entry.own',
    replacement: 'Row labels _ = walkedRow subst entry.target',
    probe: 'fx008-exit-count', message: /exit test: accepted/
  },
  {
    // The tail pass binds R and C to a clause's rigid tail; without it tp1
    // is accepted.
    name: 'fx008-tail-pass', file: 'src/Features/Check/TailPass.purs',
    needle: 'tailPass env state = do',
    replacement: 'tailPass env state = Right state\n\n'
      + 'unusedTailPass ∷ ∀ r. CheckEnv r → State → Either Diagnostic State\n'
      + 'unusedTailPass env state = do',
    probe: 'fx008-tail-pass', message: /tail pass: accepted/
  }
];
