// The expression reader of the FX001 reference interpreter: patterns,
// lambdas, application, pipes, `match`, `if`, blocks, `handler`, `with`,
// `handle`, `defer`, Text, qualified operations (`Effect.op`, applied
// like any value) and records: a literal is a primary; call, access and
// update are postfix, left to right; a pattern may be a record's.
// `expressions(reader)` returns { expression, parameter, readType }.
// Shares no code with the compiler.
import { cursor, isUpper, typeReader } from './fx-oracle-lex.mjs';
import { withoutMarks } from './fx-oracle-marks.mjs';
import { textNode } from './fx-oracle-text.mjs';
import {
  literalAhead, readFields, readRecordPattern, updateAhead
} from './fx-oracle-records.mjs';
import { unit } from './poly-parse.mjs';

const unitNode = { tag: 'value', value: unit };
const operators = ['==', '!=', '<', '<=', '>', '>='];
const hole = tokens => expressions(cursor(withoutMarks(tokens)))
  .expression();
export const expressions = reader => {
  const { peek, take, list } = reader;
  const readType = typeReader(reader);
  const pattern = () => {
    const next = take();
    if (next.kind === 'int') return { tag: 'literal', value: next.value };
    if (next.text === 'true' || next.text === 'false') {
      return { tag: 'literal', value: next.text === 'true' };
    }
    if (next.text === '_') return { tag: 'wildcard' };
    if (next.text === '{') return readRecordPattern(reader, pattern);
    if (!isUpper(next.text)) return { tag: 'bind', name: next.text };
    const fields = peek('(') ? (take('('), list(pattern, ')')) : [];
    return { tag: 'ctor', name: next.text, fields };
  };
  const arm = () => {
    const matched = pattern();
    take('=>');
    return { pattern: matched, body: expression() };
  };
  const parameter = () => {
    const name = take().text;
    if (peek(':')) { take(':'); readType(); }
    return name === '_' ? null : name;
  };
  const lambda = () => {
    take('fn');
    take('(');
    const parameters = peek(')') ? (take(')'), []) : list(parameter, ')');
    take('=>');
    return { tag: 'lambda', parameters, body: expression() };
  };
  const postfix = node => {
    if (peek('.')) {
      take('.'); return { tag: 'access', base: node, label: take().text }; }
    if (updateAhead(reader)) {
      take('{');
      return { tag: 'update', base: node,
        fields: readFields(reader, '=', expression) };
    }
    take('(');
    const args = peek(')') ? (take(')'), []) : list(expression, ')');
    return { tag: 'applyValue', callee: node, args };
  };
  const atom = () => {
    let node = primary();
    while (peek('(') || peek('.') || updateAhead(reader)) node = postfix(node);
    return node;
  };
  const primary = () => {
    if (literalAhead(reader)) {
      take('{');
      return { tag: 'record', fields: readFields(reader, ':', expression) };
    }
    const next = take();
    if (next.kind === 'int') return { tag: 'value', value: next.value };
    if (next.kind === 'text') return textNode(next, hole);
    if (next.text === 'true' || next.text === 'false') {
      return { tag: 'value', value: next.text === 'true' };
    }
    if (next.text === '(' && peek(')')) { take(')'); return unitNode; }
    if (next.text === '(') {
      const inner = expression();
      take(')');
      return inner;
    }
    if (isUpper(next.text) && peek('.')) {
      take('.');
      return { tag: 'qualified', effect: next.text, name: take().text };
    }
    if (!peek('(')) {
      return isUpper(next.text) ? { tag: 'apply', name: next.text, args: [] }
        : { tag: 'local', name: next.text };
    }
    take('(');
    const args = peek(')') ? (take(')'), []) : list(expression, ')');
    return { tag: 'apply', name: next.text, args };
  };
  const addition = () => {
    let left = atom();
    while (peek('+') || peek('++')) {
      const tag = take().text === '+' ? 'add' : 'concat';
      left = { tag, left, right: atom() };
    }
    return left;
  };
  const comparison = () => {
    const left = addition();
    if (!operators.some(operator => peek(operator))) return left;
    const operator = take().text;
    return { tag: 'compare', operator, left, right: addition() };
  };
  const pipeline = () => {
    let left = comparison();
    while (peek('|>')) {
      take('|>');
      left = { tag: 'pipe', left, right: comparison() };
    }
    return left;
  };
  const item = () => {
    if (peek('defer')) {
      take('defer'); return { tag: 'defer', value: expression() }; }
    if (!peek('let')) return { tag: 'discard', value: expression() };
    take('let');
    const name = take().text;
    take('=');
    return { tag: 'let', name: name === '_' ? null : name,
      value: expression() };
  };
  const block = () => {
    take('{');
    if (peek('}')) { take('}'); return unitNode; }
    const items = [];
    for (;;) {
      const found = item();
      if (!peek(';')) {
        take('}');
        if (found.tag !== 'discard') throw new Error('oracle: expected ;');
        return { tag: 'block', items, value: found.value };
      }
      take(';');
      items.push(found);
      if (peek('}')) {
        take('}');
        return { tag: 'block', items, value: unitNode };
      }
    }
  };
  const handlerClause = () => {
    const name = take().text;
    take('(');
    const parameters = peek(')') ? (take(')'), []) : list(parameter, ')');
    take('=>');
    return { name, parameters, body: expression() };
  };
  const failClause = () => {
    take('fail');
    take('(');
    const name = take().text;
    take(':');
    const head = readType().head;
    take(')');
    take('=>');
    return { head, name, body: expression() };
  };
  const expression = () => {
    if (peek('{') && !literalAhead(reader)) return block();
    if (peek('fn')) return lambda();
    if (peek('handler')) {
      take('handler');
      const effect = readType().head;
      take('{');
      return { tag: 'handler', effect, clauses: list(handlerClause, '}') };
    }
    if (peek('with')) {
      take('with');
      const handler = expression();
      return { tag: 'with', handler, body: block() };
    }
    if (peek('handle')) {
      take('handle');
      const body = expression();
      take('{');
      return { tag: 'handle', body, clauses: list(failClause, '}') };
    }
    if (peek('if')) {
      take('if');
      const condition = expression();
      take('then');
      const yes = expression();
      take('else');
      return { tag: 'if', condition, yes, no: expression() };
    }
    if (!peek('match')) return pipeline();
    take('match');
    const scrutinee = expression();
    take('{');
    return { tag: 'match', scrutinee, arms: list(arm, '}') };
  };
  return { expression, parameter, readType };
};
