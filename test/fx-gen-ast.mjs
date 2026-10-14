// Typed syntax trees of the generated FX001 programs, and their printer.
// Each node carries `ty` ('Int', 'Unit', 'Bool', 'Text', 'Note', 'Err',
// 'Oops' or 'fn'; a 'str' is a Text literal's finished source) so
// the shrinker can replace a subexpression by a literal of its type.
// Blocks are { items, value }: an item is { k: 'let' | 'do' | 'defer', ... };
// a null value makes the block Unit (printed with a trailing `;`).
export const lit = number => ({ k: 'lit', text: String(number), ty: 'Int' });
export const unit = { k: 'lit', text: '()', ty: 'Unit' };
export const truth = { k: 'lit', text: 'true', ty: 'Bool' };
export const local = (name, ty = 'Int') => ({ k: 'var', name, ty });
export const str = source => ({ k: 'str', text: source, ty: 'Text' });
export const cat = (left, right) => ({ k: 'cat', left, right, ty: 'Text' });
export const compare = (op, left, right) =>
  ({ k: 'cmp', op, left, right, ty: 'Bool' });
export const call = (name, args, ty) => ({ k: 'call', name, args, ty });
export const apply = (callee, args, ty) => ({ k: 'app', callee, args, ty });
export const add = (left, right) => ({ k: 'add', left, right, ty: 'Int' });
export const lambda = (params, body) => ({ k: 'lam', params, body, ty: 'fn' });
export const block = (items, value = null) =>
  ({ k: 'blk', items, value, ty: value?.ty ?? 'Unit' });
export const withHandler = (handler, body) =>
  ({ k: 'with', handler, body, ty: body.ty });
export const handler = (effect, clauses) =>
  ({ k: 'handler', effect, clauses, ty: 'handler' });
export const handle = (body, clauses) =>
  ({ k: 'handle', body, clauses, ty: clauses[0].body.ty });
export const match = (scrutinee, arms, ty) =>
  ({ k: 'match', scrutinee, arms, ty });

export const letItem = (name, value) => ({ k: 'let', name, value });
export const doItem = value => ({ k: 'do', value });
export const deferItem = value => ({ k: 'defer', value });

export const print = value => call('print', [value], 'Unit');
export const log = value => call('log', [value], 'Unit');
export const tick = value => call('tick', [value], 'Int');
export const crash = value => call('crash', [value], 'Unit');
export const fail = payload => call('fail', [payload], 'Unit');
export const err = number => (number < 0 ? call('Err2', [], 'Err')
  : call('Err1', [lit(number)], 'Err'));
export const oops = number => call('Oops', [lit(number)], 'Oops');

const atomic = node =>
  ['lit', 'var', 'call', 'app', 'str'].includes(node.k);
const bare = node => node.name;

// The source of `node`; `spell` names each call (test/fx-gen-names.mjs).
export const text = (node, spell = bare) => {
  const write = child => text(child, spell);
  const operand = child => (atomic(child) ? write(child) : `(${write(child)})`);
  const piece = item =>
    (item.k === 'let' ? `let ${item.name} = ${write(item.value)};`
    : `${item.k === 'defer' ? 'defer ' : ''}${write(item.value)};`);
  const body = block => [...block.items.map(piece),
    ...(block.value ? [write(block.value)] : [])].join(' ');
  const clause = ({ op, params, body: done }) =>
    `${op}(${params.join(', ')}) => ${write(done)}`;
  const failure = ({ family, name, body: done }) =>
    `fail(${name}: ${family}) => ${write(done)}`;
  const arm = ({ pattern, body: done }) => `${pattern} => ${write(done)}`;
  switch (node.k) {
    case 'lit': return node.text;
    case 'var': return node.name;
    case 'call': return node.args.length === 0 && /^[A-Z]/.test(node.name)
      ? node.name : `${spell(node)}(${node.args.map(write).join(', ')})`;
    case 'app': return `${node.callee.k === 'lam' ? `(${write(node.callee)})`
      : write(node.callee)}(${node.args.map(write).join(', ')})`;
    case 'add': return `${operand(node.left)} + ${operand(node.right)}`;
    case 'str': return node.text;
    case 'cat': return `${node.left.k === 'cat' ? write(node.left)
      : operand(node.left)} ++ ${operand(node.right)}`;
    case 'cmp': return `${operand(node.left)} ${node.op} `
      + `${operand(node.right)}`;
    case 'lam': return `fn(${node.params.join(', ')}) => ${write(node.body)}`;
    case 'blk': return body(node) === '' ? '{}' : `{ ${body(node)} }`;
    case 'with': return `with ${write(node.handler)} ${write(node.body)}`;
    case 'handler':
      return `handler ${node.effect} {`
        + ` ${node.clauses.map(clause).join(', ')} }`;
    case 'handle':
      return `handle ${write(node.body)} {`
        + ` ${node.clauses.map(failure).join(', ')} }`;
    case 'match':
      return `match ${write(node.scrutinee)} {`
        + ` ${node.arms.map(arm).join(', ')} }`;
    default: throw new Error(`unknown node ${node.k}`);
  }
};
