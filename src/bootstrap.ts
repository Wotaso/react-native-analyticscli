import { AnalyticsClient } from './analytics-client.js';
import type { InitFromEnvMissingConfig, InitFromEnvOptions } from './types.js';

export const DEFAULT_API_KEY_ENV_KEYS = [
  'PRODINFOS_WRITE_KEY',
  'NEXT_PUBLIC_PRODINFOS_WRITE_KEY',
  'EXPO_PUBLIC_PRODINFOS_WRITE_KEY',
  'VITE_PRODINFOS_WRITE_KEY',
] as const;

export const DEFAULT_PROJECT_ID_ENV_KEYS = [
  'PRODINFOS_PROJECT_ID',
  'NEXT_PUBLIC_PRODINFOS_PROJECT_ID',
  'EXPO_PUBLIC_PRODINFOS_PROJECT_ID',
  'VITE_PRODINFOS_PROJECT_ID',
] as const;

const readTrimmedString = (value: unknown): string => {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value).trim();
  }

  return '';
};

const resolveDefaultEnv = (): Record<string, unknown> => {
  const withProcess = globalThis as typeof globalThis & {
    process?: { env?: Record<string, unknown> };
  };

  if (typeof withProcess.process?.env === 'object' && withProcess.process.env !== null) {
    return withProcess.process.env;
  }

  return {};
};

const resolveValueFromEnv = (env: Record<string, unknown>, keys: string[]): string => {
  for (const key of keys) {
    const value = readTrimmedString(env[key]);
    if (value.length > 0) {
      return value;
    }
  }

  return '';
};

const toMissingMessage = (details: InitFromEnvMissingConfig): string => {
  const parts: string[] = [];

  if (details.missingApiKey) {
    parts.push(`apiKey (searched: ${details.searchedApiKeyEnvKeys.join(', ') || 'none'})`);
  }

  return `[prodinfos-sdk] Missing required configuration: ${parts.join('; ')}.`;
};

/**
 * Minimal host-app bootstrap helper.
 * Resolves `apiKey` (required) and optional `projectId` from explicit options or env-like objects.
 */
export const initFromEnv = (options: InitFromEnvOptions = {}): AnalyticsClient => {
  const {
    env,
    apiKey,
    projectId,
    apiKeyEnvKeys,
    projectIdEnvKeys,
    missingConfigMode = 'noop',
    onMissingConfig,
    ...clientOptions
  } = options;

  const resolvedApiKeyEnvKeys = [...(apiKeyEnvKeys ?? DEFAULT_API_KEY_ENV_KEYS)];
  const resolvedProjectIdEnvKeys = [...(projectIdEnvKeys ?? DEFAULT_PROJECT_ID_ENV_KEYS)];

  const envSource = env ?? resolveDefaultEnv();
  const resolvedApiKey =
    readTrimmedString(apiKey) || resolveValueFromEnv(envSource, resolvedApiKeyEnvKeys);
  const resolvedProjectId =
    readTrimmedString(projectId) || resolveValueFromEnv(envSource, resolvedProjectIdEnvKeys);

  const missingConfig: InitFromEnvMissingConfig = {
    missingApiKey: resolvedApiKey.length === 0,
    missingProjectId: false,
    searchedApiKeyEnvKeys: resolvedApiKeyEnvKeys,
    searchedProjectIdEnvKeys: resolvedProjectIdEnvKeys,
  };

  if (missingConfig.missingApiKey) {
    onMissingConfig?.(missingConfig);

    if (missingConfigMode === 'throw') {
      throw new Error(toMissingMessage(missingConfig));
    }
  }

  return new AnalyticsClient({
    ...clientOptions,
    apiKey: resolvedApiKey,
    projectId: resolvedProjectId,
  });
};
