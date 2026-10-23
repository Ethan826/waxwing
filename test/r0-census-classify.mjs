// Task 3.5: one program's census classification (plan Review Focus 1).
// Each declaration whose body checks today gets its blocking
// categories, read from its recorded problem (generation, Task 3.2)
// and the shadow detectors as landed: `outside` kinds (rule 1),
// second spreads (rule 1′), `openRequirements` (§3.2(a), pending
// G-ValidR), the test-only erased-row detector (§3.2(a), G-erased), and
// `g0Guard` (§3.2(b), `BQ` at type variables). Nothing here decides a
// verdict; it reports what each detector says.
import { load } from './r0-generate-support.mjs';
import { erasedSources, inferredRows } from './r0-census-erased.mjs';

const { parse } = await load('Format.Parse');
const { resolve } = await load('Features.Resolve');
const { compile } = await load('Program.Compile');
const { checkProgram } = await load('Features.Check.Outcomes');
const { generationInputs } = await load('Features.Check.Generate.Inputs');
const { generate } = await load('Features.Check.Generate');
const { fields } = await load('Domain.Recorded');
const { openRequirements } = await load('Features.Check.Decide.Open');
const { g0Guard } = await load('Features.Check.Strategy.Guard');
const Strategy = await load('Features.Check.Strategy');
const Entailed = await load('Features.Check.Entailed');
const { atomType } = await load('Features.Check.GroundRule');
const Mentions = await load('Features.Check.Mentions');
const Atom = await load('Domain.Recorded.Atom');
const Problem = await load('Domain.Problem');
const MapModule = await load('Data.Map.Internal');
const { Right } = await load('Data.Either');
const { unfoldableArray } = await load('Data.Unfoldable');
const variablesOf = vars => MapModule.toUnfoldable(unfoldableArray)(vars)
  .map(pair => pair.value0);

// The seven `Outside` kinds, in Domain.Recorded.Atom's order.
export const outsideKinds = ['EffectArgument', 'DataOverRecords',
  'DataApplication', 'HandlerType', 'FailFamily', 'Deferred',
  'LocalGeneralization'];

// Every blocking category, in the census's fixed order: the decided
// blocks (rule 1′, then rule 1's kinds), then §3.2(a)'s pending
// G-ValidR atoms and erased rows, then §3.2(b). The marginal counts
// are taken in this order.
export const categoryOrder = ['SecondSpread', ...outsideKinds,
  'BQPendingValidR', 'ErasedRow', 'BQAtTypeVariable'];
export const sectionOf = category =>
  (category === 'BQAtTypeVariable' ? '§3.2(b)' : '§3.2(a)');

const secondSpread = variable => variable instanceof Atom.FreshVar
  && variable.value1 instanceof Atom.Spread && variable.value1.value0 >= 2;

// The two `BQ` detectors and, when G0's guard declines, why, atom by
// atom (Strategy/Guard.purs): a rigid variable after reduction, or
// outside the one-tail fragment unground. Both detectors read only
// `bq`, so a problem without `BQ` atoms has no open atom and is in G0's
// scope; that case skips their unifier (the census's cost, not a
// reading).
const rigidUnground = ty => !Mentions.isGround(ty)
  && Mentions.mentions(Mentions.isRigid)(ty);
const reasonUnder = reduce => atom => {
  const recorded = atomType(atom);
  const found = reduce(recorded);
  if (found instanceof Entailed.Reduced)
    return rigidUnground(found.value0) ? 'rigid' : null;
  if (found instanceof Entailed.NoUnifier)
    return rigidUnground(recorded) ? 'rigid' : null;
  return Mentions.isGround(recorded) ? null : 'fragment';
};

const requirementsOf = problem => {
  const atoms = fields(problem).bq.map(entry => entry.value);
  if (atoms.length === 0) return { open: 0, declined: false, reasons: [] };
  const open = new Set(openRequirements(problem).map(entry => entry.value));
  const declined = g0Guard(problem) instanceof Strategy.OutOfScope;
  if (!declined) return { open: open.size, declined, reasons: [] };
  const reasons = atoms.filter(atom => !open.has(atom))
    .map(reasonUnder(Entailed.reduction(problem)))
    .filter(found => found !== null);
  if (reasons.length === 0) throw new Error('g0Guard declined unexplained');
  return { open: open.size, declined, reasons: [...new Set(reasons)].sort() };
};

const categoriesOf = (program, decl, problem) => {
  const view = fields(problem);
  const kinds = new Set(view.outside.map(entry =>
    entry.value.constructor.name));
  const sources = erasedSources(program, decl);
  const requirements = requirementsOf(problem);
  const found = new Set([...kinds,
    ...(variablesOf(view.vars).some(secondSpread) ? ['SecondSpread']
      : []),
    ...(requirements.open > 0 ? ['BQPendingValidR'] : []),
    ...(sources.length > 0 ? ['ErasedRow'] : []),
    ...(requirements.declined ? ['BQAtTypeVariable'] : [])]);
  return { name: decl.name,
    categories: categoryOrder.filter(category => found.has(category)),
    sources, inferredRows: inferredRows(program, decl),
    guard: requirements.reasons };
};

const problemOf = (inputs, decl) => {
  const result = generate(inputs.tables)(inputs.signatures)(decl);
  if (!(result instanceof Right))
    throw new Error(`${decl.name}: generation fault`);
  return result.value0;
};

// A program's classification: whether it compiles today, whether
// Resolve refused a second spread, and each declaration with whether
// its body checks today (`compiles`) and its categories. The census
// counts only declarations that compile; the detector checks also read
// refused ones, for categories no compiling declaration has.
export const classifyProgram = source => {
  const accepted = compile(source) instanceof Right;
  const parsed = parse(source);
  if (!(parsed instanceof Right))
    return { accepted, secondSpread: false, declarations: [],
      program: null };
  const named = resolve(parsed.value0);
  if (!(named instanceof Right)) return { accepted, declarations: [],
    program: null,
    secondSpread: named.value0.problem instanceof Problem.SecondSpread };
  const program = named.value0;
  const inputs = generationInputs(program);
  const today = checkProgram(program).outcomes;
  const declarations = program.functions.map((decl, index) => ({
    compiles: today[index].today instanceof Right,
    ...categoriesOf(program, decl, problemOf(inputs, decl)) }));
  return { accepted, secondSpread: false, declarations, program };
};
