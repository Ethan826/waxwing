// Tranche 2 Task 8: the restored-defect probes' checks
// (test/regression-r0-t2-rows.mjs) over the fixtures of
// test/r0-t2-rows-cases.mjs. Fixture-level.
import { rowsCases, sources, spanOf } from './r0-t2-rows-cases.mjs';

// Each check returns the names of the cases that differ, empty when all
// hold.
export const rowsChecks = async load => {
  const cases = await rowsCases(load);
  const { live, read, varsOf, valueOf, rowText, named, Maps, keyOrd } = cases;
  const keyAt = (source, text, skip = 0) => {
    const start = Number(spanOf(source, text).split('-')[0]) + skip;
    const end = skip > 0 ? start + text.length - skip
      : Number(spanOf(source, text).split('-')[1]);
    return cases.Tuple.Tuple.create(start)(end);
  };
  const faultOf = (item, trace) => {
    const found = read(item, trace);
    return named(found) === 'Left' ? named(found.value0) : 'Right';
  };
  // A use key met twice is a Clash, never its first entry.
  const clashWrong = () => {
    const item = live(sources.uses, 'call');
    const key = keyAt(sources.uses, 'run(one)');
    const entry = Maps.lookup(keyOrd)(key)(item.trace.uses).value0;
    const twice = { ...item.trace, uses: Maps.insert(keyOrd)(key)(
      [...entry, ...entry])(item.trace.uses) };
    return faultOf(item, twice) === 'Clash' ? [] : ['clash'];
  };
  // Each applied stage read under its (Apply, argument) key.
  const appliedWrong = () => [['applied', 'f(1, 2)', sources.uses],
    ['logged', 'f(1)', sources.uses], ['overTwo', 'two(', sources.over],
    ['inExtra', 'two(', sources.over]].filter(([name, text, source]) => {
    const item = live(source, name);
    const found = read(item);
    return named(found) !== 'Right' || varsOf(item, 'Stage', text).some(
      stage => valueOf(found.value0, stage) === undefined);
  }).map(([name]) => name);
  // Fail and Console labels read N whatever the terms say.
  const failWrong = () => {
    const everyM = () => new cases.Just(cases.Package.TermM.value);
    const item = live(sources.handlers, 'failing');
    const found = read(item, item.trace, everyM);
    if (named(found) !== 'Right') return ['failing'];
    const [clauses] = varsOf(item, 'HandlerClauses', 'handler');
    return rowText(valueOf(found.value0, clauses))
      === '[Fail(PBase)@N|closed]' ? [] : ['failing'];
  };
  // A located value and a traced one that differ are Apart.
  const apartWrong = () => {
    const item = live(sources.uses, 'applied');
    const key = keyAt(sources.uses, 'let f = add', 'let f = '.length);
    const [use] = Maps.lookup(keyOrd)(key)(item.trace.uses).value0;
    const console = new cases.Row.Label(cases.Row.ConsoleEffect.value, [],
      cases.Row.NoFail.value);
    const planted = { ...use, stages: [new cases.Row.Row([console],
      use.stages[0].value1)] };
    return faultOf(item, { ...item.trace, uses: Maps.insert(keyOrd)(key)(
      [planted])(item.trace.uses) }) === 'Apart' ? [] : ['apart'];
  };
  // `main`'s entry tail on the trace's numbering: the hole the `with`
  // installations' rows end in (services), or its own extension number.
  const entryWrong = () => [['services', sources.services],
    ['lone', sources.lone]].filter(([name, source]) => {
    const item = live(source, 'main');
    const found = read(item);
    if (named(found) !== 'Right') return true;
    const [entry] = varsOf(item, 'EntryTail', null);
    const tail = valueOf(found.value0, entry)?.tail;
    if (tail === undefined || named(tail) !== 'Just') return true;
    const hole = tail.value0.value0;
    const currents = cases.pairs(item.trace.installations).flatMap(
      ([, list]) => list.map(each => each.current.value1.value0.value0));
    return hole < 0 || currents.some(other => other !== hole)
      || (name === 'services' && currents.length === 0);
  }).map(([name]) => name);
  // A variable no source reads is Unread, never an empty row.
  const unreadWrong = () => {
    const item = live(sources.uses, 'call');
    return faultOf(item, { ...item.trace, uses: Maps.empty }) === 'Unread'
      ? [] : ['unread'];
  };
  // A piped stage read under its left operand's key.
  const pipedWrong = () => {
    const item = live(sources.uses, 'piped');
    const found = read(item);
    const [stage] = varsOf(item, 'Stage', '1 |> inc');
    return named(found) === 'Right' && rowText(valueOf(found.value0, stage))
      === '[User@M|rigid:0]' ? [] : ['piped'];
  };
  // Console reads N whatever the terms say; Fail keeps its payload.
  const everyM = () => new cases.Just(cases.Package.TermM.value);
  const consoleWrong = () => {
    const item = live(sources.handlers, 'deferred');
    const found = read(item, item.trace, everyM);
    const [effect] = varsOf(item, 'EffectOf', null);
    return named(found) === 'Right' && rowText(valueOf(found.value0, effect))
      === '[Console@N|hole]' ? [] : ['console'];
  };
  const payloadWrong = () => {
    const item = live(sources.handlers, 'failing');
    const found = read(item);
    const [clauses] = varsOf(item, 'HandlerClauses', 'handler');
    const label = named(found) === 'Right'
      ? valueOf(found.value0, clauses)?.labels[0] : undefined;
    return named(label?.args[0]?.value0 ?? {}) === 'TextBase' ? []
      : ['payload'];
  };
  // A user label with no mark has no term: UnmarkedLabel.
  const unmarkedWrong = async () => {
    const Convert = await load('Features.Check.Strategy.ReadBack.Convert');
    const { Row: Rows } = cases;
    const { Nothing } = await load('Data.Maybe');
    const found = Convert.convertRow(cases.stub)(new Rows.Row([new Rows.Label(
      new Rows.UserEffect(1), [], Rows.Unmarked.value)], Nothing.value));
    return named(found) === 'Left' ? [] : ['unmarked'];
  };
  // R036 (3): a user label with no term is `RowUnconverted`, never
  // `Unread`: one planted with no mark, and one the terms do not read.
  const unconvertedWrong = () => {
    const item = live(sources.uses, 'applied');
    const key = keyAt(sources.uses, 'let f = add', 'let f = '.length);
    const [use] = Maps.lookup(keyOrd)(key)(item.trace.uses).value0;
    const label = new cases.Row.Label(new cases.Row.UserEffect(0), [],
      cases.Row.Unmarked.value);
    const planted = { ...use, stages: [new cases.Row.Row([label],
      use.stages[0].value1)] };
    const unmarked = faultOf(item, { ...item.trace, uses: Maps.insert(
      keyOrd)(key)([planted])(item.trace.uses) });
    const call = live(sources.uses, 'call');
    const found = read(call, call.trace, () => cases.Nothing.value);
    const unreadMark = named(found) === 'Left' ? named(found.value0) : '';
    return [['unmarked', unmarked], ['unread mark', unreadMark]].filter(
      ([, fault]) => fault !== 'RowUnconverted').map(([name]) => name);
  };
  return { clashWrong, appliedWrong, failWrong, apartWrong, entryWrong,
    unreadWrong, pipedWrong, consoleWrong, payloadWrong, unmarkedWrong,
    unconvertedWrong };
};
