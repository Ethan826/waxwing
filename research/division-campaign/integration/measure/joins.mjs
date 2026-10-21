// Resolve at 77e0fa3 refuses a record literal with two spreads
// (Resolve/Record.purs `singleSpread`); Task 7 is unmerged. So that the
// fixtures written with `{ ...a, ...b }` can be measured at all, each such
// literal is rewritten, on the parsed program, into one spread of calls
// to a declared join:
//
//   fn wxJoin(a: { ...r }, b: { ...s }): { ...r, ...s }
//     where r disjoint s = wxJoin(a, b);
//
// `{ x: e, ...a, ...b, ...c }` becomes `{ x: e, ...wxJoin(wxJoin(a, b),
// c) }`. A call writes the same labels as the literal and the same rigid
// rows; it adds two fresh row metas and one apart pair per join. The
// rewritten functions are flagged in the results.
export const joinSource = `fn wxJoin(a: { ...r }, b: { ...s }): { ...r, ...s }
  where r disjoint s = wxJoin(a, b);
fn main(): Int = 0;
`;

const kind = value => value?.constructor?.name;

export const rewriter = ({ Call, Spreading, RecordExtension }) => {
  let count = 0;
  const rebuilt = node => {
    if (Array.isArray(node)) return node.map(rebuilt);
    if (node === null || typeof node !== 'object') return node;
    if (kind(node) === 'RecordExtension') return extension(node);
    for (const key of Object.keys(node)) node[key] = rebuilt(node[key]);
    return node;
  };
  const extension = node => {
    const items = node.value1.map(item => {
      if (kind(item) === 'Spreading') item.value1 = rebuilt(item.value1);
      else item.value0.value = rebuilt(item.value0.value);
      return item;
    });
    const spreads = items.filter(item => kind(item) === 'Spreading');
    if (spreads.length < 2) return new RecordExtension(node.value0, items);
    count += spreads.length - 1;
    const joined = spreads.slice(1).reduce((left, item) =>
      new Call(item.value0, 'wxJoin', [left, item.value1]), spreads[0].value1);
    const given = items.filter(item => kind(item) !== 'Spreading');
    return new RecordExtension(node.value0,
      [...given, new Spreading(spreads[0].value0, joined)]);
  };
  return program => {
    count = 0;
    program.functions.forEach(fn => { fn.body = rebuilt(fn.body); });
    return count;
  };
};
