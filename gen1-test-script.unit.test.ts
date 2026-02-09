/**
 * Unit tests for config validation edge cases in gen1-test-script.ts
 *
 * Tests that missing configuration values trigger appropriate error messages
 * and process.exit(1) calls.
 *
 * **Validates: Requirements 3.3, 3.4**
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';

// Custom error to catch process.exit calls
class ProcessExitError extends Error {
  code: number;
  constructor(code: number) {
    super(`process.exit(${code})`);
    this.code = code;
  }
}

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

// Use vi.hoisted to create the mutable config object that can be changed per test
const mockConfig = vi.hoisted(() => ({
  current: {
    aws_user_pools_id: 'us-east-1_TestPool',
    aws_user_pools_web_client_id: 'test-client-id-123',
    aws_cognito_region: 'us-east-1',
  } as Record<string, unknown>,
}));

// Mock the amplifyconfiguration.json import to use our mutable config
vi.mock('./src/amplifyconfiguration.json', () => ({
  default: new Proxy(
    {},
    {
      get(_target, prop) {
        return mockConfig.current[prop as string];
      },
      ownKeys() {
        return Object.keys(mockConfig.current);
      },
      getOwnPropertyDescriptor(_target, prop) {
        if (prop in mockConfig.current) {
          return { configurable: true, enumerable: true, value: mockConfig.current[prop as string] };
        }
        return undefined;
      },
    },
  ),
}));

describe('Config Validation - Unit Tests', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Reset config to valid defaults before each test
    mockConfig.current = {
      aws_user_pools_id: 'us-east-1_TestPool',
      aws_user_pools_web_client_id: 'test-client-id-123',
      aws_cognito_region: 'us-east-1',
    };

    // Spy on console.error
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Mock process.exit to throw a custom error so execution stops
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation((code?: number | string | null | undefined) => {
      throw new ProcessExitError(typeof code === 'number' ? code : 1);
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  /**
   * Test: Missing aws_user_pools_id triggers error and exit
   *
   * When aws_user_pools_id is missing from the Amplify configuration,
   * the function should log a descriptive error and terminate with exit code 1.
   *
   * **Validates: Requirements 3.3**
   */
  it('should log error and exit(1) when aws_user_pools_id is missing', async () => {
    // Remove aws_user_pools_id from config
    mockConfig.current = {
      aws_user_pools_web_client_id: 'test-client-id-123',
      aws_cognito_region: 'us-east-1',
    };

    const { createTestUser } = await import('./gen1-test-script');

    await expect(createTestUser()).rejects.toThrow(ProcessExitError);

    expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Missing aws_user_pools_id in Amplify configuration');
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });

  /**
   * Test: Empty aws_user_pools_id triggers error and exit
   *
   * When aws_user_pools_id is an empty string in the Amplify configuration,
   * the function should log a descriptive error and terminate with exit code 1.
   *
   * **Validates: Requirements 3.3**
   */
  it('should log error and exit(1) when aws_user_pools_id is empty string', async () => {
    mockConfig.current = {
      aws_user_pools_id: '',
      aws_user_pools_web_client_id: 'test-client-id-123',
      aws_cognito_region: 'us-east-1',
    };

    const { createTestUser } = await import('./gen1-test-script');

    await expect(createTestUser()).rejects.toThrow(ProcessExitError);

    expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Missing aws_user_pools_id in Amplify configuration');
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });

  /**
   * Test: Missing aws_user_pools_web_client_id triggers error and exit
   *
   * When aws_user_pools_web_client_id is missing from the Amplify configuration,
   * the function should log a descriptive error and terminate with exit code 1.
   *
   * **Validates: Requirements 3.4**
   */
  it('should log error and exit(1) when aws_user_pools_web_client_id is missing', async () => {
    mockConfig.current = {
      aws_user_pools_id: 'us-east-1_TestPool',
      aws_cognito_region: 'us-east-1',
    };

    const { createTestUser } = await import('./gen1-test-script');

    await expect(createTestUser()).rejects.toThrow(ProcessExitError);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '❌ Missing aws_user_pools_web_client_id in Amplify configuration',
    );
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });

  /**
   * Test: Empty aws_user_pools_web_client_id triggers error and exit
   *
   * When aws_user_pools_web_client_id is an empty string in the Amplify configuration,
   * the function should log a descriptive error and terminate with exit code 1.
   *
   * **Validates: Requirements 3.4**
   */
  it('should log error and exit(1) when aws_user_pools_web_client_id is empty string', async () => {
    mockConfig.current = {
      aws_user_pools_id: 'us-east-1_TestPool',
      aws_user_pools_web_client_id: '',
      aws_cognito_region: 'us-east-1',
    };

    const { createTestUser } = await import('./gen1-test-script');

    await expect(createTestUser()).rejects.toThrow(ProcessExitError);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '❌ Missing aws_user_pools_web_client_id in Amplify configuration',
    );
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });
});

/**
 * Unit tests for Cognito API error handling in gen1-test-script.ts
 *
 * Tests that failures in SignUpCommand and AdminConfirmSignUpCommand
 * trigger appropriate error logging and process.exit(1).
 *
 * **Validates: Requirements 2.3, 2.4**
 */
describe('Cognito API Error Handling - Unit Tests', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Set valid config so we get past config validation into the Cognito API calls
    mockConfig.current = {
      aws_user_pools_id: 'us-east-1_TestPool',
      aws_user_pools_web_client_id: 'test-client-id-123',
      aws_cognito_region: 'us-east-1',
    };

    // Spy on console.error and console.log
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    // Mock process.exit to throw a custom error so execution stops
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation((code?: number | string | null | undefined) => {
      throw new ProcessExitError(typeof code === 'number' ? code : 1);
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
    processExitSpy.mockRestore();
    vi.restoreAllMocks();
  });

  /**
   * Test: SignUpCommand failure triggers error logging and process.exit(1)
   *
   * When the SignUp API call fails, the function should log the error message
   * prefixed with '❌ Failed to create test user:' and terminate with exit code 1.
   *
   * **Validates: Requirements 2.3**
   */
  it('should log error and exit(1) when SignUpCommand fails', async () => {
    const signUpError = new Error('User already exists');
    const mockSend = vi.fn().mockRejectedValueOnce(signUpError);

    vi.mocked(CognitoIdentityProviderClient).mockImplementation(function (this: any) {
      this.send = mockSend;
    } as any);

    const { createTestUser } = await import('./gen1-test-script');

    await expect(createTestUser()).rejects.toThrow(ProcessExitError);

    expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Failed to create test user:', 'User already exists');
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });

  /**
   * Test: AdminConfirmSignUpCommand failure triggers error logging and process.exit(1)
   *
   * When the SignUp call succeeds but AdminConfirmSignUp fails, the function should
   * log the error message prefixed with '❌ Failed to create test user:' and terminate
   * with exit code 1.
   *
   * **Validates: Requirements 2.4**
   */
  it('should log error and exit(1) when AdminConfirmSignUpCommand fails', async () => {
    const confirmError = new Error('User cannot be confirmed');
    const mockSend = vi.fn()
      .mockResolvedValueOnce({}) // SignUpCommand succeeds
      .mockRejectedValueOnce(confirmError); // AdminConfirmSignUpCommand fails

    vi.mocked(CognitoIdentityProviderClient).mockImplementation(function (this: any) {
      this.send = mockSend;
    } as any);

    const { createTestUser } = await import('./gen1-test-script');

    await expect(createTestUser()).rejects.toThrow(ProcessExitError);

    expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Failed to create test user:', 'User cannot be confirmed');
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });
});
