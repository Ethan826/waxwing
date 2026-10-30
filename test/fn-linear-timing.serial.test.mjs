import test from 'node:test';
import assert from 'node:assert/strict';
import { expectedOutcome, forms,
  throughSpecialize } from './fn-linear-forms.mjs';

// FN001 Task 8 Step 1b: each function form at 20,000 parameters through
// Specialize. Routine half: the outcome of each form, so a stack overflow or
// a wrong diagnostic fails here. The eight absolute time bounds (three times
// the time measured 2026-10-09) are in fn-linear-timing.perf.test.mjs
// (npm run perf), and the growth check for partialFirst is in
// fn-linear-growth.serial.test.mjs. At 80,000 the same forms took about
// four times as long (linear), and test/fn-linear.serial.test.mjs checks
// that they finish without a stack failure there.
const width = 20000;

for (const [name, form] of Object.entries(forms)) {
  test(`${name} at ${width} parameters through Specialize`, () => {
    const { outcome } = throughSpecialize(form(width));
    assert.equal(outcome, expectedOutcome(name));
  });
}
