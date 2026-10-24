import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeType } from './r0-canonical-decode.mjs';
import { load, mentioned } from './r0-generate-support.mjs';
import { elabRows, named } from './r0-elab-corpus-run.mjs';
import { compareRow } from './r0-elab-compare.mjs';
import { plain } from './r0-elab-erase.mjs';

// R0 Task 7.1b, D1 spec §10 over the pinned corpus. T1 (EL1): every
// declaration `decide` judges Solved with a witness Cov accepted
// elaborates. T2 (EL1, AI-IR, Hole): `build`'s checked declaration
// equals the online certificate's `checked`, EFFECT-ERASED (§12.1's
// fallback, Task 7.1 ruling, provisional; test/r0-elab-erase.mjs) with
// holes renumbered after erasure; exact where no variable is in `Amb`,
// else site by site, sites whose recorded type or slots mention an `Amb`
// variable excluded and counted, up to one hole bijection per
// declaration. T8's corpus half: the hole-bearing declarations among
// them. Also on every declaration: no seal fault (Sc), and every image a
// witness binds mentions only rigid and hole variables (Task 7.1a's
// `ImageVariable` carry). Corpus-wide, hence serial.
const Map = await load('Data.Map.Internal');
const { unfoldableArray } = await load('Data.Unfoldable');
const Elaborating = await load('Domain.Elaborating');
const { holes } = await load('Features.Check.Holes');
const rows = await elabRows();
const judged = rows.filter(row => row.judged !== null);
const pairs = map => Map.toUnfoldable(unfoldableArray)(map)
  .map(pair => [pair.value0, pair.value1]);
const fresh = variable => 'fresh' in variable;
const isHole = variable => fresh(variable)
  && variable.fresh.path.steps[0] === 'hole';

test('Sc on the corpus: no declaration has a seal fault', () => {
  const generated = rows.filter(row => row.fault === undefined);
  assert.ok(generated.length > 2500, `${generated.length} declarations`);
  assert.deepEqual(generated.filter(row =>
    Elaborating.untracked(row.elaborating).length > 0).map(row => row.at),
  []);
});

test('T1 (EL1): every judged witness elaborates', t => {
  t.diagnostic(`${judged.length} declarations judged Solved`);
  assert.ok(judged.length > 1900, `${judged.length} judged`);
  assert.deepEqual(judged.filter(row => named(row.compilation)
    !== 'Witnessed').map(row => row.at), []);
  assert.deepEqual(judged.filter(row => named(row.elaborated)
    !== 'Elaborated').map(row => `${row.at}: ${named(row.elaborated)}`), []);
});

test('ImageVariable: every witness image names rigid and hole variables only',
  t => {
    const images = judged.flatMap(row =>
      pairs(row.compilation.value0.bindings)
        .filter(([, binding]) => named(binding) === 'Inline')
        .map(([, binding]) => ({ at: row.at,
          ty: decodeType(binding.value0) })));
    t.diagnostic(`${images.length} Inline images`);
    assert.ok(images.length > 1000, `${images.length} images`);
    assert.deepEqual(images.filter(image => mentioned(image.ty)
      .some(variable => fresh(variable) && !isHole(variable)))
      .map(image => image.at), []);
  });

// T2 at each Solved verdict, on `elaborate`'s IR; and, beyond EL1, at
// every certificate whose witness Cov accepts, a marker's block
// notwithstanding, on `build`'s IR under that witness.
const compared = judged.map(row => compareRow(row, row.elaborated.value0));
const witnessed = rows.filter(row => row.judged === null && row.built
  && named(row.built) === 'Right');
const beyond = witnessed.map(row => compareRow(row, row.built.value0));

const t2 = (t, found) => {
  const exact = found.filter(item => item.exact);
  const ambiguous = found.filter(item => !item.exact);
  const excluded = ambiguous.reduce((sum, item) => sum + item.excluded, 0);
  const sites = ambiguous.reduce((sum, item) => sum + item.sites, 0);
  t.diagnostic(`${found.length} declarations compared: ${exact.length}`
    + ` exactly, ${ambiguous.length} by site: ${sites} sites compared,`
    + ` ${excluded} excluded (Amb)`);
  assert.deepEqual(found.filter(item => !item.same)
    .map(item => item.row.at), []);
  return { exact, ambiguous, sites };
};

test('T2 (effect-erased): build gives the certificate\'s checked IR', t => {
  assert.equal(compared.length, judged.length);
  const { exact, sites } = t2(t, compared);
  assert.ok(exact.length > 1900, `${exact.length} compared exactly`);
  assert.ok(sites > 0, 'no site compared by site');
});

test('T2 (effect-erased) beyond Solved: every witnessed certificate', t => {
  const built = rows.filter(row => row.judged === null && row.built);
  assert.deepEqual(built.filter(row => named(row.built) !== 'Right')
    .map(row => `${row.at}: ${named(row.built.value0)}`), []);
  const { exact } = t2(t, beyond);
  assert.ok(exact.length > 500, `${exact.length} compared exactly`);
});

// T8's corpus half. The projection renumbers holes, so it cannot see
// whether `build` renumbered them itself (§9 step 3); that is checked
// apart: `build`'s body is already as `holes` numbers it.
test('T8 (corpus half): hole-bearing declarations project equal', t => {
  const holed = [...compared, ...beyond].filter(found => found.holes > 0);
  t.diagnostic(`${holed.length} hole-bearing declarations`);
  assert.ok(holed.length > 0, 'no hole-bearing declaration');
  assert.deepEqual(holed.filter(found => !found.same)
    .map(found => found.row.at), []);
  const unnumbered = holed.filter(({ built }) => JSON.stringify(plain(
    holes(built.body), null)) !== JSON.stringify(plain(built.body, null)));
  assert.deepEqual(unnumbered.map(found => found.row.at), []);
});
