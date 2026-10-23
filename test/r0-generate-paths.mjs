// RT6's resolver (T-R0b §9 item 6): a recorded path, read back to the
// resolved node it names, with that node's span. Paths are T-R0b §6's:
// from the body, a constructor's name, its field and, for an array, an
// index; inside an arm, clause or field record, the record's field (or,
// for a block or extension item, the item's form, then `value`).
// Signature roots: `constraints/i`, `parameters/i`,
// `parameters/variables/i`, `result`, `result/row`, `joined/i`. This
// reads the compiled resolved syntax (value0 … valueN, in
// Domain/Resolved.purs's declaration order) independently of Task 3.2's
// code.

const { typeRefSpan } = await import('../output/Domain.Syntax/index.js');

// [constructor, field] → the constructor's argument holding it.
const fieldsOf = {
  Call: { args: 2 }, Construct: { args: 2 }, Add: { left: 1, right: 2 },
  Concat: { left: 1, right: 2 }, Interpolate: { parts: 1 },
  Compare: { left: 2, right: 3 },
  If: { condition: 1, then: 2, else: 3 },
  Match: { scrutinee: 1, arms: 2 }, Lambda: { body: 2 },
  Apply: { function: 1, args: 2 }, Pipe: { left: 1, right: 2 },
  Block: { items: 1, result: 2 }, Perform: { args: 3 },
  Print: { args: 1 }, Show: { args: 1 }, Crash: { args: 1 },
  Handler: { clauses: 2 }, With: { handler: 1, body: 2 },
  Handle: { body: 1, clauses: 2 }, Fail: { payload: 2 },
  RecordLiteral: { fields: 1 }, FieldAccess: { record: 1 },
  RecordUpdate: { record: 1, fields: 2 }, RecordExtension: { items: 1 },
  RecordRemoval: { record: 1 },
  // patterns
  Ctor: { args: 2 }, Record: { fields: 1 },
  // block and extension items: the item's value
  Let: { value: 2 }, Defer: { value: 1 }, Discard: { value: 0 },
  Given: { value: 0 }, Spreading: { value: 1 }
};

// A constructor's name; purs prefixes `$$` to one a JS global shadows
// (`Boolean`).
export const nameOf = node => node?.constructor?.name?.replace(/^\$\$/, '');

const spanOf = node => node.value0?.start !== undefined ? node.value0
  : node.span;

// The node at `steps` below `node`, or a thrown description.
const walk = (node, steps) => {
  let at = node;
  for (let index = 0; index < steps.length; index += 1) {
    const step = steps[index];
    if (Array.isArray(at)) { at = at[step]; continue; }
    const name = nameOf(at);
    if (name in fieldsOf && step === name) {
      const field = steps[index + 1];
      const slot = fieldsOf[name][field];
      if (slot === undefined) throw new Error(`${name} has no ${field}`);
      at = at[`value${slot}`];
      // `Given` holds a field record; its value is the expression.
      if (name === 'Given') at = at.value;
      index += 1;
      continue;
    }
    if (typeof step === 'string' && at && step in at) {
      at = at[step];
      continue;
    }
    throw new Error(`cannot read ${JSON.stringify(steps)} at ${step}`);
  }
  if (at === undefined) throw new Error(`no node at ${JSON.stringify(steps)}`);
  return at;
};

const maybeSpan = (found, otherwise) =>
  found.constructor.name === 'Just' ? found.value0 : otherwise;

// The span of the node a path names in declaration `decl`.
export const spanAt = (decl, path) => {
  const { root, steps } = path;
  if (root === 'body') return spanOf(walk(decl.body, steps));
  if (root === 'constraints') return decl.constraints[steps[0]].value0.span;
  if (root === 'joined') return decl.joined[steps[0]].span;
  if (root === 'parameters')
    return steps[0] === 'variables' ? decl.span
      : decl.parameters[steps[0]].span;
  // The written result type's span, from the resolved syntax: `syntax`
  // holds the parameters' types, then the result's (Resolved.purs).
  if (root === 'result')
    return steps[0] === 'row' ? maybeSpan(decl.rowSpan, decl.span)
      : typeRefSpan(decl.syntax[decl.parameters.length]);
  throw new Error(`unknown root ${root}`);
};

// The node itself (an expression, pattern or item), for a body path.
export const nodeAt = (decl, steps) => walk(decl.body, steps);

const before = (a, b) => a.offset <= b.offset;
export const within = (inner, outer) => before(outer.start, inner.start)
  && before(inner.end, outer.end);
export const sameSpan = (a, b) => a.start.offset === b.start.offset
  && a.end.offset === b.end.offset;

const isNode = value => value !== null && typeof value === 'object'
  && (nameOf(value) in fieldsOf || nameOf(value) in leaves);
const leaves = { Integer: 1, Boolean: 1, Local: 1, FunctionRef: 1, CtorRef: 1,
    UnitValue: 1, OperationRef: 1, PrintRef: 1, ShowRef: 1, CrashRef: 1,
  TextLiteral: 1, Wildcard: 1, Bind: 1, IntLit: 1, BoolLit: 1 };

// Every node of a body (expressions, patterns and block or extension
// items) with its path's steps, in pre-order.
export const nodesOf = body => {
  const found = [];
  const visit = (node, steps) => {
    found.push({ steps, node });
    const name = nameOf(node);
    for (const [field, slot] of Object.entries(fieldsOf[name] ?? {})) {
      let value = node[`value${slot}`];
      if (name === 'Given') value = value.value;
      const here = [...steps, name, field];
      if (isNode(value)) { visit(value, here); continue; }
      if (!Array.isArray(value)) continue;
      value.forEach((item, index) => {
        if (isNode(item)) { visit(item, [...here, index]); return; }
        for (const part of ['pattern', 'body', 'value'])
          if (isNode(item[part])) visit(item[part], [...here, index, part]);
      });
    }
  };
  visit(body, []);
  return found;
};
