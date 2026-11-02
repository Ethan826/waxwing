// Loads every compiled module from a scratch copy (scratch.mjs) in place
// of the healthy output/: `T2_SCRATCH=<variant> node --import
// ./research/t2-read-back-design/redirect.mjs <script>`. Test and
// research scripts run unchanged; only output/ URLs are rewritten.
import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { outputOf } from './scratch.mjs';
import { repoRoot } from '../../test/r0-corpus.mjs';

const variant = process.env.T2_SCRATCH;
if (variant === undefined) throw new Error('T2_SCRATCH is not set');
const from = `${pathToFileURL(join(repoRoot, 'output')).href}/`;
const to = `${pathToFileURL(outputOf(variant)).href}/`;
registerHooks({ resolve: (specifier, context, next) => {
  const found = next(specifier, context);
  return found.url.startsWith(from)
    ? { ...found, url: to + found.url.slice(from.length) } : found;
} });
