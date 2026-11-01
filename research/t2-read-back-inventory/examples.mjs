// The distinguishing examples of Task 1, Step 3 (§18.151 (2)): each
// research/t2-read-back-inventory/examples/*.wxw.txt program, every
// declaration, every recorded effect variable and position with the
// live values read for it, the sources, and the least term of each
// position over the live mark graph. Research only; observed output is
// quoted in README.md.
//   node research/t2-read-back-inventory/examples.mjs [file ...]
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { load } from '../../test/r0-generate-support.mjs';
import { declarationsOf, stageOf } from './corpus.mjs';
import { factsOf } from './sources.mjs';
import { leastTerms, liveGraph, termText } from './least.mjs';
import { keyOf, named } from './shape.mjs';

const { fields } = await load('Domain.Recorded');
const { forcedTails } = await load('Features.Check.Strategy.Effects.Forced');
const folder = 'research/t2-read-back-inventory/examples';
const files = process.argv.length > 2 ? process.argv.slice(2)
  : readdirSync(folder).filter(name => name.endsWith('.wxw.txt'))
    .map(name => join(folder, name));

const pathText = path => (named(path.root) === 'InBody' ? ''
  : `${named(path.root)}:`) + path.steps.map(step => step.value0).join('/');
const roleText = v => (named(v) === 'EffRigid' ? `rigid ${v.value0}`
  : `${keyOf(v.value1).replace(/"/g, '')} @ ${pathText(v.value0)}`);
const positionText = p => `${named(p)} @ ${pathText(p.value0)}`
  + (p.value1 === undefined ? '' : ` ${p.value1}`)
  + (p.value2 === undefined ? '' : ` ${p.value2}`);
const short = text => text.replace(/\{"UserEffect":\[(\d+)\]\}/g, 'E$1')
  .replace(/"ConsoleEffect"/g, 'Console').replace(/"FailEffect"/g, 'Fail')
  .replace(/\(\)/g, '');

const report = item => {
  const lines = [`${item.at}: ${stageOf(item)}`];
  if (!stageOf(item).startsWith('candidate')) return lines;
  const effects = fields(item.problem).effects;
  const facts = factsOf(item);
  const forced = new Set(forcedTails(item.problem).map(f => keyOf(f.forced)));
  const values = subject => {
    const mine = facts.filter(f => (f.variable ?? f.position) !== undefined
      && keyOf(f.variable ?? f.position) === keyOf(subject));
    const read = mine.filter(f => f.kind === 'var' || f.kind === 'pos');
    const texts = [...new Set(read.map(f => short(f.text)))];
    const from = [...new Set(read.map(f => f.where))];
    const unread = [...new Set(mine.filter(f => f.kind === 'unread')
      .map(f => f.where))];
    return { texts, from, unread };
  };
  for (const v of effects.flexEff) {
    const found = values(v);
    lines.push(`  var ${roleText(v)}${forced.has(keyOf(v)) ? ' (forced)'
      : ''}: ${found.texts.length === 0 ? 'UNREAD ' + found.unread.join('; ')
      : found.texts.join(' / ') + '  <- ' + found.from.join(', ')}`);
  }
  const made = leastTerms(liveGraph(item.live.state.subst.marks));
  for (const p of effects.positions) {
    const found = values(p);
    const term = found.texts.length === 1 && found.texts[0] !== 'U'
      ? termText(made.term(found.texts[0])) : '-';
    lines.push(`  pos ${positionText(p)}: ${found.texts.length === 0
      ? 'UNREAD ' + found.unread.join('; ')
      : found.texts.join(' / ') + ` least ${term}  <- `
        + found.from.join(', ')}`);
  }
  for (const f of facts) if (f.kind === 'rigid')
    lines.push(`  rigid ${f.id} <- ${f.where}: ${short(f.text)}`);
  return [...new Set(lines)];
};

for (const file of files) {
  console.log(`== ${file}`);
  const entry = { origin: file, source: readFileSync(file, 'utf8') };
  for (const item of declarationsOf(entry))
    console.log(report(item).join('\n'));
}
