// A2 lane regression probes, dispatched through test/regression-r0-a2.mjs;
// the rows are in scripts/regression-r0-a2-package.mjs. Each loads modules
// from the compiler under test only, through `context.compilerPath`.
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ptyModules, randomPTys } from './r0-a2-pty-gen.mjs';

const fail = message => {
  console.error(message);
  process.exit(1);
};
const loader = context => name => import(pathToFileURL(
  resolve(dirname(context.compilerPath), '..', name, 'index.js')));
const passed = context =>
  console.log(`${context.probe} regression detects the defect`);
const packageModule = 'Features.Check.Strategy.Effects.Package';

export const a2PackageProbes = {
  // Task 2, C8: nullary data, `PData t [] []`, erases to the base
  // `DataBase t`, as generation's `recordedWith` writes it.
  'r0-a2-nullary-erase': async context => {
    const load = loader(context);
    const Package = await load(packageModule);
    const Types = await load('Domain.Verdict.EffectPackage');
    const Atom = await load('Domain.Recorded.Atom');
    const erased = Package.eraseTy(new Types.PData(5, [], []));
    if (!Atom.eqRTExpr.eq(erased)(new Atom.Base(new Atom.DataBase(5))))
      fail(`nullary data erases to DataBase: got ${erased.constructor.name}`);
    passed(context);
  },
  // Task 2: settling commutes with erasure over the unit test's 2,000
  // seeded types (test/r0-a2-erase.test.mjs).
  'r0-a2-settle-order': async context => {
    const load = loader(context);
    const Package = await load(packageModule);
    const ReadBack = await load('Features.Check.Strategy.ReadBack.Type');
    const Atom = await load('Domain.Recorded.Atom');
    const cases = randomPTys(await ptyModules(load), 20261031, 2000);
    const wrong = cases.findIndex(type => !Atom.eqRTExpr.eq(
      Package.eraseTy(Package.settleTy(type)))(
      ReadBack.settled(Package.eraseTy(type))));
    if (wrong >= 0) fail(`settle does not commute with erase: case ${wrong}`);
    passed(context);
  }
};
