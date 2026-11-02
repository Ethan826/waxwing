// The live-value trace of design §C, as a research hook for the `trace`
// scratch copy (scratch.mjs wraps Check/Use.purs `functionUse` and
// `ctorUse`, Check/Operation.purs `operationUse`, and calls the hook in
// Check/Apply.purs `applyNext` and `applyValue` beside `consumeAt`).
// The hook only reads: it keeps the values the checker already built
// (the `Use` with its scheme base, the row each applied stage
// consumes) under the span where they were made, and returns the
// checker's own result unchanged. Raw meta numbers, before `holes`.
// Research only.
const spanKey = span => `${span.start.offset}-${span.end.offset}`;

// The callee's variable count and mark names, which fix the metas
// `declarationUse` allocates after the scheme base (instantiate, then
// instantiateMarks, then openedRow, then stages).
const calleeOf = (kind, args) => {
  const env = args[0];
  if (kind === 'function') {
    const found = env.functions[args[3]];
    return { variables: found.variables.length,
      markNames: found.markVariables };
  }
  if (kind === 'ctor') {
    const owner = env.ctors[args[3]].owner;
    return { variables: env.types[owner].variables.length, markNames: [] };
  }
  return { variables: env.effects[args[3]].parameters.length,
    markNames: [] };
};

export const trace = {
  entries: [],
  last: null,
  reset() { this.entries = []; },
  use(kind, args, result) {
    this.last = result;
    if (result.constructor.name !== 'Right') return true;
    const span = kind === 'operation' ? args[2] : args[2].span;
    this.entries.push({ site: 'use', kind, span: spanKey(span),
      owner: kind === 'operation' ? 'Operation'
        : args[2].kind.constructor.name,
      entryNext: args[1].next, use: result.value0.value,
      ...calleeOf(kind, args) });
    return true;
  },
  apply(span, argument, row) {
    this.entries.push({ site: 'apply', span: spanKey(span),
      argument: spanKey(argument), row });
    return true;
  },
  pipe(argument, row) {
    this.entries.push({ site: 'pipe', span: spanKey(argument), row });
    return true;
  }
};

globalThis.__t2 = trace;
