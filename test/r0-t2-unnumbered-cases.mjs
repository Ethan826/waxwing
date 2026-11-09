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
const reexport = /export \{[^}]*\} from "\.\.\/Domain\.Checked\.Unnumbered\//;
export const strayUses = compiled => Object.entries(compiled)
  .filter(([module]) => module !== home).flatMap(([module, text]) => [
    ...(reexport.test(text) ? [`${module}: re-export`] : []),
    ...Object.entries(permitted)
      .filter(([name, allowed]) => !allowed.includes(module)
        && new RegExp(`${useOf(name)}\\b`).test(text))
      .map(([name]) => `${module}: ${name}`)]);

// Each permitted module still uses its operation: no stale slot.
export const staleSlots = compiled => Object.entries(permitted).flatMap(
  ([name, allowed]) => allowed.filter(module =>
    !(compiled[module] ?? '').includes(useOf(name)))
    .map(module => `${module}: ${name} unused`));

const planted = {
  use: `x = ${useOf('rawForRenumbering')}(row);`,
  mapped: `x = ${useOf('mappedUnnumbered')}(f)(row);`,
  reexported: 'export { rawForRenumbering } from '
    + '"../Domain.Checked.Unnumbered/index.js";'
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
    .map(([form]) => `a harmless ${form} is reported`)];

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
