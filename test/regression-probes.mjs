// Every probe delegated to a context by test/regression.mjs, in one table.
import { polyProbes } from './regression-poly.mjs';
import { fnProbes } from './regression-fn.mjs';
import { task5Probes } from './regression-task5.mjs';
import { fx008Probes } from './regression-fx008.mjs';
import { markProbes } from './regression-fx008-marks.mjs';
import { fxProbes } from './regression-fx.mjs';

export const externalProbes = {
  ...polyProbes, ...fnProbes, ...task5Probes, ...fx008Probes,
  ...markProbes, ...fxProbes
};
