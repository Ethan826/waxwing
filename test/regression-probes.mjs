// Every probe delegated to a context by test/regression.mjs, in one table.
import { polyProbes } from './regression-poly.mjs';
import { fnProbes } from './regression-fn.mjs';
import { task5Probes } from './regression-task5.mjs';
import { fx008Probes } from './regression-fx008.mjs';
import { markProbes } from './regression-fx008-marks.mjs';
import { fxProbes } from './regression-fx.mjs';
import { diagProbes } from './regression-diag.mjs';
import { textProbes } from './regression-text.mjs';
import { fx020Probes } from './regression-fx020.mjs';
import { r001Probes } from './regression-r001.mjs';
import { r001BodyProbes } from './regression-r001-body.mjs';
import { r004Probes } from './regression-r004.mjs';
import { r005Probes } from './regression-r005.mjs';
import { r005bProbes } from './regression-r005b.mjs';
import { r005bEndProbes } from './regression-r005b-end.mjs';
import { r005bRenderProbes } from './regression-r005b-render.mjs';
import { r012Probes } from './regression-r012.mjs';
import { r0Probes } from './regression-r0.mjs';
import { r0G0Probes } from './regression-r0-g0.mjs';
import { r0OnlineProbes } from './regression-r0-online.mjs';
import { r0WitnessProbes } from './regression-r0-witness.mjs';
import { r0CxProbes } from './regression-r0-cx.mjs';
import { r0ElabProbes } from './regression-r0-elab.mjs';
import { r0AminProbes } from './regression-r0-amin.mjs';
import { r0PortProbes } from './regression-r0-port.mjs';
import { r0A2Probes } from './regression-r0-a2.mjs';
import { r0T2Probes } from './regression-r0-t2.mjs';
import { ieProbes } from './regression-ie.mjs';
import { growthProbes } from './regression-growth.mjs';

export const externalProbes = {
  ...polyProbes, ...fnProbes, ...task5Probes, ...fx008Probes,
  ...markProbes, ...fxProbes, ...textProbes, ...fx020Probes, ...r001Probes,
  ...r001BodyProbes, ...r004Probes, ...r005Probes, ...r005bProbes,
  ...r005bEndProbes, ...r005bRenderProbes,
  ...r012Probes, ...r0Probes, ...r0G0Probes, ...r0OnlineProbes,
  ...r0WitnessProbes, ...r0CxProbes, ...r0ElabProbes, ...r0AminProbes,
  ...r0PortProbes, ...r0A2Probes, ...r0T2Probes, ...growthProbes,
  ...ieProbes, ...diagProbes
};
