import { coreRows } from './regression-core.mjs';
import { fnRows } from './regression-fn.mjs';
import { fx008Rows } from './regression-fx008.mjs';
import { fxRows } from './regression-fx.mjs';
import { textRows } from './regression-text.mjs';
import { fx020Rows } from './regression-fx020.mjs';
import { r001Rows } from './regression-r001.mjs';
import { r004Rows } from './regression-r004.mjs';
import { r005Rows } from './regression-r005.mjs';
import { r005bRows } from './regression-r005b.mjs';
import { r005bEndRows } from './regression-r005b-end.mjs';
import { r005bRenderRows } from './regression-r005b-render.mjs';
import { r012Rows } from './regression-r012.mjs';
import { r0Rows } from './regression-r0.mjs';
import { ieRows } from './regression-ie.mjs';
import { runRegression } from './regression-run.mjs';
// Each row restores one defect in its own isolated copy of the sources.
// One plain-purs baseline is compiled per run; each row clones it (APFS
// copy-on-write, else an ordinary copy), edits the clone's sources, and
// compiles incrementally. test/regression-incremental.test.mjs proves that
// equals a from-scratch compile. A failing row's compile and probe output
// is saved under .build/regression-failed before its directory is removed.
// Rows run in a bounded pool (scripts/regression-pool.mjs): at most
// min(6, cores - 2) at once, or WAXWING_REGRESSION_JOBS=<n> (1 is
// sequential). Every row runs even when one fails; failing rows are named
// at the end and the exit status is 1.
// `node scripts/regression.mjs [name…]` proves only the named rows.
const allRows = [...coreRows, ...fnRows, ...fx008Rows, ...fxRows,
  ...textRows, ...fx020Rows, ...r001Rows, ...r004Rows, ...r005Rows,
  ...r005bRows, ...r005bEndRows, ...r005bRenderRows, ...r012Rows, ...ieRows,
  ...r0Rows];
const failed = await runRegression(allRows, process.argv.slice(2));
process.exitCode = failed.length === 0 ? 0 : 1;
