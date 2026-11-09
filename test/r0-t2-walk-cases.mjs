// `nodeAt` over hand-built checked bodies (dossier §18.163 (1)): invalid
// paths, array boundaries, the over-applied alias, and how many siblings
// a lookup reads. Shared by test/r0-t2-walk.test.mjs and the regression
// probe, so the width case runs against a build with the defect restored.
// Reads are counted on a Proxy: timing-free, and an eager `map` over the
// array reads every index.
export const walkCases = async load => {
  const Checked = await load('Domain.Checked.Internal');
  const Origin = await load('Domain.Recorded.Origin');
  const Walk = await load('Features.Check.Strategy.ReadBack.Walk');
  const { Just } = await load('Data.Maybe');
  const named = text => new Origin.Named(text);
  const index = number => new Origin.Index(number);
  const expr = node => new Checked.Expr({ ty: null, span: null, node });
  const leaf = number => expr(new Checked.Integer(number));
  const pattern = shape => new Checked.Pattern({ ty: null, span: null,
    shape });
  const read = (body, steps) => Walk.nodeAt(new Walk.AtExpr(body))(steps);
  const found = (body, steps) => {
    const result = read(body, steps);
    return result instanceof Just ? result.value0.value0 : undefined;
  };
  const parts = [leaf(0), leaf(1), leaf(2)];
  const text = expr(new Checked.Interpolate(parts));
  const at = [named('Interpolate'), named('parts')];
  const call = new Checked.Call(null, null, [leaf(10)]);
  const over = expr(new Checked.Apply(expr(call), [leaf(11), leaf(12)]));
  const callArgs = [named('Call'), named('args')];
  const applyArgs = [named('Apply'), named('args')];
  const arms = [{ pattern: pattern(new Checked.Bind(null)), body: leaf(20) }];
  const match = expr(new Checked.Match(leaf(21), arms));
  const armAt = [named('Match'), named('arms'), index(0)];
  const exact = (name, body, steps, expected) =>
    [name, found(body, steps) === expected, true];
  const none = (name, body, steps) =>
    [name, found(body, steps), undefined];
  return { read, leaf, expr, Checked, named, index, cases: [
    ['the empty path is the node', found(text, []) === text, true],
    exact('first item', text, [...at, index(0)], parts[0]),
    exact('last item', text, [...at, index(2)], parts[2]),
    none('one past the end', text, [...at, index(3)]),
    none('a negative index', text, [...at, index(-1)]),
    none('a label with no index', text, at),
    none('a name in place of an index', text, [...at, named('0')]),
    none('a step past a leaf', text, [...at, index(0), named('x')]),
    none('the wrong constructor', text, [named('Concat'), named('parts')]),
    none('the wrong field', text, [named('Interpolate'), named('args')]),
    exact('a part suffix', match, [...armAt, named('body')], arms[0].body),
    none('a missing part suffix', match, armAt),
    none('an unknown part suffix', match, [...armAt, named('value')]),
    exact('an Apply argument', over, [...applyArgs, index(1)], over.value0
      .node.value1[1]),
    exact('the alias: a supplied argument', over, [...callArgs, index(0)],
      call.value2[0]),
    exact('the alias: an extra argument', over, [...callArgs, index(2)],
      over.value0.node.value1[1]),
    none('the alias: past the end', over, [...callArgs, index(3)])
  ] };
};

const width = 2000;

// A body holding one wide array, read at its middle: index reads counted.
const counted = (values, make, steps) => {
  let reads = 0;
  const spy = new Proxy(values, { get: (target, key, receiver) => {
    if (typeof key === 'string' && /^[0-9]+$/.test(key)) reads += 1;
    return Reflect.get(target, key, receiver);
  } });
  return { body: make(spy), steps, reads: () => reads };
};

// Every helper that holds an array: `each`, `eachPart`, Block's and
// RecordExtension's own. One lookup reads one sibling.
export const widthCases = ({ read, leaf, expr, Checked, named, index }) => {
  const middle = index(width / 2);
  const leaves = Array.from({ length: width }, (_, at) => leaf(at));
  const fields = leaves.map(value => ({ value }));
  const given = fields.map(field => new Checked.Given(field));
  const items = leaves.map(value => new Checked.Discard(value));
  const shapes = {
    Interpolate: counted(leaves, spy => expr(new Checked.Interpolate(spy)),
      [named('Interpolate'), named('parts'), middle]),
    Call: counted(leaves, spy => expr(new Checked.Call(null, null, spy)),
      [named('Call'), named('args'), middle]),
    RecordLiteral: counted(fields, spy => expr(
      new Checked.RecordLiteral(spy)), [named('RecordLiteral'),
      named('fields'), middle, named('value')]),
    Block: counted(items, spy => expr(new Checked.Block(spy, leaf(0))),
      [named('Block'), named('items'), middle, named('Discard'),
        named('value')]),
    RecordExtension: counted(given, spy => expr(
      new Checked.RecordExtension(spy)), [named('RecordExtension'),
      named('items'), middle, named('Given'), named('value')])
  };
  return Object.entries(shapes).map(([name, shape]) => {
    const result = read(shape.body, shape.steps);
    return [name, result.constructor.name, shape.reads()];
  });
};

// The rows that differ, by name.
export const wrongWalkCases = async load => {
  const made = await walkCases(load);
  return made.cases.filter(([, value, expected]) => value !== expected)
    .map(([name]) => name);
};
export const wrongWidthCases = async load => widthCases(await walkCases(load))
  .filter(([, shown, reads]) => shown !== 'Just' || reads !== 1)
  .map(([name, shown, reads]) => `${name} ${shown} ${reads}`);
