// BACKLOG R030: `certify`'s settle-and-witness argument
// (docs/plans/r0-certify-argument.md). C1: the defaults the check judges
// are lowering's (a type hole is `Int`, a hole tail no tail). C2: the
// witness, read with those defaults, is the judged σ. Corpus-wide C2 is
// in test/r0-elab-corpus.serial.test.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './r0-generate-support.mjs';
import { onlineFrom } from './r0-online-support.mjs';
import { certifyFrom } from './r0-certify-support.mjs';
import { forgedFrom, unusedShow } from './r0-forged-witness-support.mjs';

const online = await onlineFrom(load);
const c = await certifyFrom(load);
const { outcomeOf } = await forgedFrom(load);
const { compile } = await load('Program.Compile');
const { Atom, holeVar, settled, text } = c;
const { Tuple } = await load('Data.Tuple');
const Witness = await load('Domain.Verdict.Witness');
const int = Atom.Base.create(Atom.IntBase.value);
const rigid = Atom.RigidVar.create(0);
const hole = index => Atom.TVar.create(holeVar(index));

test('C1: settle gives Int for a type hole and drops a hole tail', () => {
  assert.equal(text(settled(hole(3))), text(int));
  const record = new Atom.Record([new Tuple('x', hole(0))],
    [holeVar(1), rigid]);
  assert.equal(text(settled(record)),
    text(new Atom.Record([new Tuple('x', int)], [rigid])));
  assert.equal(text(settled(new Atom.Arrow(hole(0), hole(1)))),
    text(new Atom.Arrow(int, int)));
});

// Lowering's side: specialize is `specializeWith TInt`, and Lower.purs
// gives a hole tail no tail. The program's two holes, `y`'s type and
// the record's tail, lower to `int32` and a closed struct.
test('C1: lowering defaults a type hole to Int and closes a hole tail',
  () => {
    const go = compile('fn f(): Int = {\n  let g = fn(y) => show(y);\n'
      + '  let h = fn(r) => r.x;\n  0\n};\nfn main(): Int = f();\n');
    assert.equal(go.constructor.name, 'Right');
    assert.match(go.value0, /type waxwingFun0 func\(int32\) string/);
    assert.match(go.value0, /type waxwingRec0 struct \{\nf_x int32\n\}/);
  });

test('C2: the Solved witness, read with the defaults, is the judged σ',
  () => {
    const program = online.programOf(unusedShow);
    const problem = online.problemOf(program, 'f');
    const certificate = online.search(program, problem).value0;
    const found = outcomeOf(unusedShow, 'f');
    assert.equal(found.verdict, 'Solved');
    assert.deepEqual(c.agreementFindings(problem, certificate.unsettled,
      found.compilation.value0), []);
  });

// The check's own control: every binding replaced by `Inline Bool`, so
// the one variable σ₀ binds (to a hole, judged at `Int`) disagrees.
test('C2 fails on a witness that disagrees with the judged σ', () => {
  const program = online.programOf(unusedShow);
  const problem = online.problemOf(program, 'f');
  const certificate = online.search(program, problem).value0;
  const { compilation } = outcomeOf(unusedShow, 'f');
  const { Inline } = Witness;
  const bool = Atom.Base.create(Atom.BoolBase.value);
  const bindings = online.Map.functorMap.map(() => new Inline(bool))(
    compilation.value0.bindings);
  assert.equal(c.agreementFindings(problem, certificate.unsettled, { bindings })
    .length, 1);
});
