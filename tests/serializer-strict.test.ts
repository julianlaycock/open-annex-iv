/**
 * Strict serializer tests.
 *
 * The happy-path (valid serializer output passes XSD validation) is
 * already covered by tests/xsd-validation.test.ts. This file focuses on
 * the parts unique to the strict variant: the AnnexIVSchemaValidationError
 * wrapper, its message shape, and its payload.
 *
 * Regression context — H3 (April 2026): the non-strict serializer emitted
 * a fabricated <AIFOpenPrincipleInfo> element. The strict variant is the
 * future guard against this class of bug; this test suite is the
 * contract for how it surfaces the failure to callers.
 */

import assert from 'assert/strict';
import { AnnexIVSchemaValidationError } from '../src/serializer-strict.js';

let passed = 0;
let failed = 0;
function test(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`  \u2713 ${name}`);
    passed++;
  } catch (err) {
    console.error(`  \u2717 ${name}`);
    console.error(`    ${(err as Error).message}`);
    failed++;
  }
}

console.log('@open-annex-iv/core \u2014 Strict Serializer Tests\n');

test('error message includes first 3 errors + overflow count', () => {
  const err = new AnnexIVSchemaValidationError(
    {
      valid: false,
      errors: [
        { message: 'Error A', line: 10 },
        { message: 'Error B', line: 20 },
        { message: 'Error C', line: 30 },
        { message: 'Error D', line: 40 },
        { message: 'Error E', line: 50 },
      ],
      warnings: [],
      method: 'xsd',
    },
    '<xml/>'
  );
  assert(
    err.message.includes('line 10: Error A'),
    'first error not in message'
  );
  assert(
    err.message.includes('line 20: Error B'),
    'second error not in message'
  );
  assert(
    err.message.includes('line 30: Error C'),
    'third error not in message'
  );
  assert(err.message.includes('+2 more'), 'overflow count not in message');
});

test('error message handles single-error case (no spurious overflow)', () => {
  const err = new AnnexIVSchemaValidationError(
    {
      valid: false,
      errors: [{ message: 'Only one', line: null }],
      warnings: [],
      method: 'pattern',
    },
    '<xml/>'
  );
  assert(err.message.includes('Only one'), 'message missing');
  assert(!err.message.includes('more'), 'false overflow in message');
  assert(err.message.includes('1 error'), 'error count wording');
});

test('error message includes error count', () => {
  const err = new AnnexIVSchemaValidationError(
    {
      valid: false,
      errors: [
        { message: 'One', line: null },
        { message: 'Two', line: null },
      ],
      warnings: [],
      method: 'xsd',
    },
    '<xml/>'
  );
  // Constructor uses compact "N error(s)" form for ease of parsing.
  assert(err.message.includes('2 error(s)'), 'error count missing');
});

test('error carries full validation result + original XML', () => {
  const result = {
    valid: false,
    errors: [{ message: 'X', line: 1 }],
    warnings: ['some warning'],
    method: 'xsd' as const,
  };
  const xml = '<original>payload</original>';
  const err = new AnnexIVSchemaValidationError(result, xml);
  assert(err.result === result, 'result not preserved');
  assert(err.xml === xml, 'xml not preserved');
  assert(err.name === 'AnnexIVSchemaValidationError', 'error name wrong');
  assert(err instanceof Error, 'not an Error subclass');
});

test('error message distinguishes xsd vs pattern validation method', () => {
  const xsdErr = new AnnexIVSchemaValidationError(
    {
      valid: false,
      errors: [{ message: 'E' }],
      warnings: [],
      method: 'xsd',
    },
    ''
  );
  const patternErr = new AnnexIVSchemaValidationError(
    {
      valid: false,
      errors: [{ message: 'E' }],
      warnings: [],
      method: 'pattern',
    },
    ''
  );
  assert(xsdErr.message.includes('xsd validation'), 'xsd not in message');
  assert(
    patternErr.message.includes('pattern validation'),
    'pattern not in message'
  );
});

console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
