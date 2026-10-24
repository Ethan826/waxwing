import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Final review, Important 1: `Valid` carries no payload, so its soundness
// rests on the modules below. Each must carry the header marker, and
// docs/engineering.md and AGENTS.md must list exactly these modules, so the
// designation cannot drift silently.
const trusted = [
  'Strategy.Substitution', 'Strategy.Candidate', 'Strategy.Atoms',
  'Strategy.Asked', 'GroundRule', 'Mentions', 'Spine', 'Decide.Open',
  'Entailed', 'Entailed.Mgu', 'Entailed.Merge', 'Decide', 'Decide.Shadow',
  'Strategy', 'Strategy.Online'].map(name => `Features.Check.${name}`);
const marker = '-- trusted surface: every diff needs token review;'
  + ' see docs/engineering.md';
const path = name => `src/${name.replace(/\./g, '/')}.purs`;
const named = text => [...text.matchAll(/`(Features\.Check\.[\w.]+)`/g)]
  .map(match => match[1]);
const read = file => readFileSync(file, 'utf8');
const listed = (file, start) => {
  const text = read(file);
  const from = text.indexOf(start);
  assert.ok(from >= 0, `${file} lacks "${start}"`);
  return named(text.slice(from, text.indexOf('\n- ', from)));
};

test('every trusted-surface module carries the header marker', () => {
  for (const name of trusted)
    assert.equal(read(path(name)).split('\n')[0], marker, name);
});

test('the docs list exactly the trusted-surface modules', () => {
  const same = found => assert.deepEqual([...found].sort(),
    [...trusted].sort());
  same(listed('docs/engineering.md', 'Review-required trusted surface'));
  same(listed('AGENTS.md', 'Review-required trusted surface'));
});
