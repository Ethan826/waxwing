// Task 4.5: the window's hand-labelled declarations, each with its
// evidence, so no class rests on an unstated judgement. The serial test
// asserts that every one is in the run with today's text as listed
// here, so a label cannot outlive its program.

// D6's false contradictions (plan Task 4.5 Step 2: `route`, c01, b03):
// today refuses a valid program. Evidence (checked in the bounded
// model): research/division-campaign/r0/refusal-audit.md:46-49, "Three
// refusals reject valid programs (checked)": H's rigid atom (p11
// `route`), H's label atom (c01), H on a rigid-plus-unknown merge (b03).
// The copies carry the same declaration and callees (argued: equal text
// up to layout; rt2's fixtures add an unrelated `bad`).
const p11Text = "divide's { ...u, ...v } must be { ...r }, but neither u"
  + ' nor v can hold r';
const c01Text = "divide's { ...u, ...v } must be { x: Int }, but neither u"
  + ' nor v can have field x';
const b03Text = "ext's { ...s, ...t } must be { b: _, ..._ }, so s cannot"
  + ' hold r';
export const falseContradictions = {
  'research/division-campaign/source/examples/p11-route.wxw#route': p11Text,
  'test/fixtures/r0/rt2/d6-p11-route.json#route': p11Text,
  'research/division-campaign/integration/recon.md#1#route': p11Text,
  'research/division-campaign/r0/probes/c01-h-label.wxw#route': c01Text,
  'research/division-campaign/r0/probes/b03-mayhold-share.wxw#use': b03Text,
  'test/fixtures/r0/rt2/b03-mayhold-share.json#use': b03Text
};

// Today's defects in `checkFunction`, recorded, not fixed in the
// tranche (common context: a live-checker defect goes to findings and
// BACKLOG). `today` is today's first diagnostic there (`null`: today
// compiles the declaration, which is the defect).
const fx030 = 'BACKLOG FX030; findings "Effect and coverage audit"';
const fx031 = 'BACKLOG FX031; findings "Erased effect rows"';
const placeholder = 'BACKLOG R005 (Tranche B several-tail placeholders);'
  + ' findings "The online strategy and its read-back", RT8 GREEN';
export const defects = {
  'test/fixtures/r0/audit/must-be-pure.clock-row.json#k': { id: 'FX030',
    findings: fx030,
    today: 'This function must be pure, but it performs Log' },
  'test/fixtures/r0/audit/effect-not-allowed-require.written.json#k': {
    id: 'FX030', findings: fx030,
    today: 'This function performs Log, which its signature does not allow' },
  'test/fixtures/r0/erased/obligation-annotation.refused.json#g': {
    id: 'FX031', findings: fx031,
    today: 'Expected Unit -> Unit, found Unit -> Unit' },
  'test/fixtures/r0/erased/obligation-ground.refused.json#g': {
    id: 'FX031', findings: fx031,
    today: 'Expected Unit -> Unit, found Unit -> Unit' },
  'test/fixtures/r0/audit/fx010-record-payload.pinned.json#k': {
    id: 'FX010', findings: 'BACKLOG FX010; findings "No catch-all at the'
      + ' end of a body"', today: 'Effect row consumption failed' },
  'test/fixtures/r0/rt2/b9-removal-several-tails.json#drop': {
    id: 'R005B placeholder', findings: placeholder,
    today: 'R005B placeholder: rest binders and removal over several'
      + ' tails are typed in Task 7' },
  'test/fixtures/r0/rt2/b9-rest-binder-several-tails.json#drop': {
    id: 'R005B placeholder', findings: placeholder,
    today: 'R005B placeholder: rest binders and removal over several'
      + ' tails are typed in Task 7' },
  'inline:r020#main': { id: 'R020', findings: 'BACKLOG R020; findings'
    + ' "No catch-all at the end of a body"',
  today: 'x is not a field of { ..._ }' },
  'inline:fx032#g': { id: 'FX032', findings: 'BACKLOG FX032; findings'
    + ' "Erased effect rows" (gate probe P6); the author\'s G-erased'
    + ' ruling item 5 makes it a defect', today: null }
};

// R020 and FX032 have no corpus program; their sources, inline as
// R022's probes are (test/r0-r022-probes.mjs), so the corpus manifest
// and the first-diagnostic snapshot stay as they are. R020's is
// test/r0-classify.test.mjs's pinned program; FX032's is findings' gate
// probe P6.
export const defectProbes = [
  { origin: 'inline:r020', source: 'fn pair(a: { ...r }, b: { ...s }):'
    + ' Int where r disjoint s = 0;\nfn main(): Int = {\n  let f = fn(p,'
    + ' q) => { let v = q.x; let u = pair(p, q); p.x };\n  0\n};\n' },
  { origin: 'inline:fx032', source: 'effect State(s) { fn get(): s;'
    + ' fn put(value: s): Unit; };\neffect Op { fn op(): Int with'
    + ' State({ x: Int }); };\nfn g(): Int with Op = Op.op();\n'
    + 'fn main(): Int = 0;\n' }
];
