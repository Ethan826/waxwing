// Tranche 2 Task 6 regression probes (the trace); the rows are in
// scripts/regression-r0-t2-trace.mjs. Each loads modules from the
// compiler under test only, through `context.compilerPath`, and fails
// naming every fixture of test/r0-t2-trace-cases.mjs that differs.
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { traceCases } from './r0-t2-trace-cases.mjs';
import { fail, passed } from './regression-r0-amin-support.mjs';

const loader = context => name => import(pathToFileURL(
  resolve(dirname(context.compilerPath), '..', name, 'index.js')));

const reported = (context, wrong) => {
  if (wrong.length > 0) fail(`${context.probe}: ${JSON.stringify(wrong)}`);
  passed(context);
};

// The renumbering arm read by both of its checks: the trace's (a meta
// the body shares reads the body's hole) and the package's (one live
// meta, one number in types and effects), each prefixed `shared:`.
// One row restores it (scripts/regression-r0-t2-trace.mjs). The package
// checks are imported when the probe runs, as in
// test/regression-r0-t2-package.mjs.
const renumbered = async context => {
  const trace = (await traceCases(loader(context))).renumberWrong();
  const checks = await import('./r0-t2-package-checks.mjs');
  const shared = (await checks.packageChecks(loader(context)))
    .sharedWrong();
  reported(context, [...trace, ...shared.map(name => `shared:${name}`)]);
};

const appliedKeys = async context =>
  reported(context, (await traceCases(loader(context))).appliedWrong());

const clauseRecorded = async context =>
  reported(context, (await traceCases(loader(context))).clauseWrong());

export const t2TraceProbes = {
  'r0-t2-trace-renumber': renumbered,
  'r0-t2-trace-applied-key': appliedKeys,
  'r0-t2-trace-clause-dropped': clauseRecorded
};
