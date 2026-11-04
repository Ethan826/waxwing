// Activation prerequisites regression probes (R036 (1)-(3)); the rows
// are in scripts/regression-r0-t2-prerequisites.mjs. Each loads modules
// from the compiler under test only, through `context.compilerPath`, and
// fails naming every case of its checks that differs.
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { fail, passed } from './regression-r0-amin-support.mjs';

const loader = context => name => import(pathToFileURL(
  resolve(dirname(context.compilerPath), '..', name, 'index.js')));

// Imported when a probe runs: the cases read research sources a
// test-tree row's clone does not hold.
const rowsOf = async context =>
  (await import('./r0-t2-rows-checks.mjs')).rowsChecks(loader(context));
const imagesOf = async context => (await import('./r0-t2-images-cases.mjs'))
  .imagesChecks(loader(context));

const traceOf = async context => (await import('./r0-t2-trace-cases.mjs'))
  .traceCases(loader(context));
const packageOf = async context =>
  (await import('./r0-t2-package-checks.mjs')).packageChecks(
    loader(context));

// The audit scan's own checks (R036 (1)): a planted Partial.Unsafe
// import is reported, and a loop outside ReadBack with no row is too.
const scanOf = async () => {
  const scan = await import('./readback-total-scan.mjs');
  return {
    blindWrong: () => (scan.surfaceFindings({ P: { path: 'src/P.purs',
      depends: [] } }, ['P'], () => 'import Partial.Unsafe (unsafePartial)\n',
    () => false).length === 1 ? [] : ['Partial.Unsafe']),
    unlistedWrong: () => (scan.tableFindings([{ key:
      'Features.Check.MarkStore.planted', kind: 'tailRec', count: 1 }], [])
      .length === 1 ? [] : ['MarkStore'])
  };
};

// The loop scan's checks (fix round 1, I1-I3), with the clone's
// compiled Control.Monad.Rec.Class.
const loopsOf = async context => (await import('./readback-total-checks.mjs'))
  .loopChecks(readFileSync(resolve(dirname(context.compilerPath), '..',
    'Control.Monad.Rec.Class', 'index.js'), 'utf8'));

const probe = (of, check) => async context => {
  const wrong = await (await of(context))[check]();
  if (wrong.length > 0) fail(`${context.probe}: ${JSON.stringify(wrong)}`);
  passed(context);
};

export const t2PrerequisitesProbes = {
  'r0-t2-r036-1-lazy-overwrite': probe(loopsOf, 'lazyWrong'),
  'r0-t2-r036-1-drivers-narrow': probe(loopsOf, 'driversWrong'),
  'r0-t2-r036-1-alias-skipped': probe(loopsOf, 'aliasWrong'),
  'r0-t2-r036-1-scan-blind': probe(scanOf, 'blindWrong'),
  'r0-t2-r036-1-loop-unlisted': probe(scanOf, 'unlistedWrong'),
  'r0-t2-r036-2-meta-raw': probe(traceOf, 'unnumberedWrong'),
  'r0-t2-r036-2-row-unresolved': probe(traceOf, 'rowResolvedWrong'),
  'r0-t2-r036-2-trace-first': probe(packageOf, 'traceOrderWrong'),
  'r0-t2-r036-3-row-coarse': probe(rowsOf, 'unconvertedWrong'),
  'r0-t2-r036-3-image-coarse': probe(imagesOf, 'unconvertedWrong')
};
