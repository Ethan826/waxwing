// Records in the FX001 reference interpreter (R001, records design §1,
// §3, §3a): reading record types, literals, accesses and updates, and
// evaluating them. A record value is { record: [[label, value], ...] } in
// sorted label order; a record type is { head, args, labels, tail }, its
// head the label set (a Fail family is keyed by it) and its args the field
// types in label order. The interpreter is untyped: it trusts the checker
// that labels are unique and present. Shares no code with the compiler.
import { OracleError } from './fx-oracle-cleanup.mjs';

export const isRecord = value => typeof value === 'object' && value !== null
  && Object.hasOwn(value, 'record');

const byLabel = ([left], [right]) => (left < right ? -1 : left > right ? 1
  : 0);
const sorted = entries => [...entries].sort(byLabel);

// The family key of a label set: no declared type can be spelt so.
export const labelSet = labels => `{${labels.join(', ')}}`;

// `{ l: T, ..., ...r }` after its `{`, as a type tree.
export const readRecordType = ({ peek, take, list }, type) => {
  let tail = null;
  const field = () => {
    if (peek('...')) { take('...'); tail = take().text; return null; }
    const label = take().text;
    take(':');
    return [label, type()];
  };
  const fields = sorted(list(field, '}').filter(Boolean));
  const labels = fields.map(([label]) => label);
  return { head: labelSet(labels), args: fields.map(([, tree]) => tree),
    labels, tail };
};

export const openRecord = tree => (tree.tail ?? null) !== null
  || tree.args.some(openRecord);

const lower = token => typeof token?.text === 'string'
  && /^[a-z_]/.test(token.text);
// `{` then a lowercase name, then `:` (a literal) or `=` (an update).
const opens = ({ ahead }, mark) => ahead(0)?.text === '{'
  && lower(ahead(1)) && ahead(2)?.text === mark;
export const literalAhead = reader => opens(reader, ':');
export const updateAhead = reader => opens(reader, '=');

// The fields of a literal or an update after its `{`: [label, node] in
// written order.
export const readFields = ({ take, list }, mark, expression) => {
  const field = () => {
    const label = take().text;
    take(mark);
    return [label, expression()];
  };
  return list(field, '}');
};

const fieldOf = (value, label) => {
  if (!isRecord(value)) throw new OracleError('a field of a non-record');
  const found = value.record.find(([name]) => name === label);
  if (!found) throw new OracleError(`no field ${label}`);
  return found[1];
};

// Each field, base and replacement is evaluated once, in written order.
export const evaluateRecord = (state, node, env, ctx) => {
  const { events, evaluate } = state;
  const values = fields => fields.map(([label, field]) =>
    [label, evaluate(field, env, ctx)]);
  if (node.tag === 'record') {
    events.add('record-literal');
    return { record: sorted(values(node.fields)) };
  }
  const base = evaluate(node.base, env, ctx);
  if (node.tag === 'access') {
    events.add('record-access');
    return fieldOf(base, node.label);
  }
  events.add('record-update');
  const replaced = new Map(values(node.fields));
  for (const label of replaced.keys()) fieldOf(base, label);
  return { record: base.record.map(([label, value]) =>
    [label, replaced.has(label) ? replaced.get(label) : value]) };
};

// Printing in nested-value form, and the structural order: fields in
// sorted label order, the first difference deciding.
export const recordText = (value, nested) => `{ ${value.record.map(
  ([label, field]) => `${label}: ${nested(field)}`).join(', ')} }`;

export const compareRecords = (left, right, compare) => {
  for (const [index, [, field]] of left.record.entries()) {
    const result = compare(field, right.record[index][1]);
    if (result !== 0) return result;
  }
  return 0;
};

export const recordType = (value, typeOf) => {
  const labels = value.record.map(([label]) => label);
  return { head: labelSet(labels), labels,
    args: value.record.map(([, field]) => typeOf(field)) };
};

export const recordTypeText = (type, typeText) => `{ ${type.labels.map(
  (label, index) => `${label}: ${typeText(type.args[index])}`)
  .join(', ')} }`;

// Whether a value has a record in it (the census of printed records).
export const holdsRecord = value => isRecord(value)
  || (Array.isArray(value?.fields) && value.fields.some(holdsRecord));
