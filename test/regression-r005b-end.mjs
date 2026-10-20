// R005 Tranche B B4 regression probes (the end of a body: H and
// Unresolved), imported through test/regression-probes.mjs; the rows are
// in scripts/regression-r005b-end.mjs.
import { annotate, done, expect, pickR, pickRHolds, rsWritten, same }
  from './regression-r005b.mjs';

const apply = 'fn apply(f: (a, b) -> { x: Int, y: Int }, g: (a, b) -> Int): '
  + 'Int = 0; ';
const noX = 'fn noX(p: { ...u }, q: { ...v }): Int where u lacks { x }, '
  + 'v lacks { x } = 0; ';
const QUIET_MS = 2000;
const QUIET_USES = 12;
const indices = count => Array.from({ length: count }, (_, i) => i);

export const r005bEndProbes = {
  // `Merge R ?q { a, ...w }`: `a` may go into q, which is apart from R,
  // because R lacks `a` by its clause; it has a solution (q = { a },
  // w = R), so H must not refuse it: Unresolved.
  'r005b-h-exclusion': context => {
    expect(context, 'exclusion without entailment',
      `${pickR}${same}fn g(x: { ...r }): Int where r lacks { a } = `
        + '{ let f = fn(q, w) => same(pickR(x, q), { a: 1, ...w }); 0 }; '
        + 'fn main(): Int = 0;',
      'E_TYPE Cannot tell how pickR\'s r and s split { a: Int, ..._ }; '
        + `${annotate} @pickR(x, q) ${rsWritten}`);
    done(context);
  },
  // H only at the end of a body: diag-14's shape (x has no home) is
  // followed by an ordinary mismatch, which the body reports first.
  'r005b-h-binds': context => {
    expect(context, 'H before the end',
      `${pickR}${apply}${noX}${same}fn main(): Int = `
        + '{ let k = apply(pickR, noX); same(1, true) };',
      'E_TYPE Expected Int, found Bool @true');
    done(context);
  },
  // Twelve quiet predicates (no field, no rigid tail) reach a fixpoint
  // at once and are Unresolved, quickly.
  'r005b-quiet': context => {
    const started = Date.now();
    const uses = indices(QUIET_USES);
    const parameters = uses.map(i => `f${i}: (a${i}, b${i}) -> c`);
    const source = `${pickR}fn h(${parameters.join(', ')}): Int = 0; `
      + `fn main(): Int = h(${uses.map(() => 'pickR').join(', ')});`;
    expect(context, 'quiet predicates kept going', source,
      `E_TYPE ${pickRHolds}pass a lambda with annotated parameters in `
        + `place of pickR @pickR ${rsWritten}`);
    if (Date.now() - started >= QUIET_MS) {
      console.error('quiet predicates slow');
      process.exit(1);
    }
    done(context);
  },
  // A predicate still waiting at the end is never dropped: `split`'s
  // argument splits between r and s in four ways, Unresolved.
  'r005b-predicate-end': context => {
    expect(context, 'waiting predicates dropped',
      'fn split(p: { ...r, ...s }): Int where r disjoint s = 0; '
        + 'fn main(): Int = split({ x: 1, y: 2 });',
      'E_TYPE Cannot tell whether split\'s r or s has field x; no annotation '
        + 'can decide r and s, which belong to this call of split '
        + `@{ x: 1, y: 2 } ${rsWritten}`);
    done(context);
  }
};
