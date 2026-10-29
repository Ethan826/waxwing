export const program = 'fn main(): Int = 42;';

export const paddingLength = 1000000;

export const padded = program + ' '.repeat(paddingLength);

export const declarationCount = 20000;

export const declarationsFrom = separator => Array.from(
  { length: declarationCount },
  (_, index) => `fn f${index}(): Int = ${index};`).join(separator);
