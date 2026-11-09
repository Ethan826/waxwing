// Shadow minting and live replacement as separate decisions (dossier
// §18.168): enabling stricter shadow certification does not approve losing
// working programs in the live compiler, so one citation cannot stand for
// both. Pure, over the activation gate's evidence.
import { missing, normalCite, result, ruling, section, statusKey, tagged }
  from './r0-t2-activation-evidence.mjs';

export const shadowLists = [['faults', 'read fault'],
  ['forcedTail', 'ForcedTail']];
export const shadowToken = 'shadow certification';
export const realRowTag = 'effects-unread-real';

export const liveToken = 'live replacement';
const constructorLine = /^\s*[=|]\s*EffectsUnread(?![\w'])/m;

// The `Unsupport` declaration alone, block comments removed.
export const hasConstructor = source => {
  const code = String(source ?? '').replace(/\{-[\s\S]*?-\}/g, '');
  const start = code.search(/^data Unsupport\b/m);
  if (start < 0) return false;
  const rest = code.slice(start + 1);
  const end = rest.search(/\n\S/);
  return constructorLine.test(end < 0 ? rest : rest.slice(0, end));
};

const citations = (evidence, key) => {
  const found = statusKey(evidence, key);
  return found === null || typeof found !== 'object' ? []
    : Object.values(found).map(normalCite).filter(cite => cite !== null);
};

// A shadow citation that any list's live ruling also cites, whatever the
// spelling or the list.
const sameCitation = (evidence, cite) => normalCite(cite) !== null
  && citations(evidence, 'losses').includes(normalCite(cite));

// A section's text in one case and spacing: the dossier wraps at 80 columns.
const normalized = text => text.toLowerCase().replace(/\s+/g, ' ');
const mentions = (evidence, cite, token) =>
  normalized(section(evidence.dossier, cite) ?? '')
    .includes(token.toLowerCase());

const listLine = (evidence, shadow, [list, matter]) => {
  const cite = shadow[list];
  const found = ruling(evidence.dossier, cite, '');
  if (!found.met) return [false, `${matter}: ${found.line}`];
  if (!mentions(evidence, cite, shadowToken))
    return [false, `${matter}: ${cite} does not mention ${shadowToken}`];
  if (!mentions(evidence, cite, matter))
    return [false, `${matter}: ${cite} does not mention ${matter}`];
  return sameCitation(evidence, cite)
    ? [false, `${matter}: ${cite} is also cited for live replacement`]
    : [true, `${matter}: ${found.line}; shadow only`];
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
  if (!tagged(row, realRowTag))
    return result([`row ${row} does not carry the tag ${realRowTag}`], []);
  if (!evidence.rows.has(row))
    return result([`row ${row} not in the regression registry`], []);
  return hasConstructor(evidence.unsupport)
    ? result([], [`row ${row}`])
    : result(['the Unsupport type has no EffectsUnread constructor'], []);
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

const liveScoped = (evidence, cite) => mentions(evidence, cite, liveToken)
  && !mentions(evidence, cite, shadowToken);

// Each live ruling is scoped to live replacement and is no shadow citation.
// Tokens read that a section names its matter, not what it decides.
export const separatedLive = (acceptance, evidence) => {
  const found = acceptance(evidence);
  const losses = statusKey(evidence, 'losses');
  const cites = losses === null || typeof losses !== 'object' ? []
    : Object.values(losses).filter(cite => normalCite(cite) !== null);
  const shared = citations(evidence, 'shadowLosses')
    .filter(cite => citations(evidence, 'losses').includes(cite))
    .map(cite => `§${cite}: one citation for shadow and live`);
  const unscoped = cites.filter(cite => !liveScoped(evidence, cite))
    .map(cite => `${cite}: not scoped to live replacement alone`);
  const problems = [...shared, ...unscoped];
  return problems.length === 0 ? found : result(problems, found.state);
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
