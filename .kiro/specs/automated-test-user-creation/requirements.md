# Requirements Document

## Introduction

This feature modifies the existing `gen1-test-script.ts` to automatically provision a Cognito test user inline before running tests. The purpose is to enable the test script to run unattended in a GitHub Actions CI workflow, where manually entering credentials is not possible. The script uses the client-side `SignUp` API to create the user (mirroring the real user registration path), followed by `AdminConfirmSignUp` to bypass email verification in CI. This approach tests the sign-up flow while still enabling fully automated execution. The test script validates the frontend's authenticated flows (sign-in, GraphQL mutations, S3 storage operations) against the backend.

## Glossary

- **Test_Script**: The `gen1-test-script.ts` file that orchestrates all Gen1 integration tests (public queries, authenticated mutations, storage operations).
- **Cognito_Client**: An instance of `CognitoIdentityProviderClient` from `@aws-sdk/client-cognito-identity-provider` used to make both client-side and admin-level API calls for test user provisioning.
- **Test_User**: A Cognito user created dynamically at the start of a test run with a unique username, generated password, and a generated email address, used as setup for authenticated test flows.
- **User_Pool_ID**: The Cognito User Pool identifier, read from the Amplify configuration file via the `aws_user_pools_id` field.
- **Client_ID**: The Cognito User Pool client identifier, read from the Amplify configuration file via the `aws_user_pools_web_client_id` field.
- **Amplify_Config**: The JSON configuration file at `src/amplifyconfiguration.json` containing AWS resource identifiers including the User Pool ID, Client ID, and region.
- **CI_Environment**: A GitHub Actions runner with IAM permissions for `cognito-idp:AdminConfirmSignUp`.

## Requirements

### Requirement 1: Dynamic Credential Generation

**User Story:** As a CI pipeline, I want the test script to generate unique credentials for each run, so that parallel test executions do not collide on shared usernames.

#### Acceptance Criteria

1. WHEN the Test_Script starts, THE Test_Script SHALL generate a unique username containing a timestamp or random component to avoid collisions across concurrent runs.
2. WHEN the Test_Script generates a password, THE Test_Script SHALL produce a password that is at least 8 characters long and contains at least one uppercase letter, one lowercase letter, one digit, and one special character.
3. WHEN the Test_Script generates credentials, THE Test_Script SHALL generate an email address in the format `ci-test-{unique-component}@test.example.com` for the sign-up call.
4. THE Test_Script SHALL remove the hardcoded `TEST_USER` block containing placeholder credentials (`YOUR_USERNAME_HERE` / `YOUR_PASSWORD_HERE`).

### Requirement 2: Cognito Test User Provisioning

**User Story:** As a CI pipeline, I want the test script to create a Cognito user via the SignUp API and confirm it via the Admin SDK, so that the frontend's sign-up path is exercised and authenticated test flows can run without manual setup.

#### Acceptance Criteria

1. WHEN the Test_Script has generated credentials, THE Cognito_Client SHALL call `SignUp` with the generated username, password, email attribute, and the Client_ID from the Amplify_Config.
2. WHEN the `SignUp` call succeeds, THE Cognito_Client SHALL call `AdminConfirmSignUp` with the User_Pool_ID and the generated username to bypass email verification.
3. IF the `SignUp` call fails, THEN THE Test_Script SHALL log the error and terminate with a non-zero exit code.
4. IF the `AdminConfirmSignUp` call fails, THEN THE Test_Script SHALL log the error and terminate with a non-zero exit code.

### Requirement 3: Configuration Resolution

**User Story:** As a developer, I want the User Pool ID and Client ID to be resolved automatically from the existing Amplify config, so that no additional environment variables are needed for these values.

#### Acceptance Criteria

1. THE Test_Script SHALL read the User_Pool_ID from the `aws_user_pools_id` field of the Amplify_Config file.
2. THE Test_Script SHALL read the Client_ID from the `aws_user_pools_web_client_id` field of the Amplify_Config file.
3. IF the `aws_user_pools_id` field is missing or empty in the Amplify_Config, THEN THE Test_Script SHALL log a descriptive error and terminate with a non-zero exit code.
4. IF the `aws_user_pools_web_client_id` field is missing or empty in the Amplify_Config, THEN THE Test_Script SHALL log a descriptive error and terminate with a non-zero exit code.

### Requirement 4: Integration with Existing Test Flow

**User Story:** As a developer, I want the dynamically created user credentials to be passed into the existing test flow, so that the frontend's `authenticateUser()` sign-in and all subsequent authenticated operations work without modification to `test-utils.ts`.

#### Acceptance Criteria

1. WHEN the Test_User is provisioned and confirmed, THE Test_Script SHALL pass the generated username and password to `createTestFunctions` as the `TestUser` object.
2. THE Test_Script SHALL preserve the existing test execution order: public queries, then authenticated mutations, then storage operations.
3. THE Test_Script SHALL continue to call `signOutUser()` after all tests complete.
4. THE Test_Script SHALL require zero changes to `test-utils.ts`.

### Requirement 5: AWS SDK Dependency

**User Story:** As a developer, I want the `@aws-sdk/client-cognito-identity-provider` package added as a dependency, so that the Cognito SDK calls can be made from the test script.

#### Acceptance Criteria

1. THE Test_Script SHALL import `CognitoIdentityProviderClient`, `SignUpCommand`, and `AdminConfirmSignUpCommand` from `@aws-sdk/client-cognito-identity-provider`.
2. THE Cognito_Client SHALL be instantiated with the region from the Amplify_Config (`aws_cognito_region`).
