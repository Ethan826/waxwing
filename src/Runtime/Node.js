import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

// Port implementations answer through the `results` constructors, so no
// PureScript data representation is assumed here.
const attempt = (results, work) => {
  try { return work(); } catch (error) { return results.io(error.message); }
};

const external = (results, command, args, done) => {
  const result = spawnSync(command, args, { encoding: 'utf8' });
  if (result.error || result.status !== 0) {
    return results.tool(result.error?.message ?? result.stderr)(command);
  }
  return done(result.stdout);
};

// Builds `go` in a fresh temporary directory, which is always removed.
const withBuilt = (results, go, binaryIn, after) => () => {
  let work;
  try {
    work = mkdtempSync(join(tmpdir(), 'waxwing-'));
    const source = join(work, 'main.go');
    const binary = binaryIn(work);
    writeFileSync(source, go);
    const args = ['build', '-o', binary, source];
    return external(results, 'go', args, () => after(binary));
  } catch (error) {
    return results.io(error.message);
  } finally {
    if (work) rmSync(work, { recursive: true, force: true });
  }
};

export const commandArguments = () => process.argv.slice(2);
export const writeOutput = text => () => { process.stdout.write(text); };
export const writeError = text => () => { console.error(text); };
export const setExitCode = status => () => { process.exitCode = status; };
export const json = record => JSON.stringify(record);

// Index of the first byte that starts an invalid UTF-8 sequence (WHATWG
// ranges), or -1 when the bytes are valid.
const firstInvalid = bytes => {
  const inside = (at, low = 0x80, high = 0xBF) =>
    at < bytes.length && bytes[at] >= low && bytes[at] <= high;
  const tail = (at, count) =>
    Array.from({ length: count }, (_, k) => at + k).every(k => inside(k));
  const widthAt = i => {
    const b = bytes[i];
    if (b < 0x80) return 1;
    if (b >= 0xC2 && b <= 0xDF) return tail(i + 1, 1) ? 2 : 0;
    if (b >= 0xE0 && b <= 0xEF) {
      const low = b === 0xE0 ? 0xA0 : 0x80;
      const high = b === 0xED ? 0x9F : 0xBF;
      return inside(i + 1, low, high) && tail(i + 2, 1) ? 3 : 0;
    }
    if (b >= 0xF0 && b <= 0xF4) {
      const low = b === 0xF0 ? 0x90 : 0x80;
      const high = b === 0xF4 ? 0x8F : 0xBF;
      return inside(i + 1, low, high) && tail(i + 2, 2) ? 4 : 0;
    }
    return 0;
  };
  for (let i = 0; i < bytes.length;) {
    const width = widthAt(i);
    if (width === 0) return i;
    i += width;
  }
  return -1;
};

// A BOM stays in the text (`ignoreBOM`), as `readFileSync(path, 'utf8')`
// kept it before invalid bytes were rejected.
const decoder = fatal => new TextDecoder('utf-8', { fatal, ignoreBOM: true });

// Positions follow the location convention: UTF-16 units, LF starts a line.
const invalidAt = (results, bytes) => {
  const first = firstInvalid(bytes);
  if (first < 0) throw new Error('UTF-8 decoding failed at no byte');
  const prefix = decoder(false).decode(bytes.subarray(0, first));
  const lines = prefix.split('\n');
  const column = lines[lines.length - 1].length + 1;
  return results.utf8(prefix.length)(lines.length)(column);
};

export const readSourceWith = results => path => () =>
  attempt(results, () => {
    const bytes = readFileSync(path);
    try {
      return results.right(decoder(true).decode(bytes));
    } catch (error) {
      if (error instanceof TypeError) return invalidAt(results, bytes);
      throw error;
    }
  });

export const writeTextWith = results => path => text => () =>
  attempt(results, () => {
    writeFileSync(path, text);
    return results.right('');
  });

export const buildWith = results => go => output =>
  withBuilt(results, go, () => resolve(output), () => results.right(''));

export const runWith = results => go =>
  withBuilt(results, go, work => join(work, 'program'),
    binary => external(results, binary, [], results.right));
