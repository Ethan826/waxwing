// RT4's hand notation (T-R0b §9 item 4; R0 tranche Task 3.4): one
// atom of translation.md §5's notation, read into test/r0-canonical.mjs's
// canonical form, a flexible variable as `{ flex: name }`. Test-only.
//
// Notation: `T = U`, `r lacks l`, `r # s`, `ff`; types `Int`, `Bool`,
// `Text`, `Unit`, a name, `(A, B) -> C` or `A -> B`, and records
// `{ l: T, r, ...s }` (a bare name in a record is a tail). A name is
// rigid when `rigid` maps it (the declaration's variables), else
// flexible.
const bases = ['Int', 'Bool', 'Text', 'Unit'];
const tokens = text =>
  text.match(/->|[A-Za-zα-ω_][\w'α-ω]*|\.\.\.|\S/gu);

// One atom of the notation, its rigid names read through `rigid`.
export const atomOf = (text, rigid) => {
  const items = tokens(text);
  let at = 0;
  const peek = () => items[at];
  const take = want => {
    const found = items[at++];
    if (want !== undefined && found !== want)
      throw new Error(`${text}: expected ${want} at ${found}`);
    return found;
  };
  const variable = name => (rigid.has(name) ? { rigid: rigid.get(name) }
    : { flex: name });
  const record = () => {
    const fields = []; const tails = [];
    take('{');
    while (peek() !== '}') {
      if (peek() === '...') take('...');
      const name = take();
      if (peek() === ':') { take(':'); fields.push([name, type()]); }
      else tails.push(variable(name));
      if (peek() === ',') take(',');
    }
    take('}');
    return { record: { fields, tails } };
  };
  const simple = () => {
    if (peek() === '{') return record();
    if (peek() === '(') {
      take('(');
      const params = [];
      while (peek() !== ')') {
        params.push(type());
        if (peek() === ',') take(',');
      }
      take(')'); take('->');
      return { fun: { params, result: type() } };
    }
    const name = take();
    return bases.includes(name) ? { base: name } : { tvar: variable(name) };
  };
  const type = () => {
    const left = simple();
    if (peek() !== '->') return left;
    take('->');
    return { fun: { params: [left], result: type() } };
  };
  if (text === 'ff') return 'ff';
  if (items[1] === 'lacks') return { lacks: [variable(items[0]), items[2]] };
  if (items[1] === '#')
    return { disjoint: [variable(items[0]), variable(items[2])] };
  const left = type(); take('='); const right = type();
  return { eq: [left, right] };
};
