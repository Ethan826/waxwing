// Tranche 2 Task 16 regression probe (the A2 activation gate,
// docs/plans/2026-11-03-a2-activation-gate.md); the rows are in
// scripts/regression-r0-t2-activation.mjs. The gate reads committed
// evidence only, so the probe loads nothing from the compiler: it runs
// the gate's own must-fail cases from its copy of test/.
import { fail, passed } from './regression-r0-amin-support.mjs';
import { wrongCases } from './r0-t2-activation-gate-cases.mjs';

export const t2ActivationProbes = {
  'r0-t2-activation-gate': async context => {
    const wrong = wrongCases();
    if (wrong.length > 0) fail(`${context.probe}: ${JSON.stringify(wrong)}`);
    passed(context);
  }
};
