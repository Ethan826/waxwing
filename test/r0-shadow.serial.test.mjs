import { shadowRun } from './r0-shadow-run.mjs';
import { rt8Checks } from './r0-rt8-checks.mjs';
import { windowChecks } from './r0-shadow-checks.mjs';

// RT8 (Task 4.3; test/r0-rt8-checks.mjs) and the window table (Task
// 4.5; test/r0-shadow-checks.mjs) over one run of the corpus: each
// program is decided once (`declarationsOf`), where each suite used to
// decide the whole corpus in its own process (BACKLOG R025). Each
// suite's assertions, pins (rt8.json, window.json) and messages are its
// own. Corpus-wide, so serial.
const { rt8Rows, programs } = await shadowRun();
rt8Checks(rt8Rows);
windowChecks(programs);
