// Tranche 2 Task 12 regression probes (the online certificate's
// package); the rows are in scripts/regression-r0-t2-online.mjs. The
// check probes load modules from the compiler under test only, through
// `context.compilerPath`, and fail naming every fixture of
// test/r0-t2-online-checks.mjs that differs; the import probe runs
// `purs graph` over the clone's sources and the healthy structure rules.
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { graphFindings } from '../scripts/structure.mjs';
import { onlineChecks } from './r0-t2-online-checks.mjs';
import { fail, passed } from './regression-r0-amin-support.mjs';

const loader = context => name => import(pathToFileURL(
  resolve(dirname(context.compilerPath), '..', name, 'index.js')));
const rootOf = context => resolve(dirname(context.compilerPath), '..', '..');
const graphBytes = 4 * 1024 ** 2;

const probe = check => async context => {
  const wrong = (await onlineChecks(loader(context)))[check]();
  if (wrong.length > 0) fail(`${context.probe}: ${JSON.stringify(wrong)}`);
  passed(context);
};

const imports = async context => {
  const result = spawnSync('purs', ['graph', 'src/**/*.purs',
    '.spago/p/*/src/**/*.purs'], { cwd: rootOf(context), encoding: 'utf8',
    maxBuffer: graphBytes });
  if (result.error || result.status !== 0)
    fail(`${context.probe}: purs graph failed`);
  const found = graphFindings(JSON.parse(result.stdout)).filter(finding =>
    finding.startsWith('Features.Check.Strategy.Online '));
  if (found.length > 0) fail(`${context.probe}: ${found.join('; ')}`);
  passed(context);
};

export const t2OnlineProbes = {
  'r0-t2-online-carried': probe('carriedWrong'),
  'r0-t2-online-kept': probe('keptWrong'),
  'r0-t2-online-imports': imports
};
