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
  // One rigid in both rows is D3'.
  'r005b-self-apart': context => {
    expect(context, 'rigid apart from itself allowed',
      `${g}fn h(p: { ...r }): Int = g(p, p);${main}`,
      `E_TYPE r is in both records and may have fields @p ${required}`);
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
  }
};
