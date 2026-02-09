/**
 * Property-based tests for credential generation helpers in gen1-test-script.ts
 *
 * Uses fast-check to validate correctness properties across many random inputs.
 * Each property test runs a minimum of 100 iterations.
 *
 * **Validates: Requirements 1.1, 1.2, 1.3**
 */

import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';

// Mock aws-amplify to prevent Amplify.configure() side effect at module load
vi.mock('aws-amplify', () => ({
  Amplify: {
    configure: vi.fn(),
  },
}));

// Mock the Cognito SDK to prevent any side effects
vi.mock('@aws-sdk/client-cognito-identity-provider', () => ({
  CognitoIdentityProviderClient: vi.fn(),
  SignUpCommand: vi.fn(),
  AdminConfirmSignUpCommand: vi.fn(),
}));

import { generateUsername, generatePassword, generateEmail } from './gen1-test-script';

describe('Credential Generation - Property-Based Tests', () => {
  /**
   * Property 1: Username uniqueness
   *
   * *For any* set of N generated usernames (where N ≥ 2),
   * all usernames in the set SHALL be distinct.
   *
   * **Validates: Requirements 1.1**
   */
  it('Property 1: all generated usernames are unique', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 20 }),
        (count) => {
          const usernames = Array.from({ length: count }, () => generateUsername());
          const uniqueUsernames = new Set(usernames);
          expect(uniqueUsernames.size).toBe(usernames.length);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 2: Password policy compliance
   *
   * *For any* generated password, the password SHALL be at least 8 characters long
   * AND contain at least one uppercase letter, at least one lowercase letter,
   * at least one digit, and at least one special character.
   *
   * **Validates: Requirements 1.2**
   */
  it('Property 2: every generated password satisfies Cognito password policy', () => {
    fc.assert(
      fc.property(
        fc.constant(null),
        () => {
          const password = generatePassword();

          // At least 8 characters
          expect(password.length).toBeGreaterThanOrEqual(8);

          // Contains at least one uppercase letter
          expect(password).toMatch(/[A-Z]/);

          // Contains at least one lowercase letter
          expect(password).toMatch(/[a-z]/);

          // Contains at least one digit
          expect(password).toMatch(/[0-9]/);

          // Contains at least one special character
          expect(password).toMatch(/[^A-Za-z0-9]/);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 3: Email format compliance
   *
   * *For any* generated email, the email SHALL match the pattern
   * `ci-test-{non-empty-string}@test.example.com`.
   *
   * **Validates: Requirements 1.3**
   */
  it('Property 3: every generated email matches ci-test-{non-empty}@test.example.com', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        (uniqueId) => {
          const email = generateEmail(uniqueId);

          // Must match the exact pattern: ci-test-{non-empty}@test.example.com
          expect(email).toMatch(/^ci-test-.+@test\.example\.com$/);

          // The unique component must be non-empty
          const match = email.match(/^ci-test-(.+)@test\.example\.com$/);
          expect(match).not.toBeNull();
          expect(match![1].length).toBeGreaterThan(0);
        },
      ),
      { numRuns: 100 },
    );
  });
});
