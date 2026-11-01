// A2 validator regression probes, imported through
// test/regression-probes.mjs; the rows are in scripts/regression-r0-a2.mjs.
// Each lane's probes are in its own file.
import { a2PackageProbes } from './regression-r0-a2-package.mjs';
import { a2PrereqProbes } from './regression-r0-a2-prereq.mjs';
import { a2JudgeProbes } from './regression-r0-a2-judge.mjs';
import { a2DepProbes } from './regression-r0-a2-dep.mjs';
import { a2CompleteProbes } from './regression-r0-a2-complete.mjs';
import { a2ValidateProbes } from './regression-r0-a2-validate.mjs';
import { a2MbProbes } from './regression-r0-a2-mb.mjs';
import { a2ReportProbes } from './regression-r0-a2-report.mjs';
import { a2PropsProbes } from './regression-r0-a2-props.mjs';
import { a2ArityProbes } from './regression-r0-a2-arity.mjs';
import { a2CompanionProbes } from './regression-r0-a2-companions.mjs';

export const r0A2Probes = {
  ...a2PackageProbes,
  ...a2PrereqProbes,
  ...a2JudgeProbes,
  ...a2DepProbes,
  ...a2CompleteProbes,
  ...a2ValidateProbes,
  ...a2MbProbes,
  ...a2ReportProbes,
  ...a2PropsProbes,
  ...a2ArityProbes,
  ...a2CompanionProbes
};
