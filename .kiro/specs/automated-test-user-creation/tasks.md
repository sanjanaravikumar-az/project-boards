# Implementation Plan: Automated Test User Creation for CI

## Overview

Modify `gen1-test-script.ts` to dynamically provision a Cognito test user using `SignUp` + `AdminConfirmSignUp` before running tests. Add `@aws-sdk/client-cognito-identity-provider` as a dev dependency. All changes are inline in the existing script — no new files except tests.

## Tasks

- [x] 1. Add AWS SDK dependency and imports
  - [x] 1.1 Install `@aws-sdk/client-cognito-identity-provider` as a dev dependency
    - Run `npm install --save-dev @aws-sdk/client-cognito-identity-provider`
    - _Requirements: 5.1_
  - [x] 1.2 Add SDK imports to `gen1-test-script.ts`
    - Import `CognitoIdentityProviderClient`, `SignUpCommand`, `AdminConfirmSignUpCommand`
    - _Requirements: 5.1, 5.2_

- [x] 2. Implement credential generation and user provisioning
  - [x] 2.1 Implement credential generation helpers in `gen1-test-script.ts`
    - Add `generateUsername()` returning `ci-test-{timestamp}-{random4hex}` format
    - Add `generatePassword()` returning `CiTest1!` + 8 random alphanumeric chars
    - Add `generateEmail(uniqueId)` returning `ci-test-{uniqueId}@test.example.com`
    - _Requirements: 1.1, 1.2, 1.3_
  - [x] 2.2 Write property tests for credential generators
    - **Property 1: Username uniqueness** — generate many usernames, assert all distinct
    - **Property 2: Password policy compliance** — each password has ≥8 chars, uppercase, lowercase, digit, special char
    - **Property 3: Email format compliance** — each email matches `ci-test-{non-empty}@test.example.com`
    - Use `fast-check` library, minimum 100 iterations per property
    - **Validates: Requirements 1.1, 1.2, 1.3**
  - [x] 2.3 Implement `createTestUser()` async function in `gen1-test-script.ts`
    - Read `aws_user_pools_id`, `aws_user_pools_web_client_id`, `aws_cognito_region` from `amplifyconfig`
    - Validate config values are present (fail-fast with `process.exit(1)` if missing)
    - Instantiate `CognitoIdentityProviderClient` with region
    - Call `SignUpCommand` with clientId, username, password, email attribute
    - Call `AdminConfirmSignUpCommand` with userPoolId and username
    - Return `{ username, password }` matching `TestUser` interface
    - Log errors and call `process.exit(1)` on any failure
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4_

- [x] 3. Wire into existing test flow
  - [x] 3.1 Replace hardcoded `TEST_USER` block in `runAllTests()`
    - Remove the `const TEST_USER = { username: 'YOUR_USERNAME_HERE', ... }` block
    - Remove the `if (TEST_USER.username === 'YOUR_USERNAME_HERE')` guard
    - Call `await createTestUser()` at the start of `runAllTests()` to get credentials
    - Pass returned credentials to `createTestFunctions(testUser)`
    - Preserve existing test execution order: public queries → mutations → storage → sign out
    - _Requirements: 1.4, 4.1, 4.2, 4.3, 4.4_

- [x] 4. Checkpoint
  - Ensure the script compiles with `npx tsc --noEmit`
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Write unit tests for error handling
  - [x] 5.1 Write unit tests for config validation edge cases
    - Test missing `aws_user_pools_id` triggers error and exit
    - Test missing `aws_user_pools_web_client_id` triggers error and exit
    - _Requirements: 3.3, 3.4_
  - [x] 5.2 Write unit tests for Cognito API error handling
    - Mock `SignUpCommand` failure, verify error logging and `process.exit(1)`
    - Mock `AdminConfirmSignUpCommand` failure, verify error logging and `process.exit(1)`
    - _Requirements: 2.3, 2.4_

- [x] 6. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise.
