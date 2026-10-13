import assert from 'node:assert/strict';
import { Right } from '../output/Data.Either/index.js';
import { compile } from '../output/Program.Compile/index.js';
import { diagnose } from './fx-diagnostics-support.mjs';

// FX018 (BACKLOG): the user-approved wording for a callback-row mismatch
// inside `with`/`handle` and when a function is passed as an argument.
export const effects = 'effect L { fn l(): Int; }; effect M { fn m(): Int; }; '
  + 'effect N { fn n(): Int; }; ';
export const main = ' fn main(): Unit with Console = print(1);';
export const keep = 'fn keep(f: Int -> Int with ...e): Int -> Int with ...e '
  + '= f; ';
export const accepted = source =>
  assert.ok(compile(source) instanceof Right, `compiles: ${source}`);

// The hint's row, applied: `before` is the callee's written type, which the
// printed `with …` replaces. The program must then compile.
export const applyHint = (source, before, after) => {
  const { diagnostic } = diagnose(source);
  const row = /write \S+'s row as `with ([^`]+)`/.exec(diagnostic.message);
  assert.ok(row, `a printed hint: ${diagnostic.message}`);
  assert.ok(source.includes(before), before);
  accepted(source.replace(before, after(row[1])));
};

const tail = 'must allow every effect';
export const here = (callee, row, own, hint = '') =>
  `${callee} ${tail} at this call (${row}), but its row ${own}; ${hint}`
  + (hint === '' ? 'a function value\'s' : 'a callback\'s')
  + ' row must equal the row where it is called (FX018)';
export const argument = (callee, target, row, own, hint = '') =>
  `${callee} ${tail} of ${target} (${row}), but its row ${own}; ${hint}`
  + (hint === '' ? 'a function value' : 'a function')
  + ' passed as an argument must have its parameter\'s row (FX018)';
export const write = (callee, row) => `write ${callee}'s row as \`with ${row}\`; `;
