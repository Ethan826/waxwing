// T2's comparison of one judged declaration (R0 Task 7.1b, D1 spec §10
// T2): `build`'s checked declaration against the online certificate's,
// effect-erased (test/r0-elab-erase.mjs). Exact when no variable is in
// `Amb`; otherwise the IR's structure, then each site
// (test/r0-elab-walk.mjs) whose recorded type or slots mention no `Amb`
// variable, the holes renumbered over the compared sites on each side,
// which is one hole bijection per declaration. An over-applied call's
// saturated node (`Inner`) counts as mentioning what any recorded type
// at or under its path mentions, an over-approximation that only
// excludes more.
import { canonicalOf } from './r0-canonical.mjs';
import { decodeType } from './r0-canonical-decode.mjs';
import { key, load, mentioned } from './r0-generate-support.mjs';
import { erasedDecl, erasedType, holeCount, renumbering, skeletonOf }
  from './r0-elab-erase.mjs';
import { siteKey, sitesOf } from './r0-elab-walk.mjs';

const Map = await load('Data.Map.Internal');
const { unfoldableArray } = await load('Data.Unfoldable');
const pairs = map => Map.toUnfoldable(unfoldableArray)(map)
  .map(pair => [pair.value0, pair.value1]);
const fresh = variable => 'fresh' in variable;

// `Amb` (§10 T2): the flexible variables in a record of some `types(p)`
// with two or more flexible tails (T-R0b §5.3's ambiguity criterion).
const ambOf = problem => {
  const found = new Set();
  const visit = ty => {
    if (ty === null || typeof ty !== 'object') return;
    if (Array.isArray(ty)) { ty.forEach(visit); return; }
    if ('record' in ty && ty.record.tails.filter(fresh).length > 1)
      mentioned(ty).filter(fresh).forEach(variable => found.add(key(variable)));
    Object.values(ty).forEach(visit);
  };
  problem.types.forEach(([, ty]) => visit(ty));
  return found;
};

// Each site's recorded type or variable, as canonical variables.
const recordedAt = (row, problem) => {
  const types = new globalThis.Map(problem.types.map(([path, ty]) =>
    [JSON.stringify([path.root === 'body' ? 'InBody' : path.root,
      ...path.steps]), ty]));
  const table = new globalThis.Map(pairs(row.elaborating.sites).map(
    ([site, ty]) => [siteKey(site), decodeType(ty)]));
  return found => {
    const [form, path, index] = JSON.parse(found.key);
    if (form === 'Slot') return [{ fresh: { path: { root: 'body',
      steps: path.slice(1) }, role: { inst: index } } }];
    if (form === 'NodeType' || form === 'PatternType')
      return mentioned(types.get(JSON.stringify(path)));
    if (form === 'Inner') return [...types.entries()].filter(([at]) =>
      at.startsWith(JSON.stringify(path).slice(0, -1)))
      .flatMap(([, ty]) => mentioned(ty));
    if (form === 'Static') return [];
    return mentioned(table.get(found.key));
  };
};

// The declaration's parameter and result types, which the skeleton
// leaves out: rigid copies of its signature on both sides, so compared
// in by-site mode too (7.1b review, Minor 4).
const signatureOf = decl => JSON.stringify(
  [...decl.parameters, decl.result].map(ty => erasedType(ty)));

// T2 for one judged row: its comparison, exact or by site, the sites
// excluded, and the holes today's IR holds (T8).
export const compareRow = (row, built) => {
  const today = row.certificate.checked;
  const problem = canonicalOf(row.problem);
  const amb = ambOf(problem);
  if (amb.size === 0) return { row, built, exact: true, excluded: 0,
    sites: 0, same: erasedDecl(built) === erasedDecl(today),
    holes: holeCount(today) };
  const mine = sitesOf(row.decl, built);
  const theirs = sitesOf(row.decl, today);
  const recorded = recordedAt(row, problem);
  const [one, other] = [renumbering(), renumbering()];
  let excluded = 0;
  let sites = 0;
  const same = skeletonOf(built) === skeletonOf(today)
    && signatureOf(built) === signatureOf(today)
    && mine.length === theirs.length && mine.every((site, at) => {
      if (site.key !== theirs[at].key) return false;
      if (recorded(site).some(variable => amb.has(key(variable)))) {
        excluded += 1;
        return true;
      }
      sites += 1;
      return JSON.stringify(erasedType(site.ty, one))
        === JSON.stringify(erasedType(theirs[at].ty, other));
    });
  return { row, built, exact: false, excluded, sites, same,
    holes: holeCount(today) };
};

