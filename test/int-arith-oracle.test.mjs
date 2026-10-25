// Int arithmetic against the independent BigInt model of
// test/int-arith-oracle.mjs, through the Go backend (D001 plan, Task 2).
// Each tree is compiled twice, fully parenthesized and with minimal
// parentheses, so the printed value checks both the operation and the
// parser's grouping; parameter cases keep the operands out of Go's
// constant folding.
import assert from 'node:assert/strict';
import test from 'node:test';
import { runGoBatch } from './go-batch.mjs';
import {
  binary, boundary, evaluate, generate, leaf, parameter, random, render,
  wraps
} from './int-arith-oracle.mjs';

const ops = ['+'];
const seed = 1;
const literalCount = 200;
const parameterCount = 50;
const parameterSeed = 2;
const names = ['a', 'b', 'c'];
// At least this many trees must wrap somewhere, or the run says little
// about overflow (a guard against a generator drifting into small values).
const minimumWrapping = 50;

const literalTrees = generate(seed, literalCount, ops);
const choose = random(parameterSeed);
const parameterLeaf = stream => parameter(stream.pick(names));
const parameterTrees = generate(parameterSeed, parameterCount, ops,
  parameterLeaf).map(tree => ({ tree,
  env: Object.fromEntries(names.map(name => [name, choose.pick(boundary)]))
}));

const literalProgram = (tree, minimal) =>
  `fn main(): Int = ${render(tree, { minimal })};`;
const parameterProgram = ({ tree, env }) =>
  `fn g(a: Int, b: Int, c: Int): Int = ${render(tree)}; `
  + `fn main(): Int = g(${names.map(name => env[name]).join(', ')});`;

const cases = [
  ...literalTrees.map((tree, index) =>
    [`full ${index}`, literalProgram(tree, false)]),
  ...literalTrees.map((tree, index) =>
    [`minimal ${index}`, literalProgram(tree, true)]),
  ...parameterTrees.map((entry, index) =>
    [`parameter ${index}`, parameterProgram(entry)])
];
const batch = runGoBatch(import.meta.url, cases);
const sourceOf = new Map(cases);

const agrees = (name, expected) => assert.equal(batch.run(name),
  `${expected}\n`, `${name}: ${sourceOf.get(name)}`);

test('the model wraps at the int32 bounds', () => {
  const sum = (left, right) => evaluate(binary('+', leaf(left), leaf(right)));
  assert.equal(sum(2147483647, 1), -2147483648n);
  assert.equal(sum(-2147483648, -1), 2147483647n);
  assert.equal(sum(-2147483648, -2147483648), 0n);
  assert.equal(sum(2147483647, 2147483647), -2n);
  assert.equal(sum(1073741824, 1073741824), -2147483648n);
  assert.equal(sum(-1, 1), 0n);
});

test('the renderings keep only the parentheses `+` needs', () => {
  const tree = binary('+', binary('+', leaf(1), leaf(2)),
    binary('+', leaf(3), leaf(-4)));
  assert.equal(render(tree), '(1 + 2) + (3 + -4)');
  assert.equal(render(tree, { minimal: true }), '1 + 2 + (3 + -4)');
});

test('the generated trees exercise wrapping and the boundary', () => {
  const wrapping = literalTrees.filter(tree => wraps(tree)).length
    + parameterTrees.filter(({ tree, env }) => wraps(tree, env)).length;
  assert.ok(wrapping >= minimumWrapping, `only ${wrapping} trees wrap`);
  assert.ok(literalTrees.every(tree => tree.kind === 'binary'));
});

test(`${literalCount} literal trees, in both renderings, print the model's `
  + 'value after Go execution', () => {
  literalTrees.forEach((tree, index) => {
    agrees(`full ${index}`, evaluate(tree));
    agrees(`minimal ${index}`, evaluate(tree));
  });
});

test(`${parameterCount} trees over parameters bound to boundary values `
  + "print the model's value after Go execution", () => {
  parameterTrees.forEach(({ tree, env }, index) => {
    agrees(`parameter ${index}`, evaluate(tree, env));
  });
});
