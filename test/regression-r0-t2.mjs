// Tranche 2 read-back regression probes, imported through
// test/regression-probes.mjs; the rows are in scripts/regression-r0-t2.mjs.
// Each lane's probes are in its own file.
import { t2GenerationProbes } from './regression-r0-t2-generation.mjs';
import { t2TraceProbes } from './regression-r0-t2-trace.mjs';
import { t2RowsProbes } from './regression-r0-t2-rows.mjs';
import { t2GatesProbes } from './regression-r0-t2-gates.mjs';
import { t2ImagesProbes } from './regression-r0-t2-images.mjs';
import { t2MarksProbes } from './regression-r0-t2-marks.mjs';
import { t2PackageProbes } from './regression-r0-t2-package.mjs';

export const r0T2Probes = {
  ...t2GenerationProbes,
  ...t2TraceProbes,
  ...t2RowsProbes,
  ...t2GatesProbes,
  ...t2ImagesProbes,
  ...t2MarksProbes,
  ...t2PackageProbes
};
