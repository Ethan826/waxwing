// FN001 Task 8 Step 1b: the function forms of the Task 4 review's
// linear-cost table (fn-linear-sources.mjs), run through Parse → Resolve →
// Check → Specialize.
import { parse } from '../output/Format.Parse/index.js';
import { resolve } from '../output/Features.Resolve/index.js';
import { check } from '../output/Features.Check/index.js';
import { specialize } from '../output/Features.Specialize/index.js';
import { Right } from '../output/Data.Either/index.js';
import { wire } from '../output/Format.Diagnostic/index.js';

export { expectedOutcome, forms, partialFirstGrowth }
  from './fn-linear-sources.mjs';

// Runs the four phases; returns the outcome, 'ok' or the rejecting
// diagnostic's code. A stack overflow throws. It reads no clock: the time
// bounds (fn-linear-timing.perf.test.mjs) and the growth check
// (fn-linear-growth.serial.test.mjs, through test/growth.mjs) time the call.
export const throughSpecialize = source => {
  let result = parse(source);
  for (const phase of [resolve, check, specialize]) {
    if (result instanceof Right) result = phase(result.value0);
  }
  return { outcome: result instanceof Right ? 'ok' : wire(result.value0).code };
};
