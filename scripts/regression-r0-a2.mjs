// A2 validator regression rows (docs/plans/2026-10-31-a2-validator-plan.md,
// Global Constraints), spread into r0Rows (scripts/regression-r0.mjs); the
// probes are in test/regression-r0-a2.mjs. One file per lane, each owned
// by its lane (the plan's "Lanes").
import { a2PackageRows } from './regression-r0-a2-package.mjs';
import { a2PrereqRows } from './regression-r0-a2-prereq.mjs';
import { a2JudgeRows } from './regression-r0-a2-judge.mjs';
import { a2DepRows } from './regression-r0-a2-dep.mjs';
import { a2CompleteRows } from './regression-r0-a2-complete.mjs';
import { a2ValidateRows } from './regression-r0-a2-validate.mjs';
import { a2MbRows } from './regression-r0-a2-mb.mjs';
import { a2ReportRows } from './regression-r0-a2-report.mjs';
import { a2PropsRows } from './regression-r0-a2-props.mjs';
import { a2ArityRows } from './regression-r0-a2-arity.mjs';

export const a2Rows = [
  ...a2PackageRows,
  ...a2PrereqRows,
  ...a2JudgeRows,
  ...a2DepRows,
  ...a2CompleteRows,
  ...a2ValidateRows,
  ...a2MbRows,
  ...a2ReportRows,
  ...a2PropsRows,
  ...a2ArityRows
];
