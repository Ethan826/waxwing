// Tranche 2 Task 15: one honest package and its mark forgeries judged by
// the A2 validator and the M-B collector, marks only (dossier §18.151,
// §18.155; design §F). Each variant passes the validator's prerequisites
// (step 0, I3, `Unsupported`) first; past them, the validator's verdict
// is `judgeObligations` on the completed package and M-B's the pinned
// graph under every valuation of the rigid marks (A2 Task 13's
// `judgeBoth`, test/regression-r0-a2-mb.mjs). Compared, as in A2 Task 13:
// - an accepted base: M-B accepts it; each forgery the validator accepts
//   M-B accepts, and each it refuses at a mark obligation
//   (`ObligationFailed`, `NotCertifiable ForcedTail`) M-B refuses;
// - a refused base with an accepted forgery is a mark refusal (one term
//   away from an accepted package): M-B refuses it, and accepts the
//   accepted forgery; its refused forgeries are not compared (below);
// - a refused base without one, and a refused forgery of a refused
//   base, is not compared as a mark verdict (its refusal may be a
//   non-mark obligation), but M-B must refuse it too: an M-B acceptance
//   there is a disagreement.
// Anything else is a disagreement, a stop for the author. A forgery
// refused at the prerequisites, or at another kind, is listed apart.
// Reported beside them: each honest package's full `validate` verdict
// (G0 included), and how many consumptions each A2 gap site records.
import { differential } from './regression-r0-a2-mb.mjs';
import { validateCases } from './regression-r0-a2-validate.mjs';
import { caps, forger } from './r0-t2-diff-forge.mjs';
import { shape } from './regression-r0-amin-support.mjs';

export const label = 'marks only';
export const scope = 'corpus-observed bounded agreement on marks, on '
  + 'exercised inputs only; not E12 exhaustiveness, not soundness, not '
  + 'row semantics (no row forgery runs); completion and settling (P_c) '
  + 'shared with the validator; forged: `marks` entries and user-effect '
  + 'label marks at the top of effect bindings';
// The E2 sites no accepted A2 package exercised (A2 Task 13's record).
export const gapSites = ['E2 AtCallback', 'E2 AtStage', 'E2 AtApply',
  'E2 AtPipe', 'E2 AtDeferredRow'];
const markKinds = ['ObligationFailed', 'NotCertifiable ForcedTail'];

const bump = (counts, key) => {
  counts[key] = (counts[key] ?? 0) + 1;
};

