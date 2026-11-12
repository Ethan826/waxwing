import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, unmet } from './r0-t2-activation-gate.mjs';
import { met } from './r0-t2-activation-gate-met.mjs';
import { classOf } from './r0-t2-replacement-losses.mjs';

// Criterion 2's whole-program part (dossier §18.186), on the synthetic
// evidence where every criterion holds: each case changes one thing and
// must leave exactly criterion 2 unmet, naming the problem. Omitted
// programs and wrong classes are the defects the correction exists to
// catch; the serial test shows the same on the committed file.
const dossierAdd = ['### 18.310 Known defect', 'FX9 is a defect.',
  '### 18.311 Accepted', 'lost.wxw accepted for live replacement.',
  '### 18.312 Shadow only', 'lost.wxw named, shadow certification.',
  ''].join('\n');

const evidenceWith = change => {
  const evidence = met();
  evidence.dossier += `\n${dossierAdd}`;
  change(evidence);
  return evidence;
};
const second = evidence => evaluate(evidence)
  .find(found => found.id === 2);
const unmetOnly2 = (name, evidence) => {
  assert.deepEqual(unmet(evaluate(evidence)), [2], name);
  return second(evidence).state.join('\n');
};
const programAt = (evidence, origin) => evidence.losses.programs
  .find(program => program.origin === origin);
const blocker = { name: 'main', decide: 'Unresolved', reason: 'r' };
// A lost program, correctly classed, beside the met fixture's.
const addLost = (evidence, origin = 'lost.wxw') => {
  evidence.census.union.origins.push(origin);
  evidence.losses.programs.push({ origin, named: ['census'],
    today: 'compiles', blockers: [blocker], class: 'lost' });
};

test('the met evidence meets criterion 2 with nothing lost', () => {
  const found = second(evidenceWith(() => {}));
  assert.ok(found.met, found.state.join('\n'));
  assert.match(found.state[0], /lost 0 \(accepted 0\)/);
});

test('an omitted census program or gap-list program is named', () => {
  assert.match(unmetOnly2('census', evidenceWith(evidence => {
    evidence.losses.programs = evidence.losses.programs
      .filter(program => program.origin !== 'census-only.wxw');
  })), /omitted: census-only\.wxw \(census\)/);
  const listed = met().losses.programs
    .find(program => !program.named.includes('census')).origin;
  assert.match(unmetOnly2('list', evidenceWith(evidence => {
    evidence.losses.programs = evidence.losses.programs
      .filter(program => program.origin !== listed);
  })), new RegExp(`omitted: ${listed.replace(/[.*+?^${}()|[\]\\]/g,
    '\\$&')} \\((faults|refusals|forcedTail)`));
});

test('a repeated program and a wrong naming are refused', () => {
  assert.match(unmetOnly2('repeated', evidenceWith(evidence => {
    evidence.losses.programs.push(evidence.losses.programs[0]);
  })), /program repeated: /);
  assert.match(unmetOnly2('named', evidenceWith(evidence => {
    programAt(evidence, 'census-only.wxw').named = ['faults'];
  })), /census-only\.wxw: named \["faults"\], but its sources name/);
});

test('a class its facts do not give is refused, each way', () => {
  const cases = [
    ['lost recorded notLost', { blockers: [blocker], class: 'notLost' },
      /class notLost, but its facts give lost/],
    ['refused recorded lost', { today: 'refused', blockers: [blocker],
      class: 'lost' }, /class lost, but its facts give existingRefusal/],
    ['solved recorded lost', { class: 'lost' },
      /class lost, but its facts give notLost/],
    ['unregistered knownDefect', { blockers: [blocker],
      class: 'knownDefect' }, /class knownDefect, but its facts give lost/]];
  for (const [name, change, message] of cases)
    assert.match(unmetOnly2(name, evidenceWith(evidence => {
      Object.assign(programAt(evidence, 'census-only.wxw'), change);
    })), message, name);
});

test('a lost program is unmet until a live ruling naming it accepts it',
  () => {
    assert.match(unmetOnly2('unaccepted', evidenceWith(addLost)),
      /1 programs lost under decide, not accepted for live replacement/);
    const accepted = second(evidenceWith(evidence => {
      addLost(evidence);
      evidence.status.acceptedLosses = { 'lost.wxw': '§18.311' };
    }));
    assert.ok(accepted.met, accepted.state.join('\n'));
    for (const cite of ['§18.312', '§18.310', '§18.150'])
      assert.match(unmetOnly2(cite, evidenceWith(evidence => {
        addLost(evidence);
        evidence.status.acceptedLosses = { 'lost.wxw': cite };
      })), /accepted loss lost\.wxw: .* is no live-replacement ruling/);
  });

test('a known defect needs a ruling naming its id and a blocker', () => {
  const defect = (ruling, id = 'FX9', at = 'lost.wxw#main') =>
    evidenceWith(evidence => {
      addLost(evidence);
      programAt(evidence, 'lost.wxw').class = 'knownDefect';
      evidence.status.knownDefects = { [at]: { id, ruling } };
    });
  const ruled = second(defect('§18.310'));
  assert.ok(ruled.met, ruled.state.join('\n'));
  assert.match(ruled.state.join('\n'),
    /known defect correctly refused: lost\.wxw/);
  assert.match(unmetOnly2('wrong id', defect('§18.310', 'FX8')),
    /known defect lost\.wxw#main: ruling recorded: no .*FX8/);
  assert.match(unmetOnly2('early', defect('§18.150')),
    /not after §18\.157/);
  assert.match(unmetOnly2('no blocker', evidenceWith(evidence => {
    evidence.status.knownDefects = { 'gone.wxw#g':
      { id: 'FX9', ruling: '§18.310' } };
  })), /known defect gone\.wxw#g blocks no recorded program/);
});

test('missing registry, census or file is unmet, never assumed met', () => {
  assert.match(unmetOnly2('registry', evidenceWith(evidence => {
    delete evidence.status.knownDefects;
  })), /gate status lacks "knownDefects"/);
  assert.match(unmetOnly2('census', evidenceWith(evidence => {
    evidence.census = null;
  })), /census\.json missing or unreadable/);
  assert.match(unmetOnly2('file', evidenceWith(evidence => {
    evidence.losses = null;
  })), /t2-replacement-losses\.json missing or unreadable/);
});

test('certification losses stay supporting evidence that counts', () => {
  assert.match(unmetOnly2('supporting', evidenceWith(evidence => {
    evidence.status.losses.faults = null;
  })), /supporting: .*read faults/);
});

test('classOf: refused, solved, registered defect, lost', () => {
  const program = (today, blockers) => ({ origin: 'p', today, blockers });
  assert.equal(classOf(program('refused', [blocker]), {}),
    'existingRefusal');
  assert.equal(classOf(program('compiles', []), {}), 'notLost');
  assert.equal(classOf(program('compiles', [blocker]), { 'p#main': {} }),
    'knownDefect');
  assert.equal(classOf(program('compiles', [blocker, { ...blocker,
    name: 'other' }]), { 'p#main': {} }), 'lost');
});
