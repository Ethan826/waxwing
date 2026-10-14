// The surface syntax for the FX001 reference interpreter: the language of
// test/poly-parse.mjs plus effect declarations and the expressions of
// test/fx-oracle-expr.mjs. Returns { ctors, fields, types (by name), owner
// (constructor → type), functions, ops }. Types are read into trees
// (test/fx-oracle-lex.mjs) and mostly dropped. Shares no code with the
// compiler.
import { cursor, tokenize } from './fx-oracle-lex.mjs';
import { expressions } from './fx-oracle-expr.mjs';
import { withoutMarks } from './fx-oracle-marks.mjs';

export const parseProgram = source => {
  const reader = cursor(withoutMarks(tokenize(source)));
  const { peek, take, list } = reader;
  const { expression, readType } = expressions(reader);
  const program = { ctors: new Map(), fields: new Map(), types: new Map(),
    owner: new Map(), functions: new Map(), ops: new Map() };
  const typed = () => {
    const name = take().text;
    take(':');
    readType();
    return name;
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
    program.ops.set(name, { effect, arity: count });
  };
  const effectDeclaration = () => {
    take('effect');
    const effect = readType().head;
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
    readType();
    take('=');
    program.functions.set(name, { parameters: params, body: expression() });
  };
  while (!reader.done()) {
    if (peek('type')) typeDeclaration();
    else if (peek('effect')) effectDeclaration();
    else functionDeclaration();
    take(';');
  }
  return program;
};
