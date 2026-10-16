import test from 'node:test';
import assert from 'node:assert/strict';
import { compile } from '../output/Program.Compile/index.js';
import { Left } from '../output/Data.Either/index.js';
import { wire } from '../output/Format.Diagnostic/index.js';
import { parse } from '../output/Format.Parse/index.js';
import { resolve } from '../output/Features.Resolve/index.js';
import { check } from '../output/Features.Check/index.js';
import {
  choose, declarations, enumerate, expected, generator, intDomain, matches,
  parseWitness, pattern, print, recordText
} from './coverage-oracle.mjs';

const cases = 300;
const recordCases = 150;
const maximumArms = 4;

// Builds one match and records each arm pattern's source offset.
const build = (type, patterns) => {
  const prefix = `${declarations} fn f(v: ${type}): Int = `;
  let match = 'match v { ';
  const offsets = patterns.map(p => {
    const offset = prefix.length + match.length;
    match += `${print(p)} => 0, `;
    return offset;
  });
  match += '}';
  return { source: `${prefix}${match}; fn main(): Int = 0;`, offsets,
    start: prefix.length, end: prefix.length + match.length };
};

const judged = result => {
  if (!(result instanceof Left)) return { code: null };
  const diagnostic = wire(result.value0);
  return { code: diagnostic.code, diagnostic };
};
const outcome = source => judged(compile(source));
// Through Check only: record patterns are lowered to Go in R004 Task 4.
const checkedOutcome = source => {
  const parsed = parse(source);
  if (parsed instanceof Left) return judged(parsed);
  const resolved = resolve(parsed.value0);
  return judged(resolved instanceof Left ? resolved : check(resolved.value0));
};

// A raw LCG's bit 0 alternates, so reading it made every two-way choice
// a strict alternation and correlated consecutive choices.
test('two-way choices are not a strict alternation', () => {
  const draws = 80;
  const next = generator(0x5eed);
  const bits = Array.from({ length: draws }, () => choose(next, 2));
  assert.ok(bits.some((bit, index) => index > 0 && bit === bits[index - 1]),
    bits.join(''));
});

// Compares one generated match with the oracle; returns the expected code.
const agrees = (next, type, text, run) => {
  const count = 1 + choose(next, maximumArms);
  const patterns = Array.from({ length: count },
    () => pattern(next, type, 1, { count: 0 }));
  const built = build(text, patterns);
  const domain = enumerate(type, intDomain(patterns));
  const want = expected(patterns, domain);
  const got = run(built.source);
  assert.equal(got.code, want.code, built.source);
  if (want.code === 'E_REDUNDANT') {
    const offset = built.offsets[want.arm];
    const width = print(patterns[want.arm]).length;
    assert.equal(got.diagnostic.span.start.offset, offset, built.source);
    assert.equal(got.diagnostic.span.end.offset, offset + width,
      built.source);
  }
  if (want.code === 'E_NON_EXHAUSTIVE') {
    assert.equal(got.diagnostic.span.start.offset, built.start, built.source);
    assert.equal(got.diagnostic.span.end.offset, built.end, built.source);
    const text = got.diagnostic.message.replace(/^Missing pattern: /, '');
    const witness = parseWitness(text);
    // Spec section 8: the witness covers only unmatched enumerated values.
    const covered = domain.filter(v => matches(witness, v));
    assert.ok(covered.length > 0, `${text} matches nothing: ${built.source}`);
    const unmatched = covered.every(v => !patterns.some(p => matches(p, v)));
    assert.ok(unmatched, `${text} covers a matched value: ${built.source}`);
  }
  return want.code;
};

const everyOutcome = seen => {
  for (const [code, count] of Object.entries(seen)) {
    assert.ok(count > 0, `no generated case expected ${code}`);
  }
};

