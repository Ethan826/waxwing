// Support for Task 4.3's tests of the online strategy (T-R0a §4.2) and
// its read-back (T-R0b §5.3): programs and problems from source, the
// production `online`, `shadowChecking` and `shadowDecisions`, and a
// candidate's σ in canonical form (test/r0-canonical.mjs). `onlineFrom`
// takes a loader and loads nothing itself, so a regression probe reads
// the clone's output only (`context.compilerPath`).
import { canonicalOf } from './r0-canonical.mjs';
import { decodePath, decodeType, decodeVar }
  from './r0-canonical-decode.mjs';
import { stableStringify } from './r0-canonical.mjs';

export const budget = { fuel: 5, depth: 1000, keys: 10000 };

export const onlineFrom = async load => {
  const { parse } = await load('Format.Parse');
  const { resolve } = await load('Features.Resolve');
  const { generationInputs } = await load('Features.Check.Generate.Inputs');
  const { generate } = await load('Features.Check.Generate');
  const { functional } = await load('Features.Check.Functional');
  const { checkProgram } = await load('Features.Check.Outcomes');
  const Online = await load('Features.Check.Strategy.Online');
  const Shadow = await load('Features.Check.Decide.Shadow');
  const Substitution = await load('Features.Check.Strategy.Substitution');
  const Walk = await load('Features.Check.Strategy.ReadBack.Walk');
  const { readType } = await load('Features.Check.Strategy.ReadBack.Type');
  const { typeOf } = await load('Domain.Checked.Internal');
  const { fields } = await load('Domain.Recorded');
  const Map = await load('Data.Map.Internal');
  const { unfoldableArray } = await load('Data.Unfoldable');

  const right = (result, phase) => {
    if (result.constructor.name !== 'Right')
      throw new Error(`${phase} refused`);
    return result.value0;
  };
  const programOf = source =>
    right(resolve(right(parse(source), 'parse')), 'resolve');
  const declOf = (program, name) => {
    const found = program.functions.find(decl => decl.name === name);
    if (found === undefined) throw new Error(`no declaration ${name}`);
    return found;
  };
  const problemOf = (program, name) => {
    const inputs = generationInputs(program);
    return right(generate(inputs.tables)(inputs.signatures)(
      declOf(program, name)), `generation of ${name}`);
  };
  const contextOf = program => ({ holders: functional(program.ctors),
    program });
  const search = (program, problem) =>
    Online.onlineSearch(contextOf(program))(budget)(problem);
  const todayOf = (program, name) => checkProgram(program).outcomes[
    program.functions.indexOf(declOf(program, name))].today;
  const pairs = map => Map.toUnfoldable(unfoldableArray)(map)
    .map(pair => [pair.value0, pair.value1]);
  // σ as canonical [variable, type] pairs, ordered as Data.Map yields.
  const sigmaOf = substitution => pairs(substitution)
    .map(([variable, ty]) => [decodeVar(variable), decodeType(ty)]);
  const check = (problem, substitution) =>
    Substitution.checkSubstitution(problem)(substitution);
  const decisions = program => Shadow.shadowDecisions(budget)(program);
  const decisionOf = (program, name) =>
    decisions(program)[program.functions.indexOf(declOf(program, name))];
  // Criterion 2's position check: at every body path `types` records,
  // the checked declaration has a node, and σ(types(p)) is that node's
  // settled type, read back (holes as the read-back settles them). A
  // finding names the path and what differs.
  const typeFindings = (problem, certificate) => {
    const sigma = sigmaMap(sigmaOf(certificate.substitution));
    const body = new Walk.AtExpr(certificate.checked.body);
    return pairs(fields(problem).types).flatMap(([path, ty]) => {
      if (path.root.constructor.name !== 'InBody') return [];
      const found = Walk.nodeAt(body)(path.steps);
      const where = JSON.stringify(decodePath(path).steps);
      if (found.constructor.name !== 'Just') return [`no node at ${where}`];
      const node = found.value0;
      const settled = settle(decodeType(readType(
        node instanceof Walk.AtExpr ? typeOf(node.value0)
          : node.value0.value0.ty)));
      return same(under(sigma, decodeType(ty)), settled) ? []
        : [`${where}: ${stableStringify(under(sigma, decodeType(ty)))}`
          + ` against ${stableStringify(settled)}`];
    });
  };
  return { programOf, declOf, problemOf, contextOf, search, todayOf,
    sigmaOf, check, decisions, decisionOf, canonicalOf, pairs, Online,
    Shadow, Map, typeFindings };
};

// σ in canonical form keyed by the variable's stable text.
export const sigmaMap = sigma => new Map(sigma.map(([variable, ty]) =>
  [stableStringify(variable), ty]));

// A canonical type under σ, records merged and kept in canonical order
// (labels by code unit, tails by their stable text).
export const under = (sigma, ty) => {
  if ('base' in ty) return ty;
  if ('tvar' in ty) return sigma.get(stableStringify(ty.tvar)) ?? ty;
  if ('fun' in ty) return { fun: { params: ty.fun.params.map(part =>
    under(sigma, part)), result: under(sigma, ty.fun.result) } };
  if ('app' in ty) return { app: { head: ty.app.head,
    args: ty.app.args.map(part => under(sigma, part)) } };
  const fields = ty.record.fields.map(([label, value]) =>
    [label, under(sigma, value)]);
  const tails = [];
  for (const tail of ty.record.tails) {
    const image = sigma.get(stableStringify(tail));
    if (image === undefined) { tails.push(tail); continue; }
    fields.push(...image.record.fields);
    tails.push(...image.record.tails);
  }
  return recordOf(fields, tails);
};

export const recordOf = (fields, tails) => ({ record: {
  fields: [...fields].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
  tails: [...tails].sort((a, b) => {
    const [x, y] = [stableStringify(a), stableStringify(b)];
    return x < y ? -1 : x > y ? 1 : 0;
  }) } });

// The arrow spine as canonical JSON writes it: `result` never an arrow.
export const flat = ty => {
  if (!('fun' in ty)) return ty;
  const inner = flat(ty.fun.result);
  return 'fun' in inner ? { fun: { params: [...ty.fun.params,
    ...inner.fun.params], result: inner.fun.result } } : ty;
};

export const same = (one, other) =>
  stableStringify(normal(one)) === stableStringify(normal(other));

const normal = ty => {
  const found = flat(ty);
  if ('fun' in found) return { fun: { params: found.fun.params.map(normal),
    result: normal(found.fun.result) } };
  if ('app' in found) return { app: { head: found.app.head,
    args: found.app.args.map(normal) } };
  if ('record' in found) return recordOf(found.record.fields.map(
    ([label, value]) => [label, normal(value)]), found.record.tails);
  return found;
};

// The read-back's hole rule (ReadBack.purs step 4), written apart: a
// hole variable (`hole/n`, ReadBack.Type) is `Int`, a hole tail none.
const isHole = variable => 'fresh' in variable
  && variable.fresh.path.steps[0] === 'hole';
export const settle = ty => {
  if ('base' in ty) return ty;
  if ('tvar' in ty) return isHole(ty.tvar) ? { base: 'Int' } : ty;
  if ('fun' in ty) return { fun: { params: ty.fun.params.map(settle),
    result: settle(ty.fun.result) } };
  if ('app' in ty) return { app: { head: ty.app.head,
    args: ty.app.args.map(settle) } };
  return recordOf(ty.record.fields.map(([label, value]) =>
    [label, settle(value)]), ty.record.tails.filter(tail => !isHole(tail)));
};
