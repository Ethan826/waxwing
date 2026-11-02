import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCorpus } from './r0-corpus.mjs';
import { load, resolved } from './r0-generate-support.mjs';
import { budget, onlineFrom } from './r0-online-support.mjs';

// Tranche 2 Task 10 (design §C.8; dossier §18.155 (6)), corpus-observed:
// over the corpus loader's online candidates, every declaration's images
// read (one per variable of today's σ, by sort) or fault, and the only
// faults are `UnreadImage` on an auxiliary record-row variable of the two
// statsEvidence declarations. Counts reconcile with the review's
// (`image-rows.mjs`): 196 images with an arrow or handler head, 192
// positioned and 4 auxiliary (the 4 in the faulted declarations); 6 more
// with data rows only; 5 record-row images. Corpus-wide, hence serial.
const online = await onlineFrom(load);
const Generate = await load('Features.Check.Generate');
const Inputs = await load('Features.Check.Generate.Inputs');
const Elaborating = await load('Domain.Elaborating');
const Online = await load('Features.Check.Strategy.Online');
const RB = await load('Features.Check.Strategy.ReadBack');
const Images = await load('Features.Check.Strategy.ReadBack.Images');
const Package = await load('Domain.Verdict.EffectPackage.Types');
const Atom = await load('Domain.Recorded.Atom');
const Maps = await load('Data.Map.Internal');
const { unfoldableArray } = await load('Data.Unfoldable');
const { fields } = await load('Domain.Recorded');

const named = value => value.constructor.name;
const pairs = map => Maps.toUnfoldable(unfoldableArray)(map);
const { Just } = await load('Data.Maybe');
const terms = () => new Just(Package.TermN.value);
const baseline = 'docs/plans/2026-10-21-c001-explicit/baseline/';

// What a package image needs beyond its erasure, by an explicit stack.
const needsOf = image => {
  const found = { arrow: false, rowData: false };
  const stack = [image];
  while (stack.length > 0) {
    const at = stack.pop();
    const kind = named(at);
    if (kind === 'PArrow' || kind === 'PHandler') found.arrow = true;
    if (kind === 'PArrow') stack.push(at.value0, at.value2);
    else if (kind === 'PHandler') stack.push(...at.value0.args);
    else if (kind === 'PData') {
      found.rowData ||= at.value2.length > 0;
      stack.push(...at.value1);
    } else if (kind === 'PRecord') stack.push(
      ...at.value0.fields.map(field => field.value1));
  }
  return found;
};
// The same, for today's image (a faulted declaration has no package).
const rowfulToday = image => {
  const stack = [image];
  while (stack.length > 0) {
    const at = stack.pop();
    const kind = named(at);
    if (kind === 'Arrow') return true;
    if (kind === 'App' && named(at.value0) === 'HandlerHead') return true;
    if (kind === 'App') stack.push(...at.value1);
    if (kind === 'Record') stack.push(...at.value0.map(each => each.value1));
  }
  return false;
};

const tally = async () => {
  const out = { candidates: 0, read: 0, arrows: { positioned: 0,
    auxiliary: 0 }, rowDataOnly: 0, recordRows: [], faults: [],
  unmatched: [] };
  const declaration = (program, inputs, origin) => decl => {
    const generated = Generate.generate(inputs.tables)(inputs.signatures)(
      decl);
    if (named(generated) !== 'Right') return;
    const problem = Elaborating.problem(generated.value0);
    const found = Online.onlineSearch(online.contextOf(program))(budget)(
      problem);
    if (named(found) !== 'Candidate') return;
    out.candidates += 1;
    const where = `${origin}#${decl.name}`;
    const readBack = RB.readBack(problem)(found.value0.checked).value0;
    const images = Images.readImages(terms)(problem)(found.value0.checked)(
      readBack);
    const infoOf = variable => Maps.lookup(Atom.ordVar)(variable)(
      fields(problem).vars).value0;
    const place = variable => (named(infoOf(variable).position)
      === 'Auxiliary' ? 'auxiliary' : 'positioned');
    if (named(images) === 'Left') {
      const variable = images.value0.value0;
      out.faults.push(`${where} ${named(images.value0)} ${place(variable)}`
        + ` ${named(infoOf(variable).sort)}`);
      for (const pair of pairs(readBack.unsettled)) {
        if (!rowfulToday(pair.value1)) continue;
        out.arrows[place(pair.value0)] += 1;
        if (named(infoOf(pair.value0).sort) === 'SortRow')
          out.recordRows.push(`${where} ${place(pair.value0)}`);
      }
      return;
    }
    out.read += 1;
    const each = (variable, image, row) => {
      const needs = needsOf(image);
      if (needs.arrow) out.arrows[place(variable)] += 1;
      else if (needs.rowData) out.rowDataOnly += 1;
      if (row && (needs.arrow || needs.rowData))
        out.recordRows.push(`${where} ${place(variable)}`);
    };
    pairs(images.value0.types).forEach(pair => each(pair.value0,
      pair.value1, false));
    pairs(images.value0.rows).forEach(pair => each(pair.value0,
      new Package.PRecord(pair.value1), true));
    if (Maps.size(images.value0.types) + Maps.size(images.value0.rows)
      !== Maps.size(readBack.unsettled)) out.unmatched.push(where);
  };
  for (const { origin, source } of await loadCorpus()) {
    let program;
    try { program = resolved(source); } catch { continue; }
    const inputs = Inputs.generationInputs(program);
    program.functions.forEach(declaration(program, inputs, origin));
  }
  return out;
};

test('every image reads or faults; the faults are the statsEvidence two',
  async () => {
    const out = await tally();
    assert.deepEqual(out.faults, [
      `${baseline}c7-pure-stages-construction.wxw#statsEvidence`
        + ' UnreadImage auxiliary SortRow',
      `${baseline}q7-pure-construction.wxw#statsEvidence`
        + ' UnreadImage auxiliary SortRow']);
    assert.equal(out.candidates, 2823);
    assert.equal(out.read, 2821);
    assert.deepEqual(out.unmatched, []);
    assert.deepEqual(out.arrows, { positioned: 192, auxiliary: 4 });
    assert.equal(out.rowDataOnly, 6);
    const stats = name => `${baseline}${name}#statsEvidence auxiliary`;
    assert.deepEqual(out.recordRows, [
      stats('c7-pure-stages-construction.wxw'),
      stats('c7-pure-stages-construction.wxw'),
      stats('q7-pure-construction.wxw'), stats('q7-pure-construction.wxw'),
      'research/division-campaign/r0/probes/f05-print-key.wxw#main'
        + ' positioned']);
  });
