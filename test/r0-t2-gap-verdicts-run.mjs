// Today's verdicts on the honest pin's gap lists (dossier §18.159
// criterion 2), from the committed checker: for each declaration the
// pin lists, the shadow `decide` (RT8's run, test/r0-rt8-run.mjs),
// today's whole checker, the substitution-only `certify` (Task 13's
// rows, test/r0-t2-honest-report.mjs) and the window class the shadow
// differential gives it (test/r0-shadow-classes.mjs). Only the
// programs holding a listed declaration are run. Corpus-observed;
// nothing here is a soundness claim. Shared by the serial test and the
// writer, scripts/r0-t2-gap-verdicts-pin.mjs.
import { load } from './r0-generate-support.mjs';
import { describe, verdictClass } from './r0-decide-support.mjs';
import { sourcesOf } from './r0-effects-pin-run.mjs';
import { honestReport } from './r0-t2-honest-report.mjs';
import { declarationsOf } from './r0-rt8-run.mjs';
import { factsOf } from './r0-shadow-run.mjs';
import { agreementOf, windowClassOf } from './r0-shadow-classes.mjs';
import { gapEntriesOf } from './r0-t2-gap-verdicts.mjs';

const { generationInputs } = await load('Features.Check.Generate.Inputs');
const { wire } = await load('Format.Diagnostic');

const named = value => value.constructor.name;

const checkerOf = today => (named(today) === 'Right' ? 'compiles'
  : `${wire(today.value0).code} ${wire(today.value0).message}`);

// The shadow differential's class: the window's, or the agreement a
// row-less declaration stands for.
const shadowOf = row => {
  const facts = factsOf(row, generationInputs(row.program));
  return windowClassOf(facts) ?? agreementOf(facts);
};

// One declaration's verdicts: RT8's row and Task 13's row for it.
const verdictOf = (rt8, honest) => ({
  decide: verdictClass(rt8.decision),
  reason: describe(rt8.decision).verdict,
  checker: checkerOf(rt8.today),
  certify: honest.certify,
  shadow: shadowOf(rt8)
});

const byAt = rows => new Map(rows.map(row => [row.at, row]));

// The observed verdicts of every declaration on `pin`'s gap lists, by
// declaration. A listed declaration either run does not reach throws:
// it is never given a verdict by default.
export const observedVerdicts = async pin => {
  const ats = new Set(Object.values(gapEntriesOf(pin)).flat()
    .map(entry => entry.at));
  const origins = new Set([...ats].map(at =>
    at.slice(0, at.lastIndexOf('#'))));
  const sources = (await sourcesOf()).filter(entry =>
    origins.has(entry.origin));
  const rt8 = byAt(sources.flatMap(declarationsOf));
  const honest = byAt((await honestReport(load))(sources));
  return new Map([...ats].sort().map(at => {
    if (!rt8.has(at) || !honest.has(at))
      throw new Error(`no verdict observed for ${at}`);
    return [at, verdictOf(rt8.get(at), honest.get(at))];
  }));
};
