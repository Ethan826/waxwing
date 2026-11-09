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
