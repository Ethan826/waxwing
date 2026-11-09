// Tranche 2 read-back regression rows (docs/plans/
// 2026-11-01-tranche-2-read-back-design.md §I), spread into r0Rows
// (scripts/regression-r0.mjs); the probes are in test/regression-r0-t2.mjs.
// One file per lane, each owned by its lane.
import { t2GenerationRows } from './regression-r0-t2-generation.mjs';
import { t2TraceRows } from './regression-r0-t2-trace.mjs';
import { t2RowsRows } from './regression-r0-t2-rows.mjs';
import { t2GatesRows } from './regression-r0-t2-gates.mjs';
import { t2ImagesRows } from './regression-r0-t2-images.mjs';
import { t2MarksRows } from './regression-r0-t2-marks.mjs';
import { t2PackageRows } from './regression-r0-t2-package.mjs';
import { t2OnlineRows } from './regression-r0-t2-online.mjs';
import { t2HonestRows } from './regression-r0-t2-honest.mjs';
import { t2DiffRows } from './regression-r0-t2-diff.mjs';
import { t2CompatRows } from './regression-r0-t2-compat.mjs';
import { t2ActivationRows } from './regression-r0-t2-activation.mjs';
import { t6Rows } from './regression-r0-t6.mjs';
import { t2PrerequisitesRows } from './regression-r0-t2-prerequisites.mjs';
import { pathOrderRows, t2BatchRows } from './regression-r0-t2-batch.mjs';

export const t2Rows = [
  ...t2GenerationRows,
  ...t2TraceRows,
  ...t2RowsRows,
  ...t2GatesRows,
  ...t2ImagesRows,
  ...t2MarksRows,
  ...t2PackageRows,
  ...t2OnlineRows,
  ...t2HonestRows,
  ...t2DiffRows,
  ...t2CompatRows,
  ...t2ActivationRows,
  ...t6Rows,
  ...t2PrerequisitesRows,
  ...t2BatchRows,
  ...pathOrderRows
];
