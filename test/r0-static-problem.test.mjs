import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { filesUnder } from '../scripts/structure.mjs';
import { table as siteTable } from './r0-static-sites.mjs';
import { load } from './r0-generate-support.mjs';

// R0 Task 3.2 (Task 2.3 carry): every `Problem` constructor has a
// disposition, a typed path from a raised problem to its class
// (Generate.Static.Problem). Task 2.3's 28 are given by their raise
// sites (the site table, test/r0-static-sites.mjs); each of the other 36
// names the phases that raise it, each with a cited raise line, and
// every line of src naming it lies in one of those phases.
const { disposition } = await load('Features.Check.Generate.Static.Problem');
const Problem = await load('Domain.Problem');
const { arms } = await load('Style.Arms');

const R = 'src/Features/Resolve/';
const C = 'src/Features/Check/';
const F = 'src/Format/';
// [constructor, placements, cited raise lines, reason]
const placed = [
  ['Lexical', ['BeforeResolution'], [`${F}Lex.purs:136`]],
  ['Syntax', ['BeforeResolution'], [`${F}Lex/Scan.purs:179`]],
  ['IntegerOutOfRange', ['BeforeResolution'], [`${F}Parse/Literal.purs:49`]],
  ['NestingTooDeep', ['BeforeResolution'], [`${F}Lex/Scan.purs:110`]],
  ['TypeTooDeep', ['ResourceLimit'], [`${C}Require.purs:140`]],
  ['Duplicate', ['ResolveRule StaticDuplicate', 'CheckSemantic'],
    [`${R}Effect.purs:105`, `${C}Overlap.purs:67`]],
  ['Unbound', ['ResolveRule StaticUnbound'], [`${R}Pattern.purs:102`]],
  ['NotCallable', ['ResolveRule StaticNotCallable'], [`${R}Name.purs:74`]],
  ['CtorNotCallable', ['ResolveRule StaticNotCallable'],
    [`${R}Name.purs:97`]],
  ['TypeMismatch', ['CheckSemantic'], [`${C}Reject.purs:69`]],
  ['NotAFunction', ['CheckSemantic'], [`${C}Apply.purs:189`]],
  ['InfiniteType', ['CheckSemantic'], [`${C}Require.purs:95`]],
  ['NotComparable', ['CheckSemantic'], [`${C}Comparable.purs:77`]],
  ['PolymorphicRecursion', ['ProgramWide'], [`${C}Instantiation.purs:70`]],
  ['NestedDatatype', ['ProgramWide'], [`${C}Nested.purs:167`]],
  ['SpecializationLimit', ['Lowering'],
    ['src/Features/Specialize/Keys.purs:151']],
  ['Internal', ['Fault'], [`${C}Tables.purs:28`]],
  ['RowSort', ['BeforeResolution', 'ResolveRule StaticSort'],
    [`${F}Parse/Type.purs:143`, `${R}HandlerType.purs:47`]],
  ['RecordRowAsEffect', ['ResolveRule StaticSort'],
    [`${R}SortConflict.purs:57`]],
  ['EffectRowAsRecord', ['ResolveRule StaticSort'],
    [`${R}SortConflict.purs:58`]],
  ['NotPrintable', ['CheckSemantic', 'Lowering'], [`${C}Printable.purs:57`,
    'src/Features/Specialize/Printable.purs:113']],
  ['MissingField', ['CheckSemantic'], [`${C}Record.purs:184`]],
  ['ExpectedRecord', ['ResolveRule StaticSort', 'CheckSemantic'],
    [`${R}TypeArguments.purs:152`, `${C}Extension.purs:100`]],
  ['PatternMissingField', ['CheckSemantic'], [`${C}PatternRow.purs:62`]],
  ['PatternMissingRest', ['CheckSemantic'], [`${C}PatternRow.purs:73`]],
  ['SecondSpread', ['ResolveSupport'], [`${R}Record.purs:80`]],
  ['TypeAsRecordRow', ['ResolveRule StaticSort'],
    [`${R}Requirements.purs:85`]],
  ['RowMayHaveField', ['ResolveSemantic', 'CheckSemantic'],
    [`${R}Lacking.purs:162`, `${C}Lacked.purs:40`]],
  ['LackedField', ['CheckSemantic'], [`${C}Lacked.purs:34`]],
  ['NotKnownDisjoint', ['ResolveSemantic', 'CheckSemantic'],
    [`${R}Apart.purs:154`, `${C}Lacked.purs:43`]],
  ['InBothRecords', ['CheckSemantic'], [`${C}Lacked.purs:55`]],
  ['InBothRows', ['CheckSemantic'], [`${C}Lacked.purs:47`]],
  ['CannotTell', ['CheckSemantic'], [`${C}Unresolved.purs:74`]],
  ['MustBeRow', ['CheckSemantic'], [`${C}Contradicted.purs:119`]],
  ['LabelMismatch', ['CheckSemantic'], [`${C}Reject.purs:96`]]
];
// Task 2.3's rows raise their token, or `Arity` for an arity predicate.
const raisedBy = row => (Problem[row.token] ? row.token : 'Arity');

