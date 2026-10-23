// RT1's translator: record expressions (T-R0b §3.3: E24-E28) and
// patterns (§3.4: P1-P7).
import { at, base, emit, eq, fresh, record, tvar, typed }
  from './r0-translator-context.mjs';
import { flush, instantiate } from './r0-translator-calls.mjs';
import { R, ownerType, translate } from './r0-translator-types.mjs';

const site = (path, rule, span) => ({ path, rule, span, kind: 'body' });

// E24: `{ l̄: τ̄ }`, the fields' entries only.
const literal = (cx, e, path, env) => record(e.value1.map((field, index) =>
  [field.name, cx.expr(cx, field.value,
    at(path, 'RecordLiteral', 'fields', index, 'value'), env)]), []);

// E25: per spread `j` (from 1), `eq τ_{s_j} { ...⟨p, spread j⟩ }` at the
// item's span; then `eq ⟨p, res⟩ { l̄: τ̄, ...spreads }`.
const extension = (cx, e, path, env) => {
  const here = site(path, 'E25', e.value0);
  const res = fresh(cx, here, 'res', 'type', { nodeType: path });
  const fields = [];
  const spreads = [];
  e.value1.forEach((item, index) => {
    const itemPath = at(path, 'RecordExtension', 'items', index);
    if (item instanceof R.Given) {
      fields.push([item.value0.name, cx.expr(cx, item.value0.value,
        at(itemPath, 'Given', 'value'), env)]);
      return;
    }
    if (!(item instanceof R.Spreading))
      throw new Error(`r0-translator: not a LiteralItem: ${String(item)}`);
    const type = cx.expr(cx, item.value1, at(itemPath, 'Spreading', 'value'),
      env);
    const spread = fresh(cx, here, { spread: spreads.length + 1 }, 'row',
      'auxiliary', item.value0);
    spreads.push(spread);
    emit(cx, here, 'b', 'B2', eq(type, record([], [spread])),
      { span: item.value0 });
  });
  emit(cx, here, 'b', 'B2', eq(tvar(res), record(fields, spreads)));
  return tvar(res);
};

// E26: `eq τ_e { l: ⟨p, field l⟩, ...⟨p, rest⟩ }` at the label's span.
const access = (cx, e, path, env) => {
  const here = site(path, 'E26', e.value0);
  const label = e.value2;
  const field = fresh(cx, here, { field: label.name }, 'type',
    { nodeType: path }, label.span);
  const rest = fresh(cx, here, 'rest', 'row', 'auxiliary');
  const type = cx.expr(cx, e.value1, at(path, 'FieldAccess', 'record'), env);
  emit(cx, here, 'b', 'B4', eq(type,
    record([[label.name, tvar(field)]], [rest])), { span: label.span });
  return tvar(field);
};

// E27: per field, `eq τ_e { l: ⟨p, upd l⟩, ...⟨p, updrest l⟩ }` and
// `eq τ_{e_l} ⟨p, upd l⟩`, at the field's span.
const update = (cx, e, path, env) => {
  const here = site(path, 'E27', e.value0);
  const type = cx.expr(cx, e.value1, at(path, 'RecordUpdate', 'record'), env);
  e.value2.forEach((field, index) => {
    const value = cx.expr(cx, field.value,
      at(path, 'RecordUpdate', 'fields', index, 'value'), env);
    const upd = fresh(cx, here, { upd: field.name }, 'type', 'auxiliary',
      field.span);
    const rest = fresh(cx, here, { updrest: field.name }, 'row', 'auxiliary',
      field.span);
    const span = { span: field.span };
    emit(cx, here, 'b', 'B7', eq(type,
      record([[field.name, tvar(upd)]], [rest])), span);
    emit(cx, here, 'b', 'B7', eq(value, tvar(upd)), span);
  });
  return type;
};

// E28: `eq τ_e { l̄: ⟨p, field l⟩, ...⟨p, rest⟩ }`; the result `{ ...ρ }`.
const removal = (cx, e, path, env) => {
  const here = site(path, 'E28', e.value0);
  const type = cx.expr(cx, e.value1, at(path, 'RecordRemoval', 'record'),
    env);
  const fields = e.value2.map(label => [label.name, tvar(fresh(cx, here,
    { field: label.name }, 'type', 'auxiliary', label.span))]);
  const rest = fresh(cx, here, 'rest', 'row', 'auxiliary');
  emit(cx, here, 'b', 'B8', eq(type, record(fields, [rest])));
  return record([], [rest]);
};

