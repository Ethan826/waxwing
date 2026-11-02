import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// Final review, Important 1: `Valid` carries no payload, so its soundness
// rests on the modules below. BACKLOG R026 adds what `certify` builds the
// witness with; R029 adds the lowering boundary (D1 spec §8.2), which
// turns a `Judged` solution into checked IR, the generator family by
// pattern. Each module must carry the header marker, and
// docs/engineering.md and AGENTS.md must list exactly these modules, so
// the designation cannot drift silently.
const trusted = [
  'Strategy.Substitution', 'Strategy.Candidate', 'Strategy.Atoms',
  'Strategy.Asked', 'GroundRule', 'Mentions', 'Spine', 'Decide.Open',
  'Entailed', 'Entailed.Mgu', 'Entailed.Merge', 'Entailed.Triangular',
  'Decide', 'Decide.Shadow', 'Decide.Reason', 'Decide.Reading',
  'Strategy', 'Strategy.Online', 'Strategy.Witness', 'Strategy.HoleContract',
  'Strategy.ReadBack.Type',
  // A2 (plan Task 1): every Strategy.Effects module, as each lands.
  'Strategy.Effects.Arity',
  'Strategy.Effects.Complete', 'Strategy.Effects.Consume',
  'Strategy.Effects.Dependency', 'Strategy.Effects.Equal',
  'Strategy.Effects.Forced', 'Strategy.Effects.Handler',
  'Strategy.Effects.Judged', 'Strategy.Effects.Malformed',
  'Strategy.Effects.MalformedTerms', 'Strategy.Effects.Package',
  'Strategy.Effects.Record', 'Strategy.Effects.RecordArity',
  'Strategy.Effects.RecordCompanions', 'Strategy.Effects.RecordDuplicates',
  'Strategy.Effects.RecordEntries',
  'Strategy.Effects.RecordRefs', 'Strategy.Effects.Rows',
  'Strategy.Effects.Sites', 'Strategy.Effects.Term',
  'Strategy.Effects.Validate']
  .map(name => `Features.Check.${name}`)
  .concat(['Domain.Verdict.Certified', 'Domain.Verdict.Certified.Internal',
    'Domain.Verdict.EffectPackage', 'Domain.Verdict.EffectPackage.Internal',
    'Domain.Verdict.EffectPackage.Types',
    'Domain.Recorded.Atom', 'Domain.Recorded.Hole']);
const generate = 'Features.Check.Generate';
const lowering = ['Features.Check.Elaborate', 'Domain.Elaborating',
  'Domain.Elaborating.Internal', 'Domain.Elaborating.Build',
  'Domain.Elaborating.Types', 'Domain.Verdict.Judged',
  'Domain.Verdict.Judged.Internal', 'Domain.Verdict.Witness', generate,
  // BACKLOG R030: the shared helpers generation reads.
  ...['Holes', 'Walk', 'Implied', 'Tables', 'Functional', 'Nested',
    'NestedArguments', 'Components'].map(name => `Features.Check.${name}`),
  'Features.Resolve.Builtin'];
const marker = '-- trusted surface: every diff needs token review;'
  + ' see docs/engineering.md';
const path = name => `src/${name.replace(/\./g, '/')}.purs`;
// Every module of the generator family, from the source tree.
const family = (dir = 'src/Features/Check/Generate') =>
  readdirSync(dir, { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory() ? family(join(dir, entry.name))
      : entry.name.endsWith('.purs') ? [join(dir, entry.name)] : []);
const named = text => [...text.matchAll(/`((?:Features|Domain)\.[\w.]+)`/g)]
  .map(match => match[1]);
const read = file => readFileSync(file, 'utf8');
// The names between `start` and `end` (the next top-level bullet when
// `end` is absent).
const listed = (file, start, end) => {
  const text = read(file);
  const from = text.indexOf(start);
  assert.ok(from >= 0, `${file} lacks "${start}"`);
  const to = end === undefined ? text.indexOf('\n- ', from)
    : text.indexOf(end, from);
  assert.ok(to > from, `${file} lacks the end of "${start}"`);
  return named(text.slice(from, to));
};
const same = (found, expected) => assert.deepEqual([...found].sort(),
  [...expected].sort());

test('every trusted-surface module carries the header marker', () => {
  const files = [...trusted, ...lowering].map(path).concat(family());
  assert.ok(family().length >= 37, `${family().length} generator modules`);
  for (const file of files)
    assert.equal(read(file).split('\n')[0], marker, file);
});

test('the docs list exactly the trusted-surface modules', () => {
  const lower = 'Review-required lowering boundary';
  same(listed('docs/engineering.md', 'Review-required trusted surface',
    lower), trusted);
  same(listed('AGENTS.md', 'Review-required trusted surface', lower),
    trusted);
  same(listed('docs/engineering.md', lower, 'The core allowlist'),
    lowering);
  same(listed('AGENTS.md', lower), lowering);
});
