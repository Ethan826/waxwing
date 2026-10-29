// FN001 Task 2: Features.Check.Functional, the declared types whose values
// can hold a function (design §3), built directly from constructor tables:
// no syntax writes an arrow until Task 3.
import test from 'node:test';
import assert from 'node:assert/strict';
import { TData, TVar } from '../output/Domain.Type/index.js';
import { containsFunction,
  functional } from '../output/Features.Check.Functional/index.js';
import { int, fun, ctor, holds } from './functional-support.mjs';

const variable = TVar.create(0);
// TypeId and VarId are newtypes, so plain numbers at run time.
const applied = (id, ...args) => TData.create(id)(args)([]);

const [List, Box, A, B, Phantom, C, E, H, Plain] = [0, 1, 2, 3, 4, 5, 6, 7, 8];
const ctors = [
  ctor(List, []),
  ctor(List, [variable, applied(List, variable)]),
  ctor(Box, [fun(variable, variable)]),
  ctor(A, [applied(B)]),
  ctor(B, [fun(int, int)]),
  ctor(B, [applied(A)]),
  ctor(Phantom, []),
  ctor(C, [applied(Phantom, fun(int, int))]),
  ctor(E, [applied(List, applied(Box, int))]),
  ctor(H, [variable]),
  ctor(Plain, [int, applied(List, int), applied(H, applied(Plain))])
];

test('the functional types are the least fixed point through fields', () => {
  const found = functional(ctors);
  for (const id of [Box, A, B, C, E])
    assert.equal(holds(found, id), true, `type ${id}`);
  for (const id of [List, Phantom, H, Plain])
    assert.equal(holds(found, id), false, `type ${id}`);
});

test('a type contains a function directly or through a functional type', () => {
  const found = functional(ctors);
  const contains = ty => containsFunction(found)(ty);
  assert.equal(contains(applied(List, int)), false);
  assert.equal(contains(applied(Box, int)), true);
  assert.equal(contains(applied(H, fun(int, int))), true);
  assert.equal(contains(applied(H, applied(Box, int))), true);
  assert.equal(contains(applied(H, applied(List, int))), false);
  assert.equal(contains(fun(int, int)), true);
  assert.equal(contains(int), false);
});
