// R0 a-min tranche 1 regression rows, spread into r0Rows
// (scripts/regression-r0.mjs); probes in test/regression-r0-amin.mjs.
// Each restores one defect in a whole, compiling form. The original
// demonstrations are in the plan ledger's task reports
// (.superpowers/sdd/2026-10-25-amin-tranche-1-plan/task-N-report.md,
// local and git-ignored); docs/progress.md lists the rows.
import { consumeRows } from './regression-r0-amin-consume.mjs';
import { coverageRows } from './regression-r0-amin-coverage.mjs';
import { equalRows } from './regression-r0-amin-equal.mjs';
import { miscRows } from './regression-r0-amin-misc.mjs';
import { pinRows } from './regression-r0-amin-pin.mjs';
import { signatureRows } from './regression-r0-amin-signature.mjs';
const generate = 'src/Features/Check/Generate/';
const marked = `${generate}Marked.purs`;
const owned = `${generate}Owned.purs`;
export const r0AminRows = [
  ...signatureRows,
  ...coverageRows,
  ...equalRows,
  ...consumeRows,
  ...miscRows,
  ...pinRows,
  {
    // Tasks 2, 3: a Fail label translated as written (the Console-only
    // guard), so its mark is M or a position, not N.
    name: 'r0-amin-fail-is-n',
    file: marked,
    needle: '  | effect == ConsoleEffect || effect == FailEffect ='
      + ' Right (Written FixedN)\n',
    replacement: '  | effect == ConsoleEffect = Right (Written FixedN)\n',
    probe: 'r0-amin-fail-is-n',
    message: /a Fail label under \w+ is .*, not N/
  },
  {
    // Task 3 fix: Plain in an annotation back to M (not a position).
    name: 'r0-amin-plain-annotation-position',
    file: marked,
    needle: '      Plain, InAnnotation path j →'
      + ' Right (At (Annotation path j 0))\n',
    replacement: '',
    probe: 'r0-amin-plain-annotation-position',
    message: /Plain in an annotation is .*, not a position/
  },
  {
    // Task 2: AtUse names type variables rigid, not as instances.
    name: 'r0-amin-atuse-names-as-instances',
    file: marked,
    needle: '  AtUse path → FreshVar path (Inst variable)\n',
    replacement: '  AtUse _ → RigidVar variable\n',
    probe: 'r0-amin-atuse-names-as-instances',
    message: /AtUse names a variable .*, not an instance/
  },
  {
    // Task 4 (FX033 x1): H' drops the result from its occurs check, so
    // R's tail, occurring in the result, becomes ResultClauses.
    name: 'r0-amin-resultc-occurs-result',
    file: owned,
    needle: '    <> [ PartRow sig.row, PartTy (untailed sig.result) ]\n',
    replacement: '    <> [ PartRow sig.row ]\n',
    probe: 'r0-amin-resultc-occurs-result',
    message: /x1 instance C tail is .*, not R's tail/
  },
  {
    // Task 4: a closed R gets a fresh C tail instead of staying closed.
    name: 'r0-amin-resultc-closed-stays-closed',
    edits: [{ file: owned,
      needle: 'tail: map kept row.tail }\n',
      replacement: 'tail: Just (maybe (EffFresh path ResultClauses) kept'
        + ' row.tail) }\n' },
    { file: owned, needle: 'import Data.Maybe (Maybe(..), isNothing)\n',
      replacement: 'import Data.Maybe (Maybe(..), isNothing, maybe)\n' }],
    probe: 'r0-amin-resultc-closed-stays-closed',
    message: /closed R gave C tail/
  },
  {
    // Task 4: sibling handler types in one annotation share the tail
    // (k constant).
    name: 'r0-amin-sibling-annotation-tails',
    file: owned,
    needle: '(AnnotationClauses place.parameter k)',
    replacement: '(AnnotationClauses place.parameter 0)',
    probe: 'r0-amin-sibling-annotation-tails',
    message: /two sibling handler types share one C tail/
  },
  {
    // Task 4: stages minted at every instance, not only where a node's
    // type names them (a reference then mints them twice, a saturated
    // call mints ones nothing names).
    name: 'r0-amin-minted-once-where-named',
    edits: [{ file: `${generate}Callee.purs`,
      needle: 'recordInstance path sig = effected\n',
      replacement: 'recordInstance path sig = mintedStages path 0 sig *>'
        + ' effected\n' },
    { file: `${generate}Callee.purs`,
      needle: 'import Features.Check.Generate.Node (markersAt, tagged)\n',
      replacement: 'import Features.Check.Generate.Node'
        + ' (markersAt, mintedStages, tagged)\n' }],
    probe: 'r0-amin-minted-once-where-named',
    message: /minted (twice|, unnamed): /
  },
  {
    // Tasks 3, 4: a partial application's rest numbered from stage 0 at
    // the node's path, not the instance's own stages.
    name: 'r0-amin-partial-reuses-stages',
    edits: [{ file: `${generate}Call.purs`,
      needle: '    , marked: instanceArrow node.path (Array.length generated)'
        + ' found.instance\n',
      replacement: '    , marked: stagedArrow node.path\n'
        + '        { supplied: 0\n'
        + '        , parameters:\n          Array.drop supplied'
        + ' found.instance.parameters\n        , last: found.instance.row\n'
        + '        , result: found.instance.result\n        }\n' },
    { file: `${generate}Call.purs`,
      needle: '  , mintedStages\n  )\n',
      replacement: '  , mintedStages\n  , stagedArrow\n  )\n' }],
    probe: 'r0-amin-partial-reuses-stages',
    message: /three\(1\) rest begins at .*, not Stage 1/
  },
  {
    // Task 3: one rule records a wrong marked type (a comparison as
    // Int), so the node does not erase to its recorded type.
    name: 'r0-amin-node-erasure',
    file: `${generate}Operator.purs`,
    needle: '    , marked: MBase BoolBase\n',
    replacement: '    , marked: MBase IntBase\n',
    probe: 'r0-amin-node-erasure',
    message: /node\(s\) erase differently from types/
  },
  {
    // Task 17's proof edit, covering the source-derived boundary scope
    // (test/r0-effects-boundary.serial.test.mjs): a written handler
    // type loses its HandlerMark, so `outside` lacks HandlerType. The
    // probe checks the invariant that source-derived test guards (its
    // famw#use case, which generation-derived scope alone misses).
    name: 'r0-amin-handler-marker',
    file: `${generate}Translate.purs`,
    needle: '  , marks: Array.cons HandlerMark arguments.marks\n',
    replacement: '  , marks: arguments.marks\n',
    probe: 'r0-amin-handler-marker',
    message: /carries no Outside HandlerType/
  },
  {
    // Task 15: the duplicate-write check bypassed, so a second write at
    // one path is folded by `Map.insert` and overwrites the first.
    name: 'r0-amin-duplicate-effect',
    file: 'src/Features/Check/Generate/Assemble.purs',
    needle: 'checked items = maybe (signed items) refused'
      + ' (duplicate items)\n',
    replacement: 'checked items = maybe (signed items) refused Nothing\n',
    probe: 'r0-amin-duplicate-effect',
    message: /a duplicate NodeAt write went undetected/
  },
  {
    // Task 18 (R033): a closed own row stays closed at a use, where the
    // live checker's `openedRow` gives it a fresh tail.
    name: 'r0-amin-opened-row',
    file: `${generate}Opening.purs`,
    needle: '  opened row = row { tail = Just (maybe fresh identity'
      + ' row.tail) }\n',
    replacement: '  opened row = row { tail = maybe (const Nothing fresh)'
      + ' Just row.tail }\n',
    probe: 'r0-amin-opened-row',
    message: /a closed callee row stays .* at a use/
  },
  {
    // Task 18 (R033): every opened handled label takes one position
    // (index 0), where `openHandlers` opens one per parameter and the
    // result.
    name: 'r0-amin-opened-indexed',
    file: `${generate}Opening.purs`,
    needle: 'At (Opened path index)',
    replacement: 'At (Opened path (index * 0))',
    probe: 'r0-amin-opened-indexed',
    message: /three handled labels share Opened positions/
  },
  {
    // Task 18 (R033): an instance's last stage is a fresh variable at a
    // reference, not the instance's opened row.
    name: 'r0-amin-opened-reused-across-stages',
    file: `${generate}Node.purs`,
    needle: '  { supplied, parameters: sig.parameters, last: sig.row, '
      + 'result: sig.result }\n',
    replacement: '  { supplied\n  , parameters: sig.parameters\n'
      + '  , last: sig.row { tail = Just (EffFresh path (Stage supplied)) }'
      + '\n  , result: sig.result\n  }\n',
    probe: 'r0-amin-opened-reused-across-stages',
    message: /last stage is not the instance's row/
  },
  {
    // Task 19 (R032): the declaration's signature is recorded without
    // its parameters, so a handler type written only there has no
    // recorded MHandler.
    name: 'r0-amin-signature-recorded',
    file: `${generate}Declared.purs`,
    needle: '  <$> declaredSignature tables function\n  where\n',
    replacement: '  <$> (blank <$> declaredSignature tables function)\n'
      + '  where\n  blank found = found { parameters = [] }\n',
    probe: 'r0-amin-signature-recorded',
    message: /lacks a recorded MHandler/
  },
  {
    // Task 19 (R032): SignatureAt left out of the duplicate-write keys.
    name: 'r0-amin-signature-duplicate',
    file: 'src/Features/Check/Generate/Assemble.purs',
    needle: '  SignatureAt path _ → Just (Tuple "SignatureAt" path)\n',
    replacement: '',
    probe: 'r0-amin-signature-duplicate',
    message: /a duplicate SignatureAt write went undetected/
  },
  {
    // Task 20 (I2, dossier 18.102): E23 always emits `Outside
    // FailFamily`, so a `fail`-only declaration acquires a blocker and
    // the pinned cohort (test/fixtures/r0/effects-fail-only.json) moves.
    name: 'r0-amin-fail-only-unmarked',
    file: `${generate}Failure.purs`,
    needle: '              <> marker (maybe true (not <<< plain <<< _.ty)'
      + ' written)\n',
    replacement: '              <> marker (maybe true (not <<< plain <<< _.ty)'
      + ' written || true)\n',
    probe: 'r0-amin-fail-only-unmarked',
    message: /a fail-only declaration gained Outside: FailFamily/
  }
];
