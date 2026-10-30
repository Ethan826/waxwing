import { readdirSync, readFileSync } from 'node:fs';
import { parse } from 'acorn';

// Prints the routine test inventory: for every test/*.test.mjs that is not
// a *.perf.test.mjs file, each statically visible test (the source text of
// its first argument) and its assertion count (call sites of `assert` or
// `assert.<name>`, `t.assert.<name>` and `assert.rejects`). Used to compare
// routine coverage before and after the verification-contract split
// (docs/plans/2026-10-30-verification-contract-proposal.md).
//   node scripts/test-inventory.mjs            print the inventory
//   node scripts/test-inventory.mjs diff A B   compare two printed files
const testCalls = new Set(['test', 'it', 'describe', 'suite']);
const isNode = value => typeof value?.type === 'string';
const kids = node => Object.values(node).flatMap(value =>
  Array.isArray(value) ? value.filter(isNode) : isNode(value) ? [value] : []);
const rootName = callee => {
  if (callee.type === 'Identifier') return callee.name;
  return callee.type === 'MemberExpression' ? rootName(callee.object)
    : undefined;
};

const inspect = (source, text) => {
  const names = [];
  let assertions = 0;
  const visit = node => {
    if (node.type === 'CallExpression') {
      const root = rootName(node.callee);
      if (root === 'assert') assertions += 1;
      const direct = node.callee.type === 'Identifier'
        && testCalls.has(node.callee.name);
      const member = node.callee.type === 'MemberExpression'
        && node.callee.object.type === 'Identifier'
        && testCalls.has(node.callee.object.name)
        && ['skip', 'only', 'todo'].includes(node.callee.property.name);
      if ((direct || member) && node.arguments.length > 0)
        names.push(text.slice(node.arguments[0].start,
          node.arguments[0].end).replace(/\s+/g, ' '));
    }
    kids(node).forEach(visit);
  };
  visit(parse(source, { ecmaVersion: 'latest', sourceType: 'module' }));
  return { names, assertions };
};

export const inventory = () => readdirSync('test').filter(name =>
  name.endsWith('.test.mjs') && !name.endsWith('.perf.test.mjs')).sort()
  .map(name => {
    const text = readFileSync(`test/${name}`, 'utf8');
    return { file: `test/${name}`, ...inspect(text, text) };
  });

const print = () => inventory().forEach(({ file, names, assertions }) => {
  console.log(`${file}\tassertions ${assertions}`);
  names.forEach(name => console.log(`${file}\ttest ${name}`));
});

const lines = path => new Set(readFileSync(path, 'utf8').split('\n')
  .filter(line => line !== ''));
const diff = (before, after) => {
  const old = lines(before);
  const now = lines(after);
  const gone = [...old].filter(line => !now.has(line));
  const added = [...now].filter(line => !old.has(line));
  gone.forEach(line => console.log(`- ${line}`));
  added.forEach(line => console.log(`+ ${line}`));
  console.log(`before ${old.size} lines, after ${now.size}; ${gone.length} `
    + `only before, ${added.length} only after`);
};

if (process.argv[2] === 'diff') diff(process.argv[3], process.argv[4]);
else if (import.meta.url === `file://${process.argv[1]}`) print();
