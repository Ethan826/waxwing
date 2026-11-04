import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './r0-generate-support.mjs';
import { imagesCases, sources } from './r0-t2-images-cases.mjs';

// Tranche 2 Task 10 (design §C.8, Task 6a; dossier §18.155 (6)): each
// flexible variable's image in the package's `types` or `rows`, read from
// the live checked type at its position, rows, marks and handler C kept;
// an auxiliary only when its image needs no rows. `ImageApart` guards
// erasure agreement with today's σ only. Fixture-level.
const cases = await imagesCases(load);
const { declaration, named, shape, lookup, slotVar, liveSlot, liveRow,
  rowText, Erase, pairs, auxiliaries, infoOf, paramVar, liveParam } = cases;

const typeImage = (source, name, text) => {
  const { item, found } = declaration(source, name);
  assert.equal(named(found), 'Right', `${name}: ${named(found.value0)}`);
  const variable = slotVar(item, text);
  return { item, variable, image: lookup(found.value0.types, variable) };
};

test('an arrow image keeps its row', () => {
  const { item, variable, image } = typeImage(sources.uses, 'held', 'id(');
  assert.equal(named(image), 'PArrow');
  assert.deepEqual(shape(image.value1),
    shape(liveRow(liveSlot(item, variable).value1)));
  assert.match(rowText(image.value1), /^\[User@J\["least:Plain"\]\|/);
});

test('a handler image keeps its C', () => {
  const made = typeImage(sources.uses, 'wrap', 'id(');
  const live = liveSlot(made.item, made.variable).value1;
  assert.equal(named(made.image), 'PHandler');
  assert.deepEqual(shape(made.image.value1.inference),
    shape(liveRow(live.inference)));
  assert.equal(named(made.image.value1.clauses), 'Just');
  assert.deepEqual(shape(made.image.value1.clauses.value0),
    shape(liveRow(live.clauses.value0)));
  const given = typeImage(sources.uses, 'given', 'id(');
  assert.equal(named(liveSlot(given.item, given.variable).value1.clauses),
    'Nothing');
  assert.equal(named(given.image.value1.clauses), 'Nothing');
});

test('data rows read', () => {
  const { item, variable, image } = typeImage(sources.uses, 'job', 'id(');
  assert.equal(named(image), 'PData');
  assert.equal(image.value2.length, 1);
  assert.deepEqual(shape(image.value2[0]),
    shape(liveRow(liveSlot(item, variable).value2[0])));
});

test("erase of the image is today's σ image", () => {
  for (const name of ['held', 'wrap', 'given', 'job']) {
    const { readBack, found } = declaration(sources.uses, name);
    for (const [variable, today] of pairs(readBack.unsettled))
      assert.deepEqual(shape(Erase.eraseTy(lookup(found.value0.types,
        variable))), shape(today), name);
  }
  const { item, readBack } = declaration(sources.uses, 'held');
  const variable = slotVar(item, 'id(');
  const planted = { ...readBack, unsettled: cases.Maps.insert(
    cases.Atom.ordVar)(variable)(new cases.Atom.Base(
    cases.Atom.BoolBase.value))(readBack.unsettled) };
  const found = cases.imagesOf(item, planted);
  assert.equal(named(found), 'Left');
  assert.equal(named(found.value0), 'ImageApart');
  assert.deepEqual(shape(found.value0.value0), shape(variable));
});

test('an auxiliary image with an arrow is a read fault', () => {
  for (const source of [sources.c7, sources.q7]) {
    const { item, found } = declaration(source, 'statsEvidence');
    assert.equal(named(found), 'Left');
    assert.equal(named(found.value0), 'UnreadImage');
    const variable = found.value0.value0;
    assert.ok(auxiliaries(item).some(each =>
      JSON.stringify(shape(each)) === JSON.stringify(shape(variable))));
    assert.equal(named(infoOf(item, variable).sort), 'SortRow');
  }
});

test('a record-row field with an arrow reads its live row', () => {
  const { item, found } = declaration(sources.f05, 'main');
  assert.equal(named(found), 'Right');
  const [[variable, row]] = pairs(found.value0.rows);
  assert.equal(named(infoOf(item, variable).sort), 'SortRow');
  const [field] = row.fields;
  assert.equal(field.value0, 'f');
  assert.equal(named(field.value1), 'PArrow');
  const live = liveSlot(item, variable).value0.fields[0].value1;
  assert.deepEqual(shape(field.value1.value1), shape(liveRow(live.value1)));
});

test('data with row arguments reads its rows', () => {
  const { item, found } = declaration(sources.set1, 'main');
  assert.equal(named(found), 'Right');
  const variable = paramVar(item, 'fn(x)');
  const image = lookup(found.value0.types, variable);
  const live = liveParam(item, variable);
  assert.equal(named(image), 'PData');
  assert.equal(image.value0, live.value0);
  assert.equal(image.value2.length, 1);
  assert.deepEqual(shape(image.value2[0]), shape(liveRow(live.value2[0])));
});

test('a row-free auxiliary converts, compared up to field order', () => {
  const { item, readBack, found } = declaration(sources.p2, 'main');
  assert.equal(named(found), 'Right');
  const [variable] = auxiliaries(item).filter(each =>
    lookup(readBack.unsettled, each) !== undefined
      && named(lookup(readBack.unsettled, each)) === 'Record'
      && lookup(readBack.unsettled, each).value0.length === 2);
  const row = lookup(found.value0.rows, variable);
  assert.deepEqual(row.fields.map(field => field.value0),
    ['reviewed', 'age']);
  assert.deepEqual(shape(Erase.eraseTy(new cases.Package.PRecord(row))),
    shape(new cases.Atom.Record([...lookup(readBack.unsettled, variable)
      .value0].sort((a, b) => (a.value0 < b.value0 ? -1 : 1)), [])));
});

test('an auxiliary naming a flexible variable is a read fault', () => {
  assert.equal(cases.plantedFault(null), 'Right');
  assert.equal(cases.plantedFault('flexibleField'), 'UnreadImage');
  assert.equal(cases.plantedFault('flexibleTail'), 'UnreadImage');
});

test('an auxiliary with data rows, a handler or a rigid row is a fault',
  () => {
    assert.equal(cases.plantedFault('rowData'), 'UnreadImage');
    assert.equal(cases.plantedFault('handler'), 'UnreadImage');
    assert.equal(cases.plantedFault('rigid'), 'UnreadImage');
  });

// R036 (3): a value at the position whose user label the injected terms
// do not read is `ImageUnconverted`, not `UnreadImage`.
test('an unmarked label at a position is ImageUnconverted', () => {
  const { item, readBack } = declaration(sources.uses, 'held');
  const { Nothing } = cases;
  const found = cases.Images.readImages(() => Nothing.value)(item.problem)(
    item.checked)(readBack);
  assert.equal(named(found), 'Left');
  assert.equal(named(found.value0), 'ImageUnconverted');
  assert.deepEqual(shape(found.value0.value0), shape(slotVar(item, 'id(')));
  assert.equal(named(found.value0.value1), 'UserEffect');
});
