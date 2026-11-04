import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './r0-generate-support.mjs';
import { packageCases } from './r0-t2-package-cases.mjs';

// R036 (1), T5 (dossier §18.161 (3);
// docs/plans/2026-11-04-readback-termination-audit.md): the read-back's
// non-tail recursion (Convert, EffectMatch, Images, Traverse and others)
// is as deep as a type's nesting, and its spine loops take arrows
// without recursion. Bound's depth is not exercised here: `boundTy`
// returns at once when θ binds no hole, and neither program binds one.
// A 1,000-deep data nesting (the shape of
// test/poly-depth-timing.serial.test.mjs: `deep` adds 27 levels per call,
// 37 calls) and a 1,000-stage spine, each through `recheck`, the type
// read-back and `readEffects`, end with a package or a stated fault, never
// a RangeError. Serial: it checks deep programs. No time bound.
const cases = await packageCases(load);
const nested = /^(PData|PArrow|TData|TFun)$/;
// The deepest chain of data or arrow nodes in a value, by a stack.
const depthOf = value => {
  let deepest = 0;
  const stack = [[value, 0]];
  while (stack.length > 0) {
    const [at, depth] = stack.pop();
    if (at === null || typeof at !== 'object') continue;
    const here = depth + (nested.test(at.constructor?.name) ? 1 : 0);
    deepest = Math.max(deepest, here);
    for (const part of Object.values(at)) stack.push([part, here]);
  }
  return deepest;
};
// The package's fault (or 'Right'), and how deep its types and the
// finished trace go, so the test shows the depth was reached.
const outcome = (source, name) => {
  const item = cases.live(source, name);
  const found = cases.effectsOf(item);
  return { fault: cases.faultOf(found), trace: depthOf(item.trace.value0),
    types: found.value0?.types === undefined ? 0
      : depthOf(found.value0.types) };
};

test('a 1,000-deep data nesting reads back without a stack overflow', () => {
  const width = 27;
  const count = 37;
  const source = 'type L(a) = N | C(a, L(a)); fn sink(x: a): Int = 0; '
    + `fn deep(x: a): ${'L('.repeat(width)}a${')'.repeat(width)} = deep(x);`
    + ` fn main(): Int = sink(${'deep('.repeat(count)}1${')'.repeat(count)});`
    + '\nfn top(): Unit with Console = Console.print(1);\n';
  const found = outcome(source, 'main');
  assert.equal(found.fault, 'Right');
  assert.ok(found.types >= 999 && found.trace >= 999, JSON.stringify(found));
});

test('a 1,000-stage spine reads back without a stack overflow', () => {
  const parameters = Array.from({ length: 1000 }, (_, i) => `p${i}: Int`);
  // `id`'s slot holds `wide`'s type: the trace, Convert and Images take
  // its 1,000 arrows.
  const source = `fn wide(${parameters.join(', ')}): Int = 0;\n`
    + 'fn id(x: a): a = x;\nfn main(): Int = { let g = id(wide); 1 };\n';
  const found = outcome(source, 'main');
  assert.equal(found.fault, 'Right');
  assert.ok(found.types >= 1000 && found.trace >= 1000,
    JSON.stringify(found));
});
