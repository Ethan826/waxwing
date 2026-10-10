// Handler types nested inside handler rows, `Handler(Log with S(Handler(
// Log with S(… Int))))` (FX008 Task 2 review C1): the type carries a clause
// row beside the inference row, and a pass that walked both as separate
// trees doubled its work per level.
export const nestingDepth = 40;

export const nested = depth => depth === 0 ? 'Int'
  : `Handler(Log with S(${nested(depth - 1)}))`;

export const nestedProgram = depth => 'effect Log { fn log(): Unit; }; '
  + 'effect S(a) { fn get(): a; }; '
  + `fn f(x: ${nested(depth)}): Int = 0; fn main(): Int = 0;`;

// The same type as a lambda parameter's annotation (Task 3): a local
// annotation gets a clause row of its own beside the inference row, once
// per type that is not itself inside a handler row.
export const lambdaProgram = depth => 'effect Log { fn log(): Unit; }; '
  + 'effect S(a) { fn get(): a; }; '
  + `fn main(): Int = { let f = fn(x: ${nested(depth)}) => 0; 0 };`;
