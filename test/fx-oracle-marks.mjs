// FX008 marks, for the reference interpreter: `nofail` and `nofail ( name )`
// before an uppercase name constrain checking only, so the interpreter drops
// those tokens and reads the program as if they were not written. Elsewhere
// `nofail` is an ordinary name and stays.
import { isUpper } from './poly-parse.mjs';

const upperAt = (tokens, at) => isUpper(tokens[at]?.text ?? '');

// How many tokens a mark occupies at `at`: `nofail` alone, or `nofail ( name
// )`; zero when `nofail` is not directly before a label.
const markLength = (tokens, at) => {
  if (tokens[at].text !== 'nofail') return 0;
  if (upperAt(tokens, at + 1)) return 1;
  const variable = tokens[at + 1]?.text === '(' && tokens[at + 3]?.text === ')'
    && /^[a-z]/.test(tokens[at + 2]?.text ?? '');
  return variable && upperAt(tokens, at + 4) ? 4 : 0;
};

export const withoutMarks = tokens => {
  const kept = [];
  for (let at = 0; at < tokens.length; at += 1) {
    const length = markLength(tokens, at);
    if (length === 0) kept.push(tokens[at]);
    else at += length - 1;
  }
  return kept;
};
