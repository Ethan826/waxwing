// The Text scenario of the FX001 corpus (Text v1 design §5): Text in data,
// interpolation with effectful holes, `++`, comparisons (astral characters
// among them), `show`, and raw and block literals. A frame is a Unit block
// of Text items, sometimes under a Log or Tick handler so that holes
// perform user effects too. Fixed items guarantee the census; random ones
// vary the shapes. A hole is written when it is made, with the spelling
// of main (`ctx.spell`, test/fx-gen-names.mjs), where frames are placed.
import {
  call, cat, compare, doItem, letItem, lit, local, print, str, text,
  withHandler, block
} from './fx-gen-ast.mjs';
import {
  fresh, installed, intExpr, logHandler, tickHandler, unitExpr
} from './fx-gen-expr.mjs';
import { literal, randomStyle, randomText } from './text-literal-gen.mjs';

export const noteType = 'type Note = Note(Text, Int) | Blank; ';
const operators = ['==', '!=', '<', '<=', '>', '>='];
const show = value => call('show', [value], 'Text');
const blank = { k: 'lit', text: 'Blank', ty: 'Note' };

// A literal with `pieces`; a literal inside a hole stays on one line.
const literalOf = (ctx, pieces, flat) => {
  const style = randomStyle(ctx.r);
  const block = style.block && !flat;
  const filled = pieces.some(piece => piece !== '') ? pieces
    : [...pieces, 'x'];
  return str(literal(ctx.r, filled, { ...style, block }));
};
const plain = (ctx, st) => literalOf(ctx, [randomText(ctx.r, 6)], st.flat);

const hole = (ctx, depth, st) => {
  const inner = { ...st, flat: true };
  const value = textExpr(ctx, depth, inner);
  if (!ctx.r.chance(30)) return { hole: text(value, ctx.spell) };
  const effect = block([doItem(unitExpr(ctx, 1))], value);
  return { hole: text(effect, ctx.spell) };
};

const interpolated = (ctx, depth, st) => {
  const { r } = ctx;
  const pieces = [randomText(r, 4)];
  for (let count = 1 + r.int(3); count > 0; count--) {
    pieces.push(hole(ctx, depth, st), randomText(r, 4));
  }
  return literalOf(ctx, pieces, st.flat);
};

export const noteExpr = (ctx, depth, st) => (ctx.r.chance(20) ? blank
  : call('Note', [textExpr(ctx, depth, st), intExpr(ctx, 1)], 'Note'));

export const textExpr = (ctx, depth, st) => {
  const { r } = ctx;
  const options = [() => plain(ctx, st), () => show(intExpr(ctx, 1))];
  if (st.texts.length) options.push(() => local(r.pick(st.texts), 'Text'));
  if (depth > 0) {
    options.push(() => cat(textExpr(ctx, depth - 1, st),
      textExpr(ctx, depth - 1, st)),
    () => interpolated(ctx, depth - 1, st),
    () => interpolated(ctx, depth - 1, st),
    () => show(noteExpr(ctx, depth - 1, st)));
  }
  return r.pick(options)();
};

const arg = ctx => call('arg', [lit(ctx.r.number())], 'Int');

// Two effectful holes in one literal, so evaluation order is observable.
const ordered = (ctx, st) => {
  const { r } = ctx;
  const effect = block([doItem(print(lit(r.number())))], str('"x"'));
  return literalOf(ctx, [randomText(r, 3),
    { hole: text(show(arg(ctx)), ctx.spell) }, randomText(r, 3),
    { hole: text(effect, ctx.spell) }, randomText(r, 3)], st.flat);
};

// U+1F600 against a BMP scalar above the surrogates: UTF-16 order differs.
const trap = ctx => {
  const { r } = ctx;
  const high = r.pick(['�', '￿', '', '～']);
  const sides = [[r.pick(['\u{1f600}', '\u{10000}', '\u{10ffff}']) + 'a'],
    [high]].map(pieces => literalOf(ctx, pieces, false));
  const [left, right] = r.chance(50) ? sides : sides.reverse();
  return compare(r.pick(operators), left, right);
};

const randomItem = (ctx, st) => {
  const { r } = ctx;
  const note = () => noteExpr(ctx, 1, st);
  const phrase = () => textExpr(ctx, 2, st);
  const options = [() => print(phrase()), () => print(note()),
    () => print(show(note())),
    () => print(compare(r.pick(operators),
      phrase(), phrase())),
    () => print(compare(r.pick(operators), note(), note())),
    () => print(cat(phrase(), phrase())), () => phrase()];
  return doItem(r.pick(options)());
};

const frameBlock = ctx => {
  const { r } = ctx;
  const st = { texts: [], flat: false };
  const first = fresh(ctx, 't');
  const items = [letItem(first, ordered(ctx, st))];
  st.texts.push(first);
  const next = local(first, 'Text');
  items.push(doItem(print(cat(next, show(arg(ctx))))),
    doItem(print(call('Note', [next, lit(r.number())], 'Note'))),
    doItem(print(show(call('Note', [next, lit(0)], 'Note')))),
    doItem(print(trap(ctx))));
  for (let count = 2 + r.int(4); count > 0; count--) {
    if (r.chance(30)) {
      const name = fresh(ctx, 't');
      items.push(letItem(name, textExpr(ctx, 2, st)));
      st.texts.push(name);
    } else items.push(randomItem(ctx, st));
  }
  return block(items);
};

export const textFrame = ctx => {
  const label = ctx.r.pick([null, 'Log', 'Tick']);
  if (!label) return frameBlock(ctx);
  const make = label === 'Log' ? logHandler : tickHandler;
  return withHandler(make(ctx, 1), frameBlock(installed(ctx, label, 'plain')));
};