test('coverage agrees with a brute-force first-match oracle', () => {
  const next = generator(0x5eed);
  const seen = { E_REDUNDANT: 0, E_NON_EXHAUSTIVE: 0, null: 0 };
  for (let index = 0; index < cases; index++) {
    const type = choose(next, 4) ? 'T' : 'Bool';
    seen[agrees(next, type, type, outcome)]++;
  }
  everyOutcome(seen);
});

// R004 Task 3: record patterns over a record holding T, Bool and an open
// nested record, with omitted fields and `...`.
test('record coverage agrees with the brute-force oracle', () => {
  const next = generator(0x2ec0);
  const seen = { E_REDUNDANT: 0, E_NON_EXHAUSTIVE: 0, null: 0 };
  for (let index = 0; index < recordCases; index++) {
    seen[agrees(next, 'R', recordText, checkedOutcome)]++;
  }
  everyOutcome(seen);
});

// Generated small type systems, including uninhabited constructors such as
// `K0x0(T0)`. Inhabitedness is brute-forced as a least fixed point here,
// independently of Features.Check.Signature.
const systems = 120;
const maximumTypes = 3;
const maximumCtors = 3;
const maximumFields = 3;

const typeSystem = next => {
  const names = Array.from({ length: 1 + choose(next, maximumTypes) },
    (_, index) => `T${index}`);
  const fieldTypes = [...names, 'Int', 'Bool'];
  const field = () => fieldTypes[choose(next, fieldTypes.length)];
  const ctor = owner => (_, index) => ({ name: `K${owner}x${index}`, owner,
    fields: Array.from({ length: choose(next, maximumFields) }, field) });
  return names.map(name => ({ name, ctors: Array.from(
    { length: 1 + choose(next, maximumCtors) }, ctor(name.slice(1))) }));
};

const inhabitedCtors = types => {
  const live = new Set(['Int', 'Bool']);
  const found = new Set();
  const ctors = types.flatMap(type => type.ctors);
  for (let grown = true; grown;) {
    grown = false;
    for (const ctor of ctors) {
      if (found.has(ctor.name) || !ctor.fields.every(f => live.has(f)))
        continue;
      found.add(ctor.name);
      live.add(`T${ctor.owner}`);
      grown = true;
    }
  }
  return found;
};

const shape = ctor => ctor.fields.length
  ? `${ctor.name}(${ctor.fields.map(() => '_').join(', ')})` : ctor.name;
const declare = type => `type ${type.name} = `
  + `${type.ctors.map(c => c.fields.length ? `${c.name}(${c.fields.join(', ')})`
    : c.name).join(' | ')};`;
const listing = (types, type, ctors) => `${types.map(declare).join(' ')} `
  + `fn f(v: ${type.name}): Int = match v { `
  + `${ctors.map(c => `${shape(c)} => 0, `).join('')}}; fn main(): Int = 0;`;

test('constructor coverage agrees with brute-forced inhabitedness', () => {
  const next = generator(0x1ab17);
  const seen = { uninhabited: 0, dropped: 0 };
  for (let index = 0; index < systems; index++) {
    const types = typeSystem(next);
    const inhabited = inhabitedCtors(types);
    for (const type of types) {
      const all = listing(types, type, type.ctors);
      assert.equal(outcome(all).code, null, all);
      for (const ctor of type.ctors) {
        const rest = type.ctors.filter(other => other !== ctor);
        if (!rest.length) continue;
        const source = listing(types, type, rest);
        const got = outcome(source);
        if (!inhabited.has(ctor.name)) {
          seen.uninhabited++;
          assert.equal(got.code, null, source);
          continue;
        }
        seen.dropped++;
        assert.equal(got.code, 'E_NON_EXHAUSTIVE', source);
        assert.equal(got.diagnostic.message, `Missing pattern: ${shape(ctor)}`,
          source);
      }
    }
  }
  assert.ok(seen.uninhabited > 0 && seen.dropped > 0, JSON.stringify(seen));
});
