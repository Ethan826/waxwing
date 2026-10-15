// The surface syntax for the FX001 reference interpreter: the language of
// test/poly-parse.mjs plus effect declarations and the expressions of
// test/fx-oracle-expr.mjs. Returns { ctors, fields, types (by name), owner
// (constructor → type), functions (with their own row), effects
// (effect → operation → arity) }. Operation names are never global. Types
// are read into trees (test/fx-oracle-lex.mjs) and mostly dropped. Shares
// no code with the compiler.
import { cursor, tokenize } from './fx-oracle-lex.mjs';
import { expressions } from './fx-oracle-expr.mjs';
import { withoutMarks } from './fx-oracle-marks.mjs';
import { openRecord } from './fx-oracle-records.mjs';

export const parseProgram = source => {
  const reader = cursor(withoutMarks(tokenize(source)));
  const { peek, take, list } = reader;
  const { expression, readType } = expressions(reader);
  const program = { ctors: new Map(), fields: new Map(), types: new Map(),
    owner: new Map(), functions: new Map(), effects: new Map() };
  // [name, type]; a function over an open record is generic in its rest.
  const typed = () => {
    const name = take().text;
    take(':');
    return [name, readType()];
  };
  const parameters = () => (peek(')') ? (take(')'), []) : list(typed, ')'));
  const constructor = (type, position) => {
    const name = take().text;
    const fields = peek('(') ? (take('('), list(readType, ')')) : [];
    program.fields.set(name, fields.length);
    program.ctors.set(name, position);
    type.ctors.push({ name, fields });
    program.owner.set(name, type);
  };
  const typeDeclaration = () => {
    take('type');
    const head = readType();
    take('=');
    const type = { name: head.head, params: head.args.map(arg => arg.head),
      ctors: [] };
    program.types.set(type.name, type);
    constructor(type, 0);
    for (let position = 1; peek('|'); position++) {
      take('|'); constructor(type, position); }
  };
  const operation = effect => {
    take('fn');
    const name = take().text;
    take('(');
    const count = parameters().length;
    take(':');
    readType();
    take(';');
    program.effects.get(effect).set(name, count);
  };
  const effectDeclaration = () => {
    take('effect');
    const effect = readType().head;
    program.effects.set(effect, new Map());
    take('{');
    while (!peek('}')) operation(effect);
    take('}');
  };
  const functionDeclaration = () => {
    take('fn');
    const name = take().text;
    take('(');
    const params = parameters();
    take(':');
    const { row = [] } = readType();
    take('=');
    program.functions.set(name, { parameters: params.map(([param]) => param),
      generic: params.some(([, type]) => openRecord(type)), row,
      body: expression() });
  };
  while (!reader.done()) {
    if (peek('type')) typeDeclaration();
    else if (peek('effect')) effectDeclaration();
    else functionDeclaration();
    take(';');
  }
  return program;
};
