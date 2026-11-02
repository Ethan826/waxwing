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

const renumbered = async context =>
  reported(context, (await traceCases(loader(context))).renumberWrong());

const appliedKeys = async context =>
  reported(context, (await traceCases(loader(context))).appliedWrong());

export const t2TraceProbes = {
  'r0-t2-trace-renumber': renumbered,
  'r0-t2-trace-applied-key': appliedKeys
};
