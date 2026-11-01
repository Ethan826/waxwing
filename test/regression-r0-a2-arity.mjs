// A2 arity regression probes (dossier §18.148 (1)), dispatched through
// test/regression-r0-a2.mjs; the rows are in
// scripts/regression-r0-a2-arity.mjs. Each loads modules from the compiler
// under test only, through `context.compilerPath`, builds the fixtures of
// test/r0-a2-arity-cases.mjs and fails naming every case that differs
// from its expected outcome.
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { arityCases, sources } from './r0-a2-arity-cases.mjs';
import { fail, passed } from './regression-r0-amin-support.mjs';

const loader = context => name => import(pathToFileURL(
  resolve(dirname(context.compilerPath), '..', name, 'index.js')));

const reported = (context, wrong) => {
  if (wrong.length > 0) fail(`${context.probe}: ${JSON.stringify(wrong)}`);
  passed(context);
};

// I3's check (k) on package images.
const images = async context => {
  const cases = await arityCases(loader(context));
  reported(context, cases.imageRows.map(item => [item[0],
    cases.imageFound(item), item[3]])
    .filter(([, found, expected]) => found !== expected)
    .map(([name, found]) => [name, found]));
};

// Record check 5.
const records = async context => {
  const cases = await arityCases(loader(context));
  reported(context, cases.recordRows.map(([name, , expected, found]) =>
    [name, found(), expected]).filter(([, found, expected]) =>
    found !== expected).map(([name, found]) => [name, found]));
};

// The metadata generation records for `f`'s program.
const generated = async context => {
  const load = loader(context);
  const cases = await arityCases(load);
  const { unfoldableArray } = await load('Data.Unfoldable');
  const pairs = map => cases.Maps.toUnfoldable(unfoldableArray)(map)
    .map(pair => [pair.value0, pair.value1]);
  const name = ref => ref instanceof cases.Row.UserEffect ? ref.value0
    : ref.constructor.name;
  const { declarations } = cases.problemOf(sources.cell, 'f').effects;
  const effects = JSON.stringify(pairs(declarations.effects).map(
    ([ref, count]) => [name(ref), count]));
  const types = JSON.stringify(pairs(declarations.types));
  const wrong = [];
  if (effects !== '[[0,1],[1,0],[2,0],["FailEffect",1],'
    + '["ConsoleEffect",0]]') wrong.push(`effects ${effects}`);
  if (types !== '[[0,{"types":1,"rows":1}]]') wrong.push(`types ${types}`);
  reported(context, wrong);
};

// Ruling 3: unequal argument counts refused, a common prefix never
// zipped.
const defensive = async context => {
  const load = loader(context);
  const cases = await arityCases(load);
  const Equal = await load('Features.Check.Strategy.Effects.Equal');
  const Consume = await load('Features.Check.Strategy.Effects.Consume');
  const { P, Atom, Effect, Row, Nothing, row, cell, int, job } = cases;
  const bool = new P.PBase(Atom.BoolBase.value);
  const context0 = { package: cases.pkg({}), rigidMarks: [] };
  const same = (left, right) =>
    Equal.samePTy(context0)(left)(right).constructor.name === 'Right';
  const arrowOf = label => new P.PArrow(int, row(label), int);
  const handlerOf = head => new P.PHandler(head,
    { inference: row(), clauses: Nothing.value });
  const mint = new Effect.MBase(Atom.IntBase.value);
  const mbool = new Effect.MBase(Atom.BoolBase.value);
  const mrow = (...args) => ({ labels: [{ effect: new Row.UserEffect(0),
    args, mark: new Effect.Written(Effect.FixedN.value) }],
  tail: Nothing.value });
  const consumed = Consume.consumeCheck(context0)({ site: Effect.AtCall
    .value, source: mrow(mint), target: mrow(mint, mbool), marks: true,
  bare: false }).constructor.name === 'Right';
  const accepted = [
    ['data arguments', same(job([int], [row()]), job([int, bool], [row()]))],
    ['data rows', same(job([int], [row()]), job([int], [row(), row()]))],
    ['row labels', same(arrowOf(cell(int)), arrowOf(cell(int, bool)))],
    ['handler labels', same(handlerOf(cell(int)), handlerOf(cell(int, bool)))],
    ['consumed labels', consumed]];
  reported(context, accepted.filter(([, found]) => found)
    .map(([name]) => name));
};

export const a2ArityProbes = {
  'r0-a2-arity-image': images,
  'r0-a2-arity-bare-lax': images,
  'r0-a2-arity-bare-everywhere': images,
  'r0-a2-arity-record': records,
  'r0-a2-arity-holders': records,
  'r0-a2-arity-builtins': records,
  'r0-a2-arity-sign': records,
  'r0-a2-arity-blame': records,
  'r0-a2-arity-generated-rows': generated,
  'r0-a2-arity-generated-builtins': generated,
  'r0-a2-arity-equal-prefix': defensive,
  'r0-a2-arity-handler-head': defensive,
  'r0-a2-arity-row-prefix': defensive,
  'r0-a2-arity-consume-prefix': defensive
};
