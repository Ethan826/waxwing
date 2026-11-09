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

// Each operation's permitted modules (dossier §18.163 (2)); `sources` maps
// a path under src/ to its text. The defining module may use them all.
export const home = 'Domain/Checked/Unnumbered.purs';
export const permitted = {
  rawForRenumbering: ['Features/Check/Trace.purs'],
  unnumberedMentionsTypeVariable: ['Features/Specialize/Seeds.purs'],
  mappedUnnumbered: ['Features/Check/Strip.purs'],
  unnumbered: ['Features/Check/Function.purs',
    'Features/Check/Generate/Body.purs']
};
// Every use needs the import, so a module without it cannot use one; the
// word in a comment or a local name of another module is not a use.
const importing = 'import Domain.Checked.Unnumbered';
const code = text => text.split('\n')
  .map(line => line.replace(/--.*$/, '')).join('\n');
const mentions = (text, name) => code(text).includes(importing)
  && new RegExp(`\\b${name}\\b`).test(code(text));
export const strayUses = sources => Object.entries(sources).flatMap(
  ([path, text]) => Object.entries(permitted)
    .filter(([name, allowed]) => path !== home && !allowed.includes(path)
      && mentions(text, name))
    .map(([name]) => `${path}: ${name}`));

// The scan's own must-fail case: a planted second reader is reported.
export const scanWrong = () => {
  const found = strayUses({ 'Features/Check/Other.purs':
    'import Domain.Checked.Unnumbered (rawForRenumbering)\n'
      + 'x = rawForRenumbering row\n' });
  return found.length === 1 ? [] : ['a planted reader goes unreported'];
};
