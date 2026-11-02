// Review probe (design §B.2): the `generation` scratch copy mints the
// renamed annotation, so the lambda's `⟨p, EffectOf⟩` is minted twice
// (test/r0-marked-corpus.serial.test.mjs "no position or effect variable
// minted twice" fails on the 31 declarations). This makes a `genfix`
// copy that records the renamed annotation but mints the unrenamed one.
//   node research/t2-read-back-review/genfix.mjs [both]
// With `both` (design note §C), the copy is `both-genfix`: the trace
// patches as well.
//   T2_SCRATCH=generation|genfix node --import \
//     ./research/t2-read-back-design/redirect.mjs --import \
//     ./research/t2-read-back-design/hook-generation.mjs \
//     --test test/r0-marked-corpus.serial.test.mjs
// `node research/t2-read-back-design/scratch.mjs clean` deletes both.
import { cpSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { makeScratch, outputOf, scratchRoot }
  from '../t2-read-back-design/scratch.mjs';

const owned = 'var owned = Features_Check_Generate_Owned.annotationClauses'
  + '(path)(index)(globalThis.__t2gen(context, path, markedType));';
const unrenamed = ' var unrenamed = Features_Check_Generate_Owned'
  + '.annotationClauses(path)(index)(markedType);';
const minted = 'PartTy(owned) ]';

const once = (text, find) => {
  const count = text.split(find).length - 1;
  if (count !== 1) throw new Error(`expected one ${find}, found ${count}`);
};

const base = process.argv[2] ?? 'generation';
const target = base === 'generation' ? 'genfix' : `${base}-genfix`;
const generation = makeScratch(base);
rmSync(join(scratchRoot, target), { recursive: true, force: true });
cpSync(generation, outputOf(target), { recursive: true });
const file = join(outputOf(target), 'Features.Check.Generate.Control',
  'index.js');
const text = readFileSync(file, 'utf8');
once(text, owned);
once(text, minted);
writeFileSync(file, text.replace(owned, () => owned + unrenamed)
  .replace(minted, () => 'PartTy(unrenamed) ]'));
console.log(outputOf(target));
