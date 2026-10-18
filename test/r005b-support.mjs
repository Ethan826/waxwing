// R005 Tranche B test helpers: the executable example fixtures
// (test/fixtures/r005b) and the exact assertion of a diagnostic's
// message, span and notes against a fixture's `{ text, nth }` locations.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { compile } from '../output/Program.Compile/index.js';
import { Left } from '../output/Data.Either/index.js';
import { wire } from '../output/Format.Diagnostic/index.js';

const directory = 'test/fixtures/r005b';

export const fixtures = readdirSync(directory)
  .filter(name => name.endsWith('.json')).sort()
  .map(name => JSON.parse(readFileSync(`${directory}/${name}`, 'utf8')));

export const fixture = name => {
  const found = fixtures.find(entry => entry.name === name);
  assert.ok(found, `no fixture ${name}`);
  return found;
};

// A location as test/support.mjs `spanAt` takes it, as offsets: sources
// span several lines, whose line and column the offsets already decide.
export const offsets = (source, at) => {
  let start = -1;
  for (let found = 0; found <= at.nth; found++) {
    start = source.indexOf(at.text, start + 1);
    assert.notEqual(start, -1, `${at.text} occurrence ${at.nth} not found`);
  }
  return [start, start + at.text.length];
};

// The wired diagnostic of a rejected source, or null when it compiles.
export const wired = source => {
  const result = compile(source);
  return result instanceof Left ? wire(result.value0) : null;
};

const spanOffsets = span => [span.start.offset, span.end.offset];

// The rejection's code, message, span and notes are exactly `expected`'s
// (`{ code, message, at, notes: [{ message, at }] }`).
export const assertDiagnostic = (source, expected) => {
  const found = wired(source);
  assert.notEqual(found, null, `accepted: ${source}`);
  assert.deepEqual(
    [found.code, found.message, ...spanOffsets(found.span)],
    [expected.code, expected.message, ...offsets(source, expected.at)]);
  assert.deepEqual(
    found.related.map(note => [note.message, ...spanOffsets(note.span)]),
    expected.notes.map(note => [note.message, ...offsets(source, note.at)]));
  return found;
};

// Task 5's placeholders for Task 6's texts: an Unresolved body (D4) and a
// contradiction an equation established (D6).
export const unresolved = 'R005B placeholder: unresolved row equations are '
  + 'reported in Task 6';
export const fromEquations = 'R005B placeholder: contradictions from '
  + 'equations are reported in Task 6';
