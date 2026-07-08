import { describe, it, expect } from 'vitest';
import { parse } from '../interpreter/parser';
import { execute } from '../interpreter/executor';
import { EXAMPLES } from './index';

describe('bundled examples', () => {
  for (const example of EXAMPLES) {
    it(`"${example.name}" parses and runs to completion without error`, () => {
      const ast = parse(example.code);
      const steps = [...execute(ast)];
      expect(steps.length).toBeGreaterThan(0);
    });
  }
});
