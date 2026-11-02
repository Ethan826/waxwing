// Tranche 2 Task 10 (design §C.8, Task 6a; dossier §18.155 (6)): the
// type-image read-back's fixtures and helpers, shared by
// test/r0-t2-images.test.mjs and the restored-defect probes
// (test/regression-r0-t2-images.mjs). `imagesCases(load)` takes a module
// loader, so a probe reads the compiler under test only. Fixture-level.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rowsCases, shape } from './r0-t2-rows-cases.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const file = name => readFileSync(join(root, name), 'utf8');
const main = 'fn main(): Unit with Console = Console.print(1);\n';

export const sources = {
  uses: `effect Log { fn log(n: Int): Unit; };
type Job(a, ...effects) = Job(Int -> a with ...effects);
fn id(x: a): a = x;
fn one(u: Unit): Int with Log = { Log.log(1); 1 };
fn held(): Int with Log = { let g = id(one); g(()) };
fn wrap(): Unit = { let h = id(handler Log { log(n) => () }); () };
fn given(h: Handler(Log)): Unit = { let k = id(h); () };
fn job(): Int = { let j = id(Job(fn(n: Int) => n)); 1 };
fn pick(d: { f: Int, g: Bool }): Int = d.f;
${main}`,
  c7: file('docs/plans/2026-10-21-c001-explicit/baseline/'
    + 'c7-pure-stages-construction.wxw'),
  q7: file('docs/plans/2026-10-21-c001-explicit/baseline/'
    + 'q7-pure-construction.wxw'),
  f05: file('research/division-campaign/r0/probes/f05-print-key.wxw'),
  set1: file('test/fx008-probes/rev9/set1.wxw'),
  p2: file('research/composition-assessment/programs/p2.wxw')
};

export const imagesCases = async load => {
  const cases = await rowsCases(load);
  const { live, named, pairs, same, Package } = cases;
  const RB = await load('Features.Check.Strategy.ReadBack');
  const Images = await load('Features.Check.Strategy.ReadBack.Images');
  const Convert = await load('Features.Check.Strategy.ReadBack.Convert');
  const Erase = await load('Features.Check.Strategy.Effects.Package');
  const Walk = await load('Features.Check.Strategy.ReadBack.Walk');
  const Sets = await load('Data.Set');
  const { fields } = await load('Domain.Recorded');
  const Atom = await load('Domain.Recorded.Atom');

  // Task 9's least terms stubbed: a user label's live mark reads
  // `J {least:<mark>}`, so a test sees the injected terms reach the image.
  const { Just } = await load('Data.Maybe');
  const terms = mark => new Just(new Package.TermJ(Sets.singleton(
    `least:${named(mark)}`)));
  const readBackOf = item => {
    const found = RB.readBack(item.problem)(item.checked);
    if (named(found) !== 'Right') throw new Error('read-back refused');
    return found.value0;
  };
  const imagesOf = (item, readBack = readBackOf(item)) =>
    Images.readImages(terms)(item.problem)(item.checked)(readBack);
  const declaration = (source, name) => {
    const item = live(source, name);
    return { item, readBack: readBackOf(item), found: imagesOf(item) };
  };
  const varsOf = item => pairs(fields(item.problem).vars);
  const infoOf = (item, variable) => varsOf(item).find(([key]) =>
    same(key, variable))[1];
  // The node a variable's path names, and its source text.
  const nodeOf = (item, variable) => Walk.nodeAt(new Walk.AtExpr(
    item.checked.body))(variable.value0.steps).value0.value0;
  const textOf = (item, variable) => {
    const span = nodeOf(item, variable).value0.span;
    return item.source.slice(span.start.offset, span.end.offset);
  };
  // The instantiation-slot variable at the call starting with `text`.
  const slotVar = (item, text) => varsOf(item).find(([variable, info]) =>
    named(info.position) === 'Slot' && named(variable) === 'FreshVar'
      && textOf(item, variable).startsWith(text))[0];
  // The live type of that slot, read from the checked body here.
  const liveSlot = (item, variable) => nodeOf(item, variable).value0.node
    .value1[infoOf(item, variable).position.value1];
  const lookup = (map, variable) => pairs(map).find(([key]) =>
    same(key, variable))?.[1];
  const auxiliaries = item => varsOf(item).filter(([, info]) =>
    named(info.position) === 'Auxiliary').map(([variable]) => variable);
  // The variable at the lambda starting with `text`'s parameter type.
  const paramVar = (item, text) => varsOf(item).find(([variable, info]) =>
    named(info.position) === 'ParamType'
      && textOf(item, variable).startsWith(text))[0];
  const liveParam = (item, variable) => nodeOf(item, variable).value0.node
    .value0[infoOf(item, variable).position.value1].ty;
  // `pick`'s auxiliary record-row variable read with a planted value of
  // today's σ, as a θ binding it: the fault's name, or 'Right'.
  const T = cases.Tuple.Tuple;
  const field = ty => new Atom.Record([new T('f', ty)], []);
  // A flexible variable other than the auxiliary: no hole, no rigid.
  const flexible = item => varsOf(item).find(([variable, info]) =>
    named(info.quant) === 'Exists' && named(info.position) !== 'Auxiliary')
    [0];
  const planted = {
    flexibleField: item => field(new Atom.TVar(flexible(item))),
    flexibleTail: item => new Atom.Record([], [flexible(item)]),
    rowData: () => field(new Atom.App(new Atom.DataHead(0),
      [new Atom.Base(Atom.IntBase.value)])),
    handler: () => field(new Atom.App(new Atom.HandlerHead(
      new cases.Row.UserEffect(0)), [])),
    rigid: () => new Atom.TVar(new Atom.RigidVar(0))
  };
  const plantedFault = kind => {
    const { item, readBack } = declaration(sources.uses, 'pick');
    const [variable] = auxiliaries(item);
    const value = kind === null ? lookup(readBack.unsettled, variable)
      : planted[kind](item);
    const found = imagesOf(item, { ...readBack, unsettled: cases.Maps
      .insert(Atom.ordVar)(variable)(value)(readBack.unsettled) });
    return named(found) === 'Left' ? named(found.value0) : 'Right';
  };
  const liveRow = row => Convert.convertRow(terms)(row).value0;
  return { ...cases, Atom, Images, Erase, declaration, imagesOf, readBackOf,
    slotVar, liveSlot, paramVar, liveParam, lookup, infoOf, auxiliaries,
    liveRow, terms, shape, plantedFault };
};

