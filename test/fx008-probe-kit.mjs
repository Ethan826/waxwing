// Constructors for the FX008 probe table (test/fx008-probe-table*.mjs).
// `pattern` is a RegExp source string, not a RegExp, so that JSON.stringify
// (the tamper hash) records it.
export const ok = (stdout, go, stderr = '', status = 0) =>
  ({ accepted: true, stdout, stderr, status, go });

export const no = (code, message, start, end) =>
  ({ accepted: false, code, message, start, end });

export const noPattern = (code, pattern, start, end) =>
  ({ accepted: false, code, pattern, start, end });

// FX008 defaults to today's outcome; `change` carries fx008, task, reason
// and slow for the entries a task is allowed to move.
export const probe = (file, today, change = {}) =>
  ({ file, today, fx008: today, flipped: false, ...change });
