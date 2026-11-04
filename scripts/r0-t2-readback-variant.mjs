// A scratch copy of a build with ReadBack.Walk's compiled output
// patched, for the read-back profile
// (docs/plans/2026-11-04-readback-cost-proposal.md §2). Measurement
// only: src/ and output/ are never touched, and the copy is the
// profile's to delete.
//   node scripts/r0-t2-readback-variant.mjs <build> <dest> <variant>[+…]
// Variants, composable with `+` when they patch different text:
// - counting: per lookup, the path's length, the nodes the walk visits
//   and the children it builds (One counts 1, Many its items, which
//   equals the wrappers built only while Walk's `map` is eager), and the
//   distinct (body, path) keys, into globalThis.readBackWalk, which the
//   profile resets per candidate (r0-t2-readback-profile.mjs);
// - wrapping: every `AtExpr` and `AtPattern` constructed, into
//   readBackWalk.wrapped. It patches only the constructors of `Node`,
//   so it reads the same on today's Walk and on one that wraps an item
//   only after indexing it (proposal option A);
// - memo: the same lookup answered once per (body, path): the separating
//   experiment for repeated lookups;
// - lazy: Walk's array `map` made lazy (a Proxy that wraps an item only
//   when it is read), so a walk wraps the one item its index names: the
//   separating experiment for the width term.
// No variant is a proposed implementation.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const walkFile = 'Features.Check.Strategy.ReadBack.Walk/index.js';
const exported = 'export {\n    AtExpr,\n    AtPattern,\n    nodeAt\n};';
const visit = 'return Data_Array.findMap(descend(steps))(children(node));';

// The key of a path: each step's constructor and value.
const keyHelper = `
var readBackKey = function (steps) {
    return steps.map(function (step) {
        return step.constructor.name + ':' + step.value0;
    }).join('/');
};`;

const counting = {
  visit: `{
            var built = children(node);
            var tally = globalThis.readBackWalk;
            if (tally !== undefined) {
                tally.levels += 1;
                built.forEach(function (child) {
                    tally.built += child.value1.length === undefined
                        ? 1 : child.value1.length;
                });
            }
            return Data_Array.findMap(descend(steps))(built);
        }`,
  wrapper: `${keyHelper}
var nodeAtWrapped = function (node) {
    return function (steps) {
        var tally = globalThis.readBackWalk;
        if (tally !== undefined) {
            tally.lookups += 1;
            tally.steps += steps.length;
            var seen = tally.keys.get(node.value0) ?? new Set();
            seen.add(readBackKey(steps));
            tally.keys.set(node.value0, seen);
        }
        return nodeAt(node)(steps);
    };
};`
};

const memo = {
  visit,
  wrapper: `${keyHelper}
var readBackMemo = new WeakMap();
var nodeAtWrapped = function (node) {
    return function (steps) {
        var table = readBackMemo.get(node.value0);
        if (table === undefined) {
            table = new Map();
            readBackMemo.set(node.value0, table);
        }
        var key = readBackKey(steps);
        var found = table.get(key);
        if (found === undefined) {
            found = nodeAt(node)(steps);
            table.set(key, found);
        }
        return found;
    };
};`
};

const arrayMap =
  'var map = /* #__PURE__ */ Data_Functor.map(Data_Functor.functorArray);';

const lazyMap = `var map = function (wrap) {
    return function (items) {
        return new Proxy(items, {
            get: function (target, key, receiver) {
                return typeof key === 'string' && /^[0-9]+$/.test(key)
                    ? wrap(target[key]) : Reflect.get(target, key, receiver);
            }
        });
    };
};`;

// Each variant is a list of replacements of exact compiled text; the
// text must occur once, so a changed Walk output stops the copy.
const exporting = wrapper => [exported, `${wrapper}\nexport {\n`
  + '    AtExpr,\n    AtPattern,\n    nodeAtWrapped as nodeAt\n};'];

const constructed = name => [
  `    function ${name}(value0) {\n        this.value0 = value0;`,
  `    function ${name}(value0) {\n        this.value0 = value0;\n`
    + '        if (globalThis.readBackWalk !== undefined)\n'
    + '            globalThis.readBackWalk.wrapped += 1;'];

const variants = {
  counting: [[visit, counting.visit], exporting(counting.wrapper)],
  memo: [exporting(memo.wrapper)],
  lazy: [[arrayMap, lazyMap]],
  wrapping: [constructed('AtExpr'), constructed('AtPattern')]
};

const patched = (text, replacements) => replacements.reduce(
  (done, [from, to]) => {
    if (done.split(from).length !== 2)
      throw new Error(`ReadBack.Walk output lacks one ${from.slice(0, 40)}`);
    return done.replace(from, to);
  }, text);

if (process.argv[1] !== undefined
  && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  const [build, dest, name] = process.argv.slice(2);
  const chosen = name.split('+').map(part => variants[part]);
  if (chosen.includes(undefined)) throw new Error(`no variant ${name}`);
  if (existsSync(dest)) throw new Error(`${dest} exists`);
  // APFS clone: the copy costs metadata, not 97 MB.
  execFileSync('cp', ['-cR', build, dest]);
  const file = resolve(dest, walkFile);
  writeFileSync(file, patched(readFileSync(file, 'utf8'), chosen.flat()));
  console.log(JSON.stringify({ dest, variant: name }));
}
