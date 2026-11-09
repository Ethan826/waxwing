// Must-fail cases for the shadow and live separation (dossier §18.168),
// shared with the regression probe.
import { evaluate } from './r0-t2-activation-gate.mjs';
import { allMet, evaluateShadow, shadowReport }
  from './r0-t2-shadow-gate.mjs';
import { met } from './r0-t2-activation-gate-met.mjs';

const shadowSection = ['### 18.400 Shadow losses',
  'Each read fault and ForcedTail loss accepted within shadow certification.',
  ''].join('\n');

const base = () => {
  const evidence = met();
  evidence.dossier = `${evidence.dossier}\n${shadowSection}`;
  evidence.status.shadowLosses = { faults: '§18.400', forcedTail: '§18.400' };
  evidence.status.realReadFaultRow = 'r0-effects-unread-real-rt8';
  evidence.rows.add('r0-effects-unread-real-rt8');
  return evidence;
};

const stateOf = change => {
  const evidence = base();
  change(evidence);
  const results = evaluate(evidence);
  const shadow = evaluateShadow(evidence);
  return { live: results.filter(found => !found.met).map(found => found.id),
    shadow: shadow.filter(found => !found.met).map(found => found.id),
    report: shadowReport(results, shadow), all: allMet(results, shadow) };
};

const none = () => undefined;
// [name, change, live criteria unmet, shadow criteria unmet]
const table = [
  ['all met', none, [], []],
  ['no shadow ruling', evidence => {
    evidence.status.shadowLosses.faults = null; }, [], ['S1']],
  ['shadow key absent', evidence => {
    delete evidence.status.shadowLosses; }, [], ['S1']],
  ['a section not naming shadow certification', evidence => {
    evidence.dossier += '\n### 18.402 Other\nEach read fault loss ruled.\n';
    evidence.status.shadowLosses.faults = '§18.402'; }, [], ['S1']],
  ['one citation for shadow and live', evidence => {
    evidence.dossier = evidence.dossier.replace('### 18.303 Replacement losses',
      '### 18.303 Replacement losses\nshadow certification too.');
    evidence.status.shadowLosses.faults = '§18.303'; }, [2], ['S1']],
  ['the list unnamed', evidence => {
    evidence.dossier
      += '\n### 18.401 Other\nshadow certification read fault.\n';
    evidence.status.shadowLosses.forcedTail = '§18.401'; }, [], ['S1']],
  ['real row not run', evidence => {
    evidence.status.realReadFaultRow = null; }, [], ['S2']],
  ['real row untagged', evidence => {
    evidence.status.realReadFaultRow = 'r0-other';
    evidence.rows.add('r0-other'); }, [], ['S2']],
  ['real row not registered', evidence => {
    evidence.rows.delete('r0-effects-unread-real-rt8'); }, [], ['S2']],
  ['live losses unruled, shadow unaffected', evidence => {
    evidence.status.losses.faults = null; }, [2], []]
];

export const wrongShadowCases = () => table.flatMap(
  ([name, change, live, shadow]) => {
    const found = stateOf(change);
    return String(found.live) === String(live)
      && String(found.shadow) === String(shadow) ? []
      : [`${name}: live ${found.live}; shadow ${found.shadow}`];
  });

// The two verdicts stay apart: a live-only gap leaves shadow met.
export const verdictsWrong = () => {
  const live = stateOf(evidence => { evidence.status.losses.faults = null; });
  const met = stateOf(none);
  return [
    ...(live.report.includes('shadow minting: met') ? []
      : ['a live-only gap blocks shadow']),
    ...(live.report.includes('live replacement: not met (2)') ? []
      : ['a live-only gap unreported']),
    ...(met.all ? [] : ['all met reads unmet'])];
};
