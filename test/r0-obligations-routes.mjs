// The identity routes a marked type takes unchanged (amin tranche 1,
// Task 9; review 1 P1-1, extending R9's A5 beyond `let`), checked on the
// recorded `nodes`, marks included. Each is an identity in the
// generator, with no E1 between the two nodes:
// - a block's type is its result's (Generate/Block.purs `block`:
//   `marked: final.marked`), so nodes[p] = nodes[p/Block/result];
// - a record literal's type is `MRecord` over its fields' types in
//   order, no tail (Generate/Record.purs `literal`, E24: `markedRecord`
//   of each field's `marked`), so field i of nodes[p] is
//   nodes[p/RecordLiteral/fields/i/value] under its own label;
// - a lambda's type is its staged arrow over its n parameters, whose
//   result is the body's type (Generate/Control.purs `lambda`:
//   `stagedArrow` with `result: inner.marked`), so nodes[p] peeled of n
//   arrows is nodes[p/Lambda/body].
// The `let`/local route is A5's (r0-obligations-handler-survey.mjs).
// Shared by the survey (corpus) and the handler test's fixture.
import { nameOf, nodesOf } from './r0-generate-paths.mjs';
import { stableStringify } from './r0-canonical.mjs';

// Key order differs between records built apart, so compare stably.
const key = stableStringify;
// A body path's steps as the recorded path's shaped key.
const bodyKey = steps => key({ root: { InBody: [] },
  steps: steps.map(step => (typeof step === 'number'
    ? { Index: [step] } : { Named: [step] })) });

const differs = (nodes, left, right) =>
  key(nodes.get(left)) !== key(nodes.get(right));

const blockProblems = (nodes, steps) => (differs(nodes, bodyKey(steps),
  bodyKey([...steps, 'Block', 'result']))
  ? ['block\'s type is not its result\'s'] : []);

const recordProblems = (nodes, steps, fields) => {
  const record = nodes.get(bodyKey(steps))?.MRecord;
  const wanted = fields.map((field, index) => key({ Tuple: [field.name,
    nodes.get(bodyKey([...steps, 'RecordLiteral', 'fields', index,
      'value']))] }));
  return record === undefined || record[1].length !== 0
    || key(record[0].map(entry => key(entry))) !== key(wanted)
    ? ['record literal\'s fields are not its field values\' types'] : [];
};

const lambdaProblems = (nodes, steps, parameters) => {
  let found = nodes.get(bodyKey(steps));
  for (let index = 0; index < parameters.length; index += 1)
    found = found?.MArrow?.[2];
  return key(found) !== key(nodes.get(bodyKey([...steps, 'Lambda', 'body'])))
    ? ['lambda\'s result is not its body\'s type'] : [];
};

// Each route's problems at one node, and the count it adds to.
const routeOf = (nodes, steps, node) => {
  const name = nameOf(node);
  if (name === 'Block') return ['blocks', blockProblems(nodes, steps)];
  if (name === 'RecordLiteral')
    return ['fields', recordProblems(nodes, steps, node.value1)];
  if (name === 'Lambda')
    return ['lambdas', lambdaProblems(nodes, steps, node.value1)];
  return [null, []];
};

// The routes over one declaration's body: problems, and in `found` the
// blocks, record literals' fields and lambdas checked.
export const routeProblems = (at, decl, nodes, found) => {
  const problems = [];
  for (const { steps, node } of nodesOf(decl.body)) {
    const [route, here] = routeOf(nodes, steps, node);
    if (route === null) continue;
    found[route] += route === 'fields' ? node.value1.length : 1;
    problems.push(...here.map(text => `${at}: ${steps.join('/')}: ${text}`));
  }
  return problems;
};
