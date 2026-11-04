// A scratch copy of a build with ReadBack.Walk's `nodeAt` wrapped, for
// the read-back profile (docs/plans/2026-11-04-readback-cost-proposal.md
// §2). Measurement only: src/ and output/ are never touched, and the
// copy is the profile's to delete.
//   node scripts/r0-t2-readback-variant.mjs <build> <dest> <variant>
// Variants (one wrapper each, chosen once here):
// - counting: per lookup, the path's length, the nodes the walk visits
//   and the children it builds (One counts 1, Many its items), and the
//   distinct (body, path) keys, into globalThis.readBackWalk, which the
//   profile resets per candidate (r0-t2-readback-profile.mjs);
// - memo: the same lookup answered once per (body, path): the separating
//   experiment for repeated lookups;
// - lazy: Walk's array `map` made lazy (a Proxy that wraps an item only
//   when it is read), so a walk wraps the one item its index names: the
//   separating experiment for the width term.
// Neither experiment is a proposed implementation.
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

const lazy = { visit, wrapper: 'var nodeAtWrapped = nodeAt;', map: lazyMap };

const variants = { counting, memo, lazy };

const patched = (text, variant) => {
  if (!text.includes(exported) || !text.includes(visit)
    || !text.includes(arrayMap))
    throw new Error('ReadBack.Walk output does not have the expected shape');
  return text.replace(arrayMap, variant.map ?? arrayMap)
    .replace(visit, variant.visit).replace(exported,
    `${variant.wrapper}\nexport {\n    AtExpr,\n    AtPattern,\n`
      + '    nodeAtWrapped as nodeAt\n};');
};

if (process.argv[1] !== undefined
  && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  const [build, dest, name] = process.argv.slice(2);
  const variant = variants[name];
  if (variant === undefined) throw new Error(`no variant ${name}`);
  if (existsSync(dest)) throw new Error(`${dest} exists`);
  // APFS clone: the copy costs metadata, not 97 MB.
  execFileSync('cp', ['-cR', build, dest]);
  const file = resolve(dest, walkFile);
  writeFileSync(file, patched(readFileSync(file, 'utf8'), variant));
  console.log(JSON.stringify({ dest, variant: name }));
}