export const diffRunner = async load => {
  const cases = await validateCases(load);
  const mb = differential(cases);
  const forge = forger(cases, mb);
  const out = { packages: 0, honest: {}, full: {}, refusedHonest: [],
    fullRefused: [], recorded: {}, capped: 0,
    forgeries: { position: 0, binding: 0 }, steps: {},
    agreements: { accepted: 0, bothAccept: 0, markRefused: 0 },
    notCompared: 0, notComparedMbRefuses: 0, apart: [], vacuous: [],
    disagreements: [], exercised: new Set() };
  const judged = (problem, input) => {
    const before = cases.describe(cases.prerequisites(problem, input));
    return before === 'Right' ? mb.judgeBoth(problem, input)
      : { validator: `prerequisites ${before}`, prerequisites: true };
  };
  const accepts = run => run.validator === 'Right';
  const disagree = (where, what, run) => out.disagreements.push(
    `${where} ${what}: validator ${run.validator}, M-B ${run.mb
      ? 'accepts' : `refuses (gaps ${JSON.stringify(run.gaps)}, failing ${
        JSON.stringify(run.valuations.failing)})`}`);
  const agreeAccept = (where, what, run, key) => {
    if (!run.mb) return disagree(where, what, run);
    out.agreements[key] += 1;
    run.exercised.forEach(kind => out.exercised.add(kind));
  };
  const agreeRefuse = (where, what, run) => run.mb
    ? disagree(where, what, run) : bump(out.agreements, 'markRefused');
  const describeForgery = item => `${item.kind} ${JSON.stringify(
    shape(item.at))} ${JSON.stringify(item.from)} -> ${
    JSON.stringify(item.to)}`;
  // Not compared (a refused variant of a refused base): M-B's verdict is
  // still tallied, and an M-B acceptance there counts as a disagreement
  // (the coordinator's ruling, the stricter choice).
  const notCompared = (where, what, run) => {
    out.notCompared += 1;
    if (run.mb) return disagree(where, `${what} (not compared)`, run);
    out.notComparedMbRefuses += 1;
  };
  const compare = (where, base, item, run) => {
    const what = `forged ${describeForgery(item)}`;
    if (run.prerequisites || (!accepts(run) && accepts(base)
      && !markKinds.includes(run.validator)))
      return out.apart.push(`${where} ${what}: validator ${run.validator}`);
    if (accepts(run)) return agreeAccept(where, what, run, 'bothAccept');
    if (accepts(base)) return agreeRefuse(where, what, run);
    notCompared(where, what, run);
  };
  const add = ({ where, problem, pkg }) => {
    out.packages += 1;
    const base = judged(problem, pkg);
    bump(out.honest, base.validator);
    const full = cases.describe(cases.validate(problem, pkg));
    bump(out.full, full);
    if (full !== 'Right') out.fullRefused.push(`${where}: ${full}`);
    problem.effects.obligations.forEach(placed => {
      const site = `E2 ${placed.value.value0?.site?.constructor.name}`;
      if (gapSites.includes(site)) bump(out.recorded, site);
    });
    if (forge.capped(problem, pkg)) out.capped += 1;
    if (!accepts(base))
      out.refusedHonest.push(`${where}: validator ${base.validator}; M-B ${
        base.prerequisites ? 'not run' : base.mb ? 'accepts' : 'refuses'
      } (a mark refusal if a forgery is accepted, else not compared)`);
    if (base.prerequisites) return;
    if (accepts(base)) agreeAccept(where, 'honest', base, 'accepted');
    const runs = forge.forgeries(problem, pkg).flatMap(item => {
      const wrong = forge.marksOnly(pkg, item.input);
      if (wrong !== null) {
        out.vacuous.push(`${where} ${describeForgery(item)}: ${wrong}`);
        return [];
      }
      out.forgeries[item.kind] += 1;
      bump(out.steps, `${item.kind} ${item.step}`);
      return [[item, judged(problem, item.input)]];
    });
    runs.forEach(([item, run]) => compare(where, base, item, run));
    if (!accepts(base) && runs.some(([, run]) => accepts(run)))
      agreeRefuse(where, 'honest (a mark refusal)', base);
    else if (!accepts(base)) notCompared(where, 'honest', base);
  };
  const total = () => out;
  const report = counts => reportLines(counts).map(line =>
    `${label}: ${line}`);
  return { add, total, report, cases, mb, forge };
};

const reportLines = counts => [
  `scope: ${scope}; caps: ${caps.rule}`,
  `${counts.packages} honest packages${counts.faults === undefined ? ''
    : ` (${counts.faults} read faults)`}; `
    + `verdicts on the mark obligations ${JSON.stringify(counts.honest)
    }; full validate ${JSON.stringify(counts.full)}`,
  ...counts.refusedHonest.map(line => `honest refused ${line}`),
  ...counts.fullRefused.map(line => `honest, full validate refuses ${line}`),
  `forgeries: ${JSON.stringify(counts.forgeries)}; by step ${
    JSON.stringify(counts.steps)}; ${counts.capped} packages capped`,
  `agreements: ${JSON.stringify(counts.agreements)}; not compared ${
    counts.notCompared} (M-B refuses ${counts.notComparedMbRefuses
  }); apart ${counts.apart.length}; vacuous ${
    counts.vacuous.length}; disagreements ${counts.disagreements.length}`,
  `edge kinds on accepted variants: ${[...counts.exercised].sort()
    .join(', ')}`,
  `gap sites recorded (consumptions on the packages' problems): ${
    gapSites.map(site => `${site} ${counts.recorded[site] ?? 0}`)
      .join(', ')}`,
  `A2 gap sites now exercised: ${gapSites.filter(site =>
    counts.exercised.has(site)).join(', ') || 'none'}; still not: ${
    gapSites.filter(site => !counts.exercised.has(site)).join(', ')
    || 'none'}`,
  ...counts.apart.slice(0, 20).map(line => `apart ${line}`),
  ...counts.disagreements.map(line => `DISAGREEMENT ${line}`)
];
