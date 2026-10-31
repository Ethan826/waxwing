// Lists every row that moved between two census/window/RT8 dumps
// (scripts/r0-results-dump.mjs); read-only. Exit status 0: nothing
// moved; 2: rows or aggregates moved, none a status change; 1: at least
// one STOP row (a Solved or blocked status change, today's result, or a
// row added or removed), which the overnight authorization treats as a
// substantive stop.
//
//   node scripts/r0-results-moved.mjs <old.json> <new.json>
import { readFileSync } from 'node:fs';
import { compareResults, reportOf } from './r0-results-diff.mjs';

const [oldFile, newFile] = process.argv.slice(2);
const read = file => JSON.parse(readFileSync(file, 'utf8'));
const result = compareResults(read(oldFile), read(newFile));
console.log(reportOf(result));
process.exitCode = result.status;
