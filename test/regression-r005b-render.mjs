// R005 Tranche B B5 regression probes (D4 and D6, their metadata),
// imported through test/regression-probes.mjs; the rows are in
// scripts/regression-r005b-render.mjs.
import { done, expect, pickR } from './regression-r005b.mjs';

const written = '[r and s are written here @{ ...r, ...s }]';
const xy = '[{ x: Int, y: Int } is required here @{ x: Int, y: Int }]';
const apply0 = 'fn apply0(f: (a, b) -> { x: Int, y: Int }): Int = 0; ';
const noX = 'fn apply(f: (a, b) -> { x: Int, y: Int }, g: (a, b) -> Int): '
  + 'Int = 0; fn noX(p: { ...u }, q: { ...v }): Int where u lacks { x }, '
  + 'v lacks { x } = 0; ';

export const r005bRenderProbes = {
  // T6 (plan §10 decision 21): a predicate made from a supplied
  // parameter's row is located at that argument.
  'r005b-site-argument': context => {
    expect(context, 'argument site lost',
      'fn split(p: { ...r, ...s }): Int = 0; '
        + 'fn main(): Int = split({ x: 1, y: 2 });',
      'E_TYPE Cannot tell whether split\'s r or s has field x; no annotation '
        + 'can decide r and s, which belong to this call of split '
        + `@{ x: 1, y: 2 } ${written}`);
    done(context);
  },
  // Decision 20: a direct call's own rows take no annotation (kind 2);
  // a part that is a lambda parameter's row asks for one (kind 1).
  'r005b-hint-own-call': context => {
    expect(context, 'own call offered an annotation',
      'fn granted2(p: { ...r, ...s }): Bool where s lacks { admin } = '
        + 'true; fn main(): Int = { let b = granted2({ admin: false }); 0 };',
      'E_TYPE Cannot tell how granted2\'s r and s split { admin: Bool }; '
        + 'no annotation can decide r and s, which belong to this call of '
        + `granted2 @{ admin: false } ${written}`);
    done(context);
  },
  'r005b-hint-lambda': context => {
    expect(context, 'lambda part not recognised',
      `${pickR}fn mk(): { ...u } = mk(); `
        + 'fn apply1(f: (a) -> { x: Int, y: Int }): Int = 0; '
        + 'fn main(): Int = apply1(fn(p) => pickR(p, mk()));',
      'E_TYPE Cannot tell whether pickR\'s r or s has field x; annotate '
        + `this lambda's parameters @pickR(p, mk()) ${written} ${xy}`);
    done(context);
  },
  // R11: at one location the outer row (empty path) is reported, though
  // the nested one's predicate was made first.
  'r005b-tie-break': context => {
    expect(context, 'made first reported',
      'fn two(p: { m: { ...a, ...b }, ...r, ...s }): Int '
        + 'where a disjoint b, r disjoint s = 0; '
        + 'fn apply0(g: ({ m: { x: Int, y: Int }, w: Int, z: Int }) -> Int): '
        + 'Int = 0; fn main(): Int = apply0(two);',
      'E_TYPE Cannot tell whether two\'s r or s has field w; pass a lambda '
        + 'with annotated parameters in place of two @two [r and s are '
        + 'written here @{ m: { ...a, ...b }, ...r, ...s }] '
        + '[{ m: { x: Int, y: Int }, w: Int, z: Int } is required here '
        + '@{ m: { x: Int, y: Int }, w: Int, z: Int }]');
    done(context);
  },
  // R8's third note, from the callee's written parameter type and from
  // the enclosing function's own parameter.
  'r005b-required-callee': context => {
    expect(context, 'callee side not recorded',
      `${pickR}${apply0}fn main(): Int = apply0(pickR);`,
      'E_TYPE Cannot tell whether pickR\'s r or s has field x; pass a '
        + 'lambda with annotated parameters in place of pickR @pickR '
        + `${written} ${xy}`);
    done(context);
  },
  'r005b-required-own': context => {
    expect(context, 'own parameter not recorded',
      `${pickR}fn use(f: (a, b) -> { ...r }, p: { ...r }): Int = 0; `
        + 'fn outer(p: { ...t }): Int = use(pickR, p); '
        + 'fn main(): Int = outer({ x: 1 });',
      'E_TYPE Cannot tell whether pickR\'s r or s holds t; pass a lambda '
        + `with annotated parameters in place of pickR @pickR ${written} `
        + '[{ ...t } is required here @{ ...t }]');
    done(context);
  },
  // T4: H's refusal at the use whose seeding stated the excluding facts.
  'r005b-h-location': context => {
    expect(context, 'H at the predicate',
      `${pickR}${noX}fn main(): Int = apply(pickR, noX);`,
      'E_TYPE pickR\'s { ...r, ...s } must be { x: Int, y: Int }, but '
        + 'neither r nor s can have field x @noX [required here @pickR] '
        + '[excluded here @x] [excluded here @x]');
    done(context);
  },
  // D6 reads the substitution the predicate failed in, which holds the
  // binding the caller's state lacks.
  'r005b-within': context => {
    expect(context, 'failing state lost',
      `${pickR}fn apply1(f: (a, b) -> { x: Int, y: Int }, p: a): Int = 0; `
        + 'fn main(): Int = apply1(pickR, { z: 1 });',
      'E_TYPE pickR\'s { ...r, ...s } must be { x: Int, y: Int }, so r '
        + 'cannot have field z @{ z: 1 } [required here @pickR]');
    done(context);
  },
  // R10.1 extended to case 2: a label arriving in a part the case closed
  // is D6, not `Expected {}, found …`.
  'r005b-case-bound': context => {
    expect(context, 'case-bound part not at fault',
      'fn inner(w: { a: { ...p, ...q } }, x: { ...p }, y: { ...q }): Int '
        + 'where p disjoint q = 0; '
        + 'fn main(): Int = inner({ a: { x: 1 } }, { x: 1 }, { y: 2 });',
      'E_TYPE inner\'s { ...p, ...q } (in field a) must be { x: Int }, so q '
        + 'cannot have field y @{ y: 2 } [required here @{ a: { x: 1 } }]');
    done(context);
  },
  // R6: a nested row's field path.
  'r005b-nested-path': context => {
    expect(context, 'nested path lost',
      'fn wrapR(p: { ...r }, q: { ...s }): { inner: { ...r, ...s } } '
        + 'where r disjoint s = wrapR(p, q); fn apply0(f: (a, b) -> '
        + '{ inner: { x: Int, y: Int } }): Int = 0; '
        + 'fn main(): Int = apply0(wrapR);',
      'E_TYPE Cannot tell whether wrapR\'s r or s (in field inner) has '
        + 'field x; pass a lambda with annotated parameters in place of '
        + `wrapR @wrapR ${written} ${xy}`);
    done(context);
  },
  // D6 blames `b`, whose `Bool` conflicts, not `a`, whose type is unknown.
  'r005b-clash-established': context => {
    expect(context, 'unknown field blamed',
      `${pickR}fn need(f: (a, b) -> { a: Int, b: Int }, p: a): Int = 0; `
        + 'fn main(): Int = { let f = fn(w) => '
        + 'need(pickR, { a: w, b: true }); 0 };',
      'E_TYPE pickR\'s { ...r, ...s } must be { a: Int, b: Int }, so r '
        + 'cannot have field b @{ a: w, b: true } [required here @pickR]');
    done(context);
  },
  // Decision 23: pickR's part r and g's rigid tail r, each qualified.
  'r005b-names-collide': context => {
    expect(context, 'colliding names unqualified',
      `${pickR}fn g(h: ({ ...r }) -> Int): Int = `
        + '{ let f = fn(p, q) => h(pickR(p, q)); 0 }; fn main(): Int = 0;',
      'E_TYPE Cannot tell whether pickR\'s r or s holds g\'s r; annotate '
        + `this lambda's parameters @pickR(p, q) ${written}`);
    done(context);
  }
};
