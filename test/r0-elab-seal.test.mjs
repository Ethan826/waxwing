import test from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { elabFrom } from './r0-elab-support.mjs';

// R0 Task 7.1a, D1 spec §3.3-§3.4, §5 layer 2: `untracked` (Sc) finds
// every SealFault from `uses` and the generation logs, before any
// witness exists (T3a), and `seal` assembles the problem, `requests`
// and `positionsOf` from the same run (St, Mint, Pos's derived view).
const output = pathToFileURL(join(dirname(fileURLToPath(import.meta.url)),
  '..', 'output')).href;
const t = await elabFrom(name => import(`${output}/${name}/index.js`));
const { gen, ty, site, sort, faults, sealed } = t;

// The variable a handle stands for (a newtype: its compiled value).
const varOf = handle => handle;

test('a well-formed generation has no seal fault', () => {
  const e = sealed(gen.seq([() => gen.fresh(['a']),
    () => gen.fresh(['b'], sort.row)],
  (a, b) => gen.positioned(site.node([]), ty.record([['x', ty.flex(a)]],
    [ty.flexRef(b)]))));
  assert.deepEqual(faults(e), []);
  assert.deepEqual(t.requested(e).map(v => v.value0.steps[0].value0),
    ['a', 'b']);
  // The node's recorded type joins `types` (T-R0b §5.2); Mint: every
  // requested variable is a flexible variable of the problem.
  const problem = t.m.Elaborating.problem(e);
  assert.equal(t.m.Map.size(problem.types), 1);
  for (const variable of t.requested(e))
    assert.ok(t.m.Map.member(t.m.Atom.ordVar)(variable)(problem.vars));
  assert.deepEqual(problem.flexTy.length + problem.flexRow.length, 2);
});

test('UntrackedRead: a read of a variable the problem does not hold', () => {
  const forged = t.fresh(['nowhere']);
  const e = sealed(gen.pure(t.m.Elab.readType(site.node([]))(forged)));
  assert.deepEqual(faults(e), [['UntrackedRead', forged]]);
});

test('SortClash: a type handle as a record tail; any effect-row tail',
  () => {
    const tail = sealed(gen.seq([() => gen.fresh(['a'])], a =>
      gen.positioned(site.node([]), ty.record([], [ty.flexRef(a)]))));
    assert.deepEqual(faults(tail).map(([name]) => name), ['SortClash']);
    for (const minted of [sort.type, sort.row]) {
      const effect = sealed(gen.seq([() => gen.fresh(['e'], minted)], e =>
        gen.positioned(site.node([]), ty.fun(ty.int, ty.int,
          new t.m.Maybe.Just(ty.flexRef(e))))));
      assert.deepEqual(faults(effect), [['SortClash', t.fresh(['e'])]]);
    }
  });

test('AuxiliarySite: logged, with or without a handle, or read directly',
  () => {
    const plain = sealed(gen.positioned(site.auxiliary, ty.int));
    assert.deepEqual(faults(plain), [['AuxiliarySite', null]]);
    const held = sealed(gen.seq([() => gen.fresh(['a'])], a =>
      gen.positioned(site.auxiliary, ty.flex(a))));
    assert.deepEqual(faults(held).map(([name]) => name),
      ['AuxiliarySite', 'AuxiliarySite']);
    for (const read of [t.m.Elab.readType, t.m.Elab.readRow]) {
      const direct = sealed(gen.seq([() => gen.fresh(['a'],
        read === t.m.Elab.readRow ? sort.row : sort.type)],
      a => gen.pure(read(site.auxiliary)(a))));
      assert.deepEqual(faults(direct), [['AuxiliarySite', null]]);
    }
  });

test('RigidSiteRead: a handle logged at, or read at, a RigidName site',
  () => {
    const logged = sealed(gen.seq([() => gen.fresh(['a'])], a =>
      gen.positioned(site.rigid(0), ty.flex(a))));
    assert.deepEqual(faults(logged), [['RigidSiteRead', t.fresh(['a'])]]);
    const clean = sealed(gen.positioned(site.rigid(0), ty.rigid(0)));
    assert.deepEqual(faults(clean), []);
    for (const read of [t.m.Elab.readType, t.m.Elab.readRow]) {
      const direct = sealed(gen.seq([() => gen.fresh(['a'],
        read === t.m.Elab.readRow ? sort.row : sort.type)],
      a => gen.pure(read(site.rigid(1))(a))));
      assert.deepEqual(faults(direct), [['RigidSiteRead', varOf(
        t.fresh(['a']))]]);
    }
  });

test('DuplicateFresh: two fresh calls for one ⟨p, role⟩', () => {
  const e = sealed(gen.seq([() => gen.fresh(['a']), () => gen.fresh(['a'])],
    a => gen.positioned(site.node([]), ty.flex(a))));
  assert.deepEqual(faults(e), [['DuplicateFresh', t.fresh(['a'])]]);
});

test('DuplicateSite: one site written twice, a node type included', () => {
  const e = sealed(gen.seq([() => gen.positioned(site.node(['n']), ty.int)],
    () => gen.positioned(site.node(['n']), ty.bool)));
  assert.deepEqual(faults(e), [['DuplicateSite', site.node(['n'])]]);
  // A map union would collapse the two writes; the counts keep both.
  const slots = sealed(gen.seq([() => gen.slots(['c'], [[t.use.type,
    ty.int]])], () => gen.slots(['c'], [[t.use.type, ty.bool]])));
  assert.deepEqual(faults(slots), [['DuplicateSite', site.slot(['c'], 0)]]);
});

test('positionsOf: each variable with the sites build reads it at', () => {
  const e = sealed(gen.seq([() => gen.fresh(['a'])], a => gen.bind(
    gen.positioned(site.node(['x']), ty.flex(a)), first => gen.bind(
      gen.slots(['y'], [[t.use.type, ty.flex(a)]]), second =>
        gen.pure(t.elab.apply(t.elab.map(() => () => 0, first), second))))));
  const positions = t.m.Elaborating.positionsOf(e);
  const sites = t.m.Map.lookup(t.m.Atom.ordVar)(t.fresh(['a']))(positions);
  assert.deepEqual(t.arrayOf(sites.value0), [site.slot(['y'], 0),
    site.node(['x'])]);
});

test('a generation fault stops seal with the fault, no Elaborating', () => {
  const Fault = t.m.Gen;
  const stopped = t.m.Elab.seal(t.header(0))(Fault.lifted(
    new t.m.Either.Left('fault')));
  assert.ok(stopped instanceof t.m.Either.Left);
  assert.equal(stopped.value0, 'fault');
});