export const recordRules = [[R.RecordLiteral, literal],
  [R.RecordExtension, extension], [R.FieldAccess, access],
  [R.RecordUpdate, update], [R.RecordRemoval, removal]];

// P4: `eq τ_s θ(owner(args))`; sub-pattern `k` against θ(⟦field_k⟧).
const ctorPattern = (cx, p, path, scrutinee, env) => {
  const here = { path, rule: 'P4', span: p.value0, kind: 'body' };
  const ctor = cx.program.ctors[p.value1];
  const { naming } = instantiate(cx, here,
    cx.program.types[ctor.owner].sorts);
  const marks = [];
  emit(cx, here, 'b', 'B1',
    eq(scrutinee, ownerType(cx.program, ctor.owner, naming, marks)));
  let bound = env;
  p.value2.forEach((sub, index) => {
    const field = translate(cx.program, ctor.fields[index], naming, marks);
    bound = pattern(cx, sub, at(path, 'Ctor', 'args', index), field, bound);
  });
  flush(cx, here, marks, 'inst');
  return bound;
};

// How a record pattern ends picks its rule; no catch-all (Rest has
// three constructors).
const restRule = rest => {
  if (rest instanceof R.NoRest) return 'P5';
  if (rest instanceof R.IgnoredRest) return 'P6';
  if (rest instanceof R.NamedRest) return 'P7';
  throw new Error(`r0-translator: not a Rest: ${String(rest)}`);
};

// P5-P7: `eq τ_s { l̄: ⟨p, field l⟩ }` closed (P5), open with
// `⟨p, rest⟩` (P6, P7); P7 binds `x ↦ { ...⟨p, rest⟩ }`.
const recordPattern = (cx, p, path, scrutinee, env) => {
  const rest = p.value2;
  const rule = restRule(rest);
  const here = site(path, rule, p.value0);
  const subs = p.value1.map((field, index) => {
    const subPath = at(path, 'Record', 'fields', index, 'pattern');
    return { field, subPath, variable: fresh(cx, here,
      { field: field.label }, 'type', { patternType: subPath }, field.span) };
  });
  const tail = rule === 'P5' ? [] : [fresh(cx, here, 'rest', 'row',
    rule === 'P7' ? { restType: path } : 'auxiliary')];
  emit(cx, here, 'b', { P5: 'B12', P6: 'B11', P7: 'B10' }[rule],
    eq(scrutinee, record(subs.map(sub =>
      [sub.field.label, tvar(sub.variable)]), tail)));
  let bound = env;
  subs.forEach(sub => {
    bound = pattern(cx, sub.field.pattern, sub.subPath, tvar(sub.variable),
      bound);
  });
  if (rule !== 'P7') return bound;
  return new Map(bound).set(rest.value0, record([], tail));
};

const literalPattern = type => (cx, p, path, scrutinee, env) => {
  emit(cx, site(path, 'P3', p.value0), 'b', 'B1', eq(scrutinee, type));
  return env;
};

const patternRules = [
  [R.Wildcard, (cx, p, path, scrutinee, env) => env],
  [R.Bind, (cx, p, path, scrutinee, env) =>
    new Map(env).set(p.value1, scrutinee)],
  [R.IntLit, literalPattern(base('Int'))],
  [R.BoolLit, literalPattern(base('Bool'))],
  [R.Ctor, ctorPattern], [R.Record, recordPattern]];

// `Γ ⊢_p P : τ_s ⇝ Γ'`; the pattern's type in `types` is `τ_s`.
export const pattern = (cx, p, path, scrutinee, env) => {
  const found = patternRules.find(([shape]) => p instanceof shape);
  if (!found) throw new Error(`r0-translator: not a Pattern: ${String(p)}`);
  typed(cx, path, scrutinee);
  return found[1](cx, p, path, scrutinee, env);
};

export const patternShapes = patternRules.map(([shape]) => shape);
