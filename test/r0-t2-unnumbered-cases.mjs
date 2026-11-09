// The declaration's unnumbered row (dossier §18.163 (2)): `finish` brings
// it onto the trace's numbering. Shared with the regression probe.
export const unnumberedCases = async load => {
  const Trace = await load('Features.Check.Trace');
  const Row = await load('Domain.Row');
  const Checked = await load('Domain.Checked.Internal');
  const Maps = await load('Data.Map.Internal');
  const { ordInt } = await load('Data.Ord');
  const { Just } = await load('Data.Maybe');
  const numbering = [[3, 0], [0, 1]].reduce((map, [meta, number]) =>
    Maps.insert(ordInt)(meta)(number)(map), Maps.empty);
  const tailOf = raw => {
    const row = new Row.Row([], new Just(new Checked.Hole(raw)));
    const done = Trace.finish({ ty: ty => ty, row: found => found })(numbering)(
      row)(Trace.emptyTrace);
    return done.value0.row.value1.value0.value0;
  };
  return [
    // Raw 0 is not the body's hole 0: it takes meta 0's own number.
    ['collision: raw 0 reads hole 1', tailOf(0), 1],
    // A meta the body also holds: the same number as in the body.
    ['sharing: raw 3 reads hole 0', tailOf(3), 0],
    // Outside the body's numbering: a number no body hole has.
    ['extension: raw 9 reads a fresh number', tailOf(9), 2]
  ];
};

export const wrongUnnumberedCases = async load =>
  (await unnumberedCases(load))
    .filter(([, found, expected]) => found !== expected)
    .map(([name, found]) => `${name}: ${found}`);

// Each operation's permitted modules (dossier §18.163 (2)), read from the
// compiled output, where every use is `Domain_Checked_Unnumbered.<name>`
// and a re-export is an `export … from` of the module: source text would
// miss a re-export (§18.165's review). `compiled` maps a module name to
// its JavaScript.
export const home = 'Domain.Checked.Unnumbered';
export const permitted = {
  rawForRenumbering: ['Features.Check.Trace'],
  unnumberedMentionsTypeVariable: ['Features.Specialize.Seeds'],
  mappedUnnumbered: ['Features.Check.Strip'],
  unnumbered: ['Features.Check.Function', 'Features.Check.Generate.Body']
};
const useOf = name => `Domain_Checked_Unnumbered.${name}`;
const uses = (text, name) => new RegExp(`${useOf(name)}\\b`).test(text);
const reexport = new RegExp('export\\s*(\\{[^}]*\\}|\\*(\\s+as\\s+\\w+)?)'
  + '\\s*from\\s*"\\.\\./Domain\\.Checked\\.Unnumbered/');
export const strayUses = compiled => Object.entries(compiled)
  .filter(([module]) => module !== home).flatMap(([module, text]) => [
    ...(reexport.test(text) ? [`${module}: re-export`] : []),
    ...Object.entries(permitted)
      .filter(([name, allowed]) => !allowed.includes(module)
        && uses(text, name))
      .map(([name]) => `${module}: ${name}`)]);

// Each permitted module still uses its operation: no stale slot.
export const staleSlots = compiled => Object.entries(permitted).flatMap(
  ([name, allowed]) => allowed.filter(module =>
    !uses(compiled[module] ?? '', name))
    .map(module => `${module}: ${name} unused`));

const planted = {
  use: `x = ${useOf('rawForRenumbering')}(row);`,
  mapped: `x = ${useOf('mappedUnnumbered')}(f)(row);`,
  reexported: 'export { rawForRenumbering } from '
    + '"../Domain.Checked.Unnumbered/index.js";',
  reexportedBlock: 'export {\n    rawForRenumbering\n} from '
    + '"../Domain.Checked.Unnumbered/index.js";',
  reexportedAll: 'export * from "../Domain.Checked.Unnumbered/index.js";'
};
const harmless = {
  comment: '// the rawForRenumbering conversion',
  localName: 'var unnumbered = function (meta) { return meta; };'
};

// The scan's own cases: every planted form reported, nothing else.
export const scanWrong = () => [
  ...Object.entries(planted).filter(([, text]) =>
    strayUses({ 'Features.Check.Other': text }).length !== 1)
    .map(([form]) => `a planted ${form} goes unreported`),
  ...Object.entries(harmless).filter(([, text]) =>
    strayUses({ 'Features.Check.Other': text }).length !== 0)
    .map(([form]) => `a harmless ${form} is reported`),
  ...(staleSlots({ 'Features.Check.Function':
    useOf('unnumberedMentionsTypeVariable') }).some(line =>
    line === 'Features.Check.Function: unnumbered unused') ? []
    : ['a stale slot goes unreported'])];

// The raw row's one use lies inside `finish`: a second call in the trace,
// exported or not, fails.
const conversion = useOf('rawForRenumbering');
export const notOnlyFinish = compiled => {
  const trace = compiled['Features.Check.Trace'] ?? '';
  const start = trace.indexOf('var finish = function');
  const rest = trace.slice(start + 1);
  const end = rest.search(/\n(var |export )/);
  const body = start < 0 ? '' : rest.slice(0, end);
  const count = text => text.split(conversion).length - 1;
  return count(trace) === 1 && count(body) === 1 ? []
    : [`the raw row has more than finish: ${count(trace)} uses`];
};

// The trace's whole public surface, so no alias of the conversion leaves it.
export const traceExports = ['AppliedKey', 'ClauseKey', 'DeferKey',
  'InstallKey', 'PipedKey', 'RowSlot', 'TypeSlot', 'Unnumbered', 'UseKey',
  'emptyTrace', 'emptyTraced', 'extended', 'finish', 'recordApplied',
  'recordClause', 'recordDeferral', 'recordInstallation', 'recordPiped',
  'recordUse', 'renumbered', 'traverseTraced'];

// The opaque module's exports, and that the trace re-exposes nothing.
export const exportsWrong = async load => {
  const shown = async name => Object.keys(await load(name)).sort();
  const expected = Object.keys(permitted).sort();
  const own = await shown(home);
  const trace = await shown('Features.Check.Trace');
  return [...(String(own) === String(expected) ? []
    : [`exports: ${own}`]),
  ...trace.filter(name => !traceExports.includes(name))
    .map(name => `trace exposes: ${name}`)];
};
