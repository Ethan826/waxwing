import assert from 'node:assert/strict';
import { Right } from '../output/Data.Either/index.js';
import * as tarjan from '../output/Features.Check.Components/index.js';

// Components succeed on every well-formed graph.
export const components = graph => {
  const result = tarjan.components(graph);
  assert.ok(result instanceof Right, JSON.stringify(result));
  return result.value0;
};