// The restored-defect probes' checks (test/regression-r0-t2-images.mjs):
// each returns the names of the cases that differ, empty when all hold.
export const imagesChecks = async load => {
  const cases = await imagesCases(load);
  const { declaration, named, slotVar, pairs, shape } = cases;
  const faultOf = found => (named(found) === 'Left'
    ? named(found.value0) : 'Right');
  // An auxiliary needing rows is UnreadImage, never converted anyway.
  const auxiliaryWrong = () => ['c7', 'q7'].filter(name =>
    faultOf(declaration(sources[name], 'statsEvidence').found)
      !== 'UnreadImage');
  // An image whose erasure is not today's is ImageApart.
  const guardWrong = () => {
    const { item, readBack } = declaration(sources.uses, 'held');
    const variable = slotVar(item, 'id(');
    const planted = { ...readBack, unsettled: cases.Maps.insert(
      cases.Atom.ordVar)(variable)(new cases.Atom.Base(
      cases.Atom.BoolBase.value))(readBack.unsettled) };
    return faultOf(cases.imagesOf(item, planted)) === 'ImageApart'
      ? [] : ['held'];
  };
  // θ's completion compared with the image up to field order only.
  const orderWrong = () => (faultOf(declaration(sources.p2, 'main').found)
    === 'Right' ? [] : ['p2']);
  // A positioned record-row field reads its live arrow and row.
  const liveWrong = () => {
    const { item, found } = declaration(sources.f05, 'main');
    if (named(found) !== 'Right') return ['f05'];
    const [[variable, row]] = pairs(found.value0.rows);
    const image = row.fields[0].value1;
    const live = cases.liveSlot(item, variable).value0.fields[0].value1;
    return named(image) === 'PArrow' && JSON.stringify(shape(image.value1))
      === JSON.stringify(shape(cases.liveRow(live.value1))) ? [] : ['f05'];
  };
  // Planted auxiliary values no package can hold are UnreadImage.
  const plantedWrong = kinds => () => kinds.filter(kind =>
    cases.plantedFault(kind) !== 'UnreadImage');
  return { auxiliaryWrong, guardWrong, orderWrong, liveWrong,
    namableWrong: plantedWrong(['flexibleField', 'flexibleTail']),
    rowDataWrong: plantedWrong(['rowData']),
    handlerWrong: plantedWrong(['handler']),
    rigidWrong: plantedWrong(['rigid']) };
};
