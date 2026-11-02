// Tranche 2 Task 12 regression probes (the online certificate's
// package); the rows are in scripts/regression-r0-t2-online.mjs. The
// check probes load modules from the compiler under test only, through
// `context.compilerPath`, and fail naming every fixture of
// test/r0-t2-online-checks.mjs that differs; the import probe runs
// `purs graph` over the clone's sources and the healthy structure rules;
// the substitution probe reads the clone's src with the healthy reader.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { filesUnder, graphFindings } from '../scripts/structure.mjs';
import { onlineImportFindings } from '../scripts/structure-online.mjs';
import { facts } from '../output/Style.Trace/index.js';
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

// The clone's src tree, read with the healthy build's Style.Trace.
const substitution = async context => {
  const root = rootOf(context);
  const sources = Object.fromEntries(filesUnder(resolve(root, 'src'))
    .filter(file => file.endsWith('.purs')).map(file =>
      [relative(root, file), readFileSync(file, 'utf8')]));
  const found = onlineImportFindings(sources, facts);
  if (found.length > 0) fail(`${context.probe}: ${found.join('; ')}`);
  passed(context);
};

export const t2OnlineProbes = {
  'r0-t2-online-carried': probe('carriedWrong'),
  'r0-t2-online-kept': probe('keptWrong'),
  'r0-t2-online-verdict': probe('verdictWrong'),
  'r0-t2-online-imports': imports,
  'r0-t2-online-substitution': substitution
};
