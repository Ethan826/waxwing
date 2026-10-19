// R005 Tranche B regression probes, imported through
// test/regression-probes.mjs; the rows are in scripts/regression-r005b.mjs.
// Each uses only the compiler under test, passed in the context.
const fail = message => {
  console.error(message);
  process.exit(1);
};

// The compiler's rejection with the text its span covers and its notes'
// messages, or `accepted`.
const seen = (context, source) => {
  const result = context.compile(source);
  if (!(result instanceof context.Left)) return 'accepted';
  const wired = context.wire(result.value0);
  const covered = span => source.slice(span.start.offset, span.end.offset);
  const notes = wired.related.map(note => ` [${note.message} @${
    covered(note.span)}]`).join('');
  return `${wired.code} ${wired.message} @${covered(wired.span)}${notes}`;
};

const expect = (context, label, source, wanted) => {
  const found = seen(context, source);
  if (found !== wanted) fail(`${label}: ${found}`);
};
const done = context => console.log(
  `${context.probe} regression detects the defect`);

const main = ' fn main(): Int = 0;';
const g = 'fn g(a: { ...r }, b: { ...s }): Int where r disjoint s = 0; ';
const f = 'fn f(p: { name: Int, ...r }): { admin: Bool, name: Int, ...r }\n'
  + '  where r lacks { admin } = { admin: true, ...p };\n';
const tagged = clauses => `${g}fn tagged(p: { id: Int, ...r }, `
  + `q: { ...s }): Int${clauses} = g(p, q);${main}`;
const required = '[required here @r disjoint s]';

export const r005bProbes = {
  // A written clause is cited over an implied fact, for a lack (P1) and
  // for a pair.
  'r005b-precedence': context => {
    expect(context, 'first reason kept',
      `${f}fn main(): Int = { let v = f({ name: 1, admin: false }); 0 };`,
      'E_TYPE admin is not allowed here: r lacks { admin } '
        + '@{ name: 1, admin: false } [required here @admin]');
    expect(context, 'first reason kept',
      'fn g(a: { ...r }, b: { ...s }, w: { ...r, ...s }): Int '
        + 'where r disjoint s = 0; '
        + 'fn main(): Int = { let h = g({ x: 1 }, { x: 2 }); 0 };',
      'E_TYPE Field x is in both records: r disjoint s @{ x: 2 } '
        + `[first written here @{ x: 1 }] ${required}`);
    done(context);
  },
  // A lack decomposed from a wrapper's clause keeps it: D2 at the caller.
  'r005b-provenance': context => {
    expect(context, 'decomposed lack lost its reason',
      `${g}fn w(a: { ...u }, b: { ...v }): Int where u disjoint v = `
        + 'g(a, b); fn main(): Int = w({ x: 1 }, { x: 2 });',
      'E_TYPE Field x is in both records: u disjoint v @{ x: 2 } '
        + '[first written here @{ x: 1 }] [required here @u disjoint v]');
    done(context);
  },
  // A label beside one tail must be lacked by the other (D3'').
  'r005b-mixed-lacks': context => {
    expect(context, 'label against tail skipped',
      tagged(' where r disjoint s'), 'E_TYPE s may already have field id @q '
        + `[s is introduced here @...s] ${required}`);
    done(context);
  },
  // Two rigid tails need the hypothesis (D3).
  'r005b-mixed-tails': context => {
    expect(context, 'tail against tail skipped',
      tagged(' where s lacks { id }'), 'E_TYPE r and s are not known to be '
        + 'disjoint; require r disjoint s in the signature @q '
        + required);
    done(context);
  },
  // One rigid in both rows is D3'. From Task 4 to B2 `g(p, p)` was
  // refused twice over (the second meta's bound lost the rigid it was
  // apart from, U2, and U4 emptied it); the second argument here carries a
  // meta of its own, so the pair's own check is the one guard.
  'r005b-self-apart': context => {
    expect(context, 'rigid apart from itself allowed',
      `${g}fn h(p: { ...r }): Int = g(p, p);${main}`,
      `E_TYPE r is in both records and may have fields @p ${required}`);
    expect(context, 'rigid apart from itself allowed',
      `${g}fn both(x: { ...u }): { ...u, ...v } = both(x); `
        + `fn h(p: { ...r }): Int = g(p, both(p));${main}`,
      'E_TYPE r is in both records and may have fields @both(p) '
        + required);
    done(context);
  },
  // A body type joining two tails the signature does not is D3 (Resolve).
  'r005b-body-type': context => {
    expect(context, 'body type pair ignored',
      'fn f(a: { ...r }, b: { ...s }): Int = '
        + `{ let h = fn(w: { ...r, ...s }) => 0; 0 };${main}`,
      'E_TYPE r and s are not known to be disjoint; require r disjoint s '
        + 'in the signature @...s');
    done(context);
  },
  // A call through a declared-type wrapper whose types join two tails:
  // the implied pair is seeded at the use, so overlapping tails are D2 and
  // two rigid tails not known apart are D3.
  'r005b-wrapper-pairs': context => {
    const wrapper = 'type Holder(...r) = Holder({ x: Int, ...r }); '
      + 'type W(...a, ...b) = W(Holder({ ...a, ...b })); '
      + 'fn k(a: { ...r }, b: { ...s }, w: W(...r, ...s)): Int = 0; ';
    expect(context, 'wrapper pair not seeded',
      `${wrapper}fn c(a: { ...u }, b: { ...v }): Int `
        + 'where u lacks { x }, v lacks { x } = { let h = k(a, b); 0 }; '
        + 'fn main(): Int = 0;',
      'E_TYPE u and v are not known to be disjoint; require u disjoint v '
        + 'in the signature @b [required here @...s]');
    expect(context, 'wrapper pair overlap',
      `${wrapper}fn main(): Int = { let h = k({ y: 1 }, { y: 2 }); 0 };`,
      'E_TYPE Field y is in both records: r disjoint s @{ y: 2 } '
        + '[first written here @{ y: 1 }] [required here @...s]');
    done(context);
  },
  // Common tails cancel: a row equals its tails in another order.
  'r005b-cancel': context => {
    expect(context, 'common tails not cancelled',
      `fn swap(p: { ...r, ...s }): { ...s, ...r } = p;${main}`, 'accepted');
    done(context);
  },
  // A meta apart from itself keeps the pair (N5 removed, B2): a label
  // later bound into it is D2, never `Expected {}, found …`.
  'r005b-self-pair': context => {
    expect(context, 'meta apart from itself emptied',
      `${g}fn main(): Int = { let f = fn(p) => g(p, p); f({ x: 1 }) };`,
      'E_TYPE Field x is in both records: r disjoint s @{ x: 1 } '
        + `[first written here @{ x: 1 }] ${required}`);
    done(context);
  }
};