const declared = arms(readFileSync('src/Domain/Problem.purs', 'utf8'))
  .value0.declared;
const problems = declared.slice(declared.indexOf('Lexical'));

const build = name => {
  const constructor = Problem[name];
  if (constructor.value !== undefined) return constructor.value;
  const args = Array.from({ length: constructor.length }, () => 'x');
  if (name === 'Hinted') args[0] = Problem.Arity.value;
  return args.reduce((made, arg) => made(arg), constructor.create);
};
const shown = found => found.constructor.name === 'AtSites'
  ? ['AtSites', ...found.value0.map(site => site.value0.constructor.name)]
  : ['Placed', ...found.value0.map(place => [place.constructor.name,
    place.value0?.constructor.name].filter(Boolean).join(' '))];

test('the 64 constructors are the 28 sited and the 36 placed, once', () => {
  assert.equal(problems.length, 64);
  const sited = [...new Set(siteTable.map(raisedBy))];
  assert.equal(sited.length, 28);
  assert.deepEqual([...sited, ...placed.map(([name]) => name), 'Hinted']
    .sort(), [...problems].sort());
});

test('each constructor injected directly has its disposition', () => {
  for (const [name, places] of placed)
    assert.deepEqual(shown(disposition(build(name))), ['Placed', ...places],
      name);
  for (const name of new Set(siteTable.map(raisedBy)))
    assert.deepEqual(shown(disposition(build(name))).sort(), ['AtSites',
      ...siteTable.filter(row => raisedBy(row) === name)
        .map(row => row.name)].sort(), name);
  assert.deepEqual(shown(disposition(build('Hinted'))),
    shown(disposition(Problem.Arity.value)));
});

test('the disposition names every constructor, with no catch-all', () => {
  const found = arms(readFileSync(
    'src/Features/Check/Generate/Static/Problem.purs', 'utf8')).value0;
  assert.equal(found.armOthers, 0);
  assert.deepEqual([...found.armConstructors].sort().filter(name =>
    problems.includes(name)), [...problems].sort());
  assert.ok(!found.identifiers.includes('const'));
});

const phaseOf = file => file.startsWith(F) ? ['BeforeResolution']
  : file.startsWith(R) ? ['ResolveRule', 'ResolveSemantic', 'ResolveSupport']
    : file.startsWith('src/Features/Specialize') ? ['Lowering']
      : file.startsWith(C) ? ['CheckSemantic', 'ProgramWide', 'ResourceLimit',
        'Fault'] : [];
const kinds = places => places.map(place => place.split(' ')[0]);

test('each cited raise line names its constructor in its phase', () => {
  for (const [name, places, cited] of placed)
    for (const site of cited) {
      const [file, line] = site.split(':');
      const text = readFileSync(file, 'utf8').split('\n')[Number(line) - 1];
      assert.match(text, new RegExp(`\\b${name}\\b`), site);
      assert.ok(phaseOf(file).some(phase => kinds(places).includes(phase)),
        site);
    }
});

// Every src line naming a placed constructor, outside its declaration,
// renderers, this classification, imports and comments, with strings
// blanked, is in one of its phases. `Internal` (raised everywhere as a
// fault) and the names that are also other constructors' (`RowSort`, a
// Sort; `Syntax`, a module; `SecondSpread`, an Unsupport) are exempt,
// each cited above.
const exempt = ['Internal', 'RowSort', 'Syntax', 'SecondSpread'];
test('every line naming a placed constructor is in one of its phases',
  async () => {
    const files = (await filesUnder('src')).filter(file =>
      /^src\/(Features|Format)\//.test(file) && file.endsWith('.purs')
      && !/^src\/Format\/(Diagnostic|Wire)/.test(file)
      && file !== 'src/Features/Check/Generate/Static/Problem.purs');
    const lines = files.flatMap(file => readFileSync(file, 'utf8')
      .split('\n').map((text, at) => ({ file, at: at + 1, text: text
        .replace(/"([^"\\]|\\.)*"/g, '""') })))
      .filter(line => !/^\s*(--|import\b|,|\()/.test(line.text));
    const misplaced = placed.filter(([name]) => !exempt.includes(name))
      .flatMap(([name, places]) => lines.filter(line =>
        new RegExp(`(^|[^.\\w])${name}(?![.\\w])`).test(line.text)
        && !phaseOf(line.file).some(phase => kinds(places).includes(phase)))
        .map(line => `${name} at ${line.file}:${line.at}`));
    assert.deepEqual(misplaced, []);
  });
