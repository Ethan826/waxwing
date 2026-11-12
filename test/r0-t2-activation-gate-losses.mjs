// Must-fail cases for criterion 2's whole-program part (dossier §18.186;
// test/r0-t2-replacement-losses.mjs), in the form of
// test/r0-t2-activation-gate-cases.mjs: [criteria left unmet, the
// change]. `laterChanges` adds them to the freshness cases, which that
// file spreads into its own; the regression probe runs them all.
import { freshChanges } from './r0-t2-activation-gate-fresh.mjs';

const blocker = { name: 'main', decide: 'Unresolved', reason: 'r' };
const at = (evidence, origin) => evidence.losses.programs
  .find(program => program.origin === origin);

// A lost program beside the met fixture's, and sections to cite.
const withLost = (evidence, change = () => {}) => {
  evidence.census.union.origins.push('lost.wxw');
  evidence.losses.programs.push({ origin: 'lost.wxw', named: ['census'],
    today: 'compiles', blockers: [blocker], class: 'lost' });
  evidence.dossier += '\n### 18.320 Rulings\nlost.wxw accepted for live'
    + ' replacement. FX9 is a defect.\n';
  change(evidence);
};
const defect = id => evidence => withLost(evidence, found => {
  at(found, 'lost.wxw').class = 'knownDefect';
  found.status.knownDefects = { 'lost.wxw#main': { id, ruling: '§18.320' } };
});

export const lossChanges = {
  lossOmitted: [[2], evidence => {
    evidence.losses.programs = evidence.losses.programs
      .filter(program => program.origin !== 'census-only.wxw'); }],
  lossRepeated: [[2], evidence => {
    evidence.losses.programs.push(evidence.losses.programs[0]); }],
  lossMisnamed: [[2], evidence => {
    at(evidence, 'census-only.wxw').named = ['faults']; }],
  // A program `decide` would lose, recorded as not lost.
  lossMisclassed: [[2], evidence => {
    at(evidence, 'census-only.wxw').blockers = [blocker]; }],
  lossUnaccepted: [[2], evidence => withLost(evidence)],
  lossAccepted: [[], evidence => withLost(evidence, found => {
    found.status.acceptedLosses = { 'lost.wxw': '§18.320' }; })],
  defectRuled: [[], defect('FX9')],
  defectIdUnnamed: [[2], defect('FX8')],
  defectNoBlocker: [[2], evidence => {
    evidence.status.knownDefects = { 'gone.wxw#g':
      { id: 'FX9', ruling: '§18.150' } }; }]
};

export const laterChanges = { ...freshChanges, ...lossChanges };
