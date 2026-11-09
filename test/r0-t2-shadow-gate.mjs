// Shadow minting and live replacement as separate decisions (dossier
// §18.168): enabling stricter shadow certification does not approve losing
// working programs in the live compiler, so one citation cannot stand for
// both. Pure, over the activation gate's evidence.
import { missing, result, ruling, statusKey }
  from './r0-t2-activation-evidence.mjs';

export const shadowLists = [['faults', 'read fault'],
  ['forcedTail', 'ForcedTail']];
export const shadowToken = 'shadow certification';
export const realRowTag = 'effects-unread-real';

// A list's two citations are one citation.
const sameCitation = (evidence, list) => {
  const live = statusKey(evidence, 'losses')?.[list];
  const shadow = statusKey(evidence, 'shadowLosses')?.[list];
  return typeof shadow === 'string' && live === shadow;
};

const listLine = (evidence, shadow, [list, matter]) => {
  const scoped = ruling(evidence.dossier, shadow[list], shadowToken);
  const named = ruling(evidence.dossier, shadow[list], matter);
  if (!scoped.met) return [false, `${matter}: ${scoped.line}`];
  if (!named.met) return [false, `${matter}: ${named.line}`];
  return sameCitation(evidence, list)
    ? [false, `${matter}: ${shadow[list]} is also cited for live replacement`]
    : [true, `${matter}: ${scoped.line}; shadow only`];
};

// S1. Each loss list accepted within shadow certification only.
const shadowAccepted = evidence => {
  const shadow = statusKey(evidence, 'shadowLosses');
  if (shadow === null || typeof shadow !== 'object')
    return missing('shadowLosses');
  const lines = shadowLists.map(entry => listLine(evidence, shadow, entry));
  return result(lines.filter(([met]) => !met).map(([, line]) => line),
    lines.filter(([met]) => met).map(([, line]) => line));
};

// S2. The real constructor reaches RT8 and the window: a regression row
// the switch's own change adds. Unmet before the switch by construction.
const realReadFault = evidence => {
  const row = statusKey(evidence, 'realReadFaultRow');
  if (row === undefined) return missing('realReadFaultRow');
  if (typeof row !== 'string')
    return result(['not run: must run with the minting switch'], []);
  if (!row.includes(realRowTag))
    return result([`row ${row} does not carry the tag ${realRowTag}`], []);
  return evidence.rows.has(row) ? result([], [`row ${row}`])
    : result([`row ${row} not in the regression registry`], []);
};

export const shadowCriteria = [
  { id: 'S1', title: 'each loss accepted within shadow certification only',
    measure: shadowAccepted },
  { id: 'S2', title: 'the real EffectsUnread reaches RT8 and the window',
    measure: realReadFault }
];

const measured = (criterion, evidence) => {
  try {
    return criterion.measure(evidence);
  } catch (error) {
    return result([`evidence unreadable: ${error.message}`], []);
  }
};

export const evaluateShadow = evidence => shadowCriteria.map(criterion =>
  ({ id: criterion.id, title: criterion.title,
    ...measured(criterion, evidence) }));

// A list's live ruling is unmet when it is the shadow's own citation.
export const separatedLive = (acceptance, evidence) => {
  const found = acceptance(evidence);
  const shared = shadowLists.filter(([list]) => sameCitation(evidence, list))
    .map(([, matter]) => `${matter}: one citation for shadow and live`);
  return shared.length === 0 ? found : result(shared, found.state);
};

const ids = results => results.filter(found => !found.met)
  .map(found => found.id);

const verdict = (name, unmetIds) => (unmetIds.length === 0 ? `${name}: met`
  : `${name}: not met (${unmetIds.join(', ')})`);

// Shadow minting needs every criterion but the live losses (2); live
// replacement needs them all.
export const shadowReport = (results, shadow) => [
  ...shadow.flatMap(found => [
    `${found.id} ${found.met ? 'met' : 'NOT MET'}: ${found.title}`,
    ...found.state.map(line => `    ${line}`)]),
  verdict('shadow minting', [...ids(results).filter(id => id !== 2),
    ...ids(shadow)]),
  verdict('live replacement', [...ids(results), ...ids(shadow)])].join('\n');

export const allMet = (results, shadow) =>
  ids(results).length === 0 && ids(shadow).length === 0;
