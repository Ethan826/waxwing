// Tranche 2 read-back regression probes, imported through
// test/regression-probes.mjs; the rows are in scripts/regression-r0-t2.mjs.
// Each lane's probes are in its own file.
import { t2GenerationProbes } from './regression-r0-t2-generation.mjs';

export const r0T2Probes = {
  ...t2GenerationProbes
};
