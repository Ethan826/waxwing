// BACKLOG T008: row walks jump alias hops (Features.Check.Aliases). Random
// `bindTail` sequences, with reverts as a postponed pair makes, must give
// the same labels, `Extended` occurrences and tail through `expanded` and
// `walkRow` as a naive hop-by-hop walk over the rows table. Seeded, so a
// failure repeats. Realistic mode binds unbound ends as the unifier does;
// adversarial mode binds any unbound meta to any meta, bound ones included.
import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

// The compiled modules; the mutant probe points this at another build.
const output = pathToFileURL(resolve(process.env.WAXWING_OUTPUT ?? 'output'));
const load = name => import(`${output.href}/${name}/index.js`);
const { Just, Nothing } = await load('Data.Maybe');
const { lookup } = await load('Data.Map.Internal');
const { ordInt } = await load('Data.Ord');
const { ConsoleEffect, Label, MarkMeta, Row } = await load('Domain.Row');
const { bindTail } = await load('Features.Check.Binding');
const { expanded } = await load('Features.Check.RowSide');
const { Meta, Rigid, boundAt, empty, walkRow } =
  await load('Features.Check.Subst');

const metas = 24;
const sequences = 300;
const operations = 40;
const metaTail = number => Just.create(new Meta(number));
const find = (subst, meta) => lookup(ordInt)(meta)(subst.rows);

let marks = 0;
const labelled = () => new Label(ConsoleEffect.value, [],
  new MarkMeta(marks++));
const ident = found => found.value2.value0;
const tailText = tail => tail === Nothing.value ? 'closed'
  : `${tail.value0 instanceof Meta ? 'm' : 'r'}${tail.value0.value0}`;

// The reference: follow every hop, one lookup each.
const naive = (subst, start) => {
  const entries = [];
  let tail = metaTail(start);
  while (tail !== Nothing.value && tail.value0 instanceof Meta) {
    const meta = tail.value0.value0;
    const found = find(subst, meta);
    if (found === Nothing.value) break;
    entries.push(...found.value0.value0.map(l => `${ident(l)}@${meta}`));
    tail = found.value0.value1;
  }
  return { entries: entries.join(','), tail: tailText(tail) };
};

const viaExpanded = (subst, start) => {
  const side = expanded(subst)({ entries: [], next: 0, tail: metaTail(start) });
  return {
    entries: side.entries
      .map(e => `${ident(e.label)}@${e.occurrence.value0}`).join(','),
    tail: tailText(side.tail)
  };
};

const viaWalkRow = (subst, start) => {
  const walked = walkRow(subst)(new Row([], metaTail(start)));
  return { entries: walked.value0.map(ident).join(','),
    tail: tailText(walked.value1) };
};

const jumped = (subst, start) => {
  const found = boundAt(subst)(metaTail(start));
  return found !== Nothing.value && found.value0.value0 !== start;
};

const generate = seed => {
  let state = seed;
  return count => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state % count;
  };
};

const newRow = (random, target) => {
  const kind = random(10);
  if (kind < 6) return new Row([], metaTail(target));
  if (kind === 6) return new Row([], Nothing.value);
  if (kind === 7) return new Row([], Just.create(new Rigid(random(3))));
  if (kind === 8) return new Row([labelled()], metaTail(target));
  return new Row([labelled()], Nothing.value);
};

const range = Array.from({ length: metas }, (_, meta) => meta);

// Returns how many checks ran, how many jumped, and the first mismatch.
const exercise = (adversarial, seed) => {
  const random = generate(seed);
  const found = { checks: 0, jumps: 0, mismatch: null };
  for (let sequence = 0; sequence < sequences; sequence++) {
    const snapshots = [empty];
    let subst = empty;
    for (let step = 0; step < operations; step++) {
      if (random(8) === 0) subst = snapshots[random(snapshots.length)];
      const unbound = range.filter(m => find(subst, m) === Nothing.value);
      if (unbound.length < 2) break;
      const meta = unbound[random(unbound.length)];
      const pool = adversarial ? range : unbound;
      const target = pool[random(pool.length)];
      const cyclic = naive(subst, target).tail === `m${meta}`;
      if (target === meta || cyclic) continue;
      subst = bindTail(subst)(meta)(newRow(random, target));
      snapshots.push(subst);
      for (const start of range) {
        const want = naive(subst, start);
        const got = [viaExpanded(subst, start), viaWalkRow(subst, start)];
        found.checks++;
        if (jumped(subst, start)) found.jumps++;
        const same = got[0].entries === want.entries
          && got[0].tail === want.tail && got[1].tail === want.tail
          && got[1].entries === ids(want.entries);
        if (!same && found.mismatch === null) {
          found.mismatch = { sequence, step, start, want, got };
        }
      }
    }
  }
  return found;
};

// `walkRow` keeps no occurrences: compare the label identities alone.
const ids = text => text.split(',').filter(Boolean)
  .map(entry => entry.split('@')[0]).join(',');

const modes = [['realistic', false], ['adversarial', true]];
for (const [name, adversarial] of modes) {
  test(`jumped walks equal hop-by-hop walks (${name})`, t => {
    const found = exercise(adversarial, 7);
    t.diagnostic(`${found.checks} checks, ${found.jumps} jumps`);
    assert.equal(found.mismatch, null, JSON.stringify(found.mismatch));
    assert.ok(found.jumps > 0, 'no walk jumped: the test is vacuous');
  });
}
