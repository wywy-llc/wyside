import { google as googleApi } from 'googleapis';
import { isGasEnvironment } from '../config.js';

// Token cache with expiration
interface CachedToken {
  token: string;
  expiresAt: number; // Unix timestamp in milliseconds
}

// Cache tokens by scope combination (key = scopes.sort().join(','))
const tokenCache = new Map<string, CachedToken>();

// Singleton GoogleAuth client for Node.js environment
let googleAuthClient: InstanceType<typeof googleApi.auth.GoogleAuth> | null =
  null;

// Token TTL: 45 minutes (Google tokens typically valid for 1 hour, use 45 min for safety)
const TOKEN_TTL_MS = 45 * 60 * 1000;

// Deployment version tracking: Clear cache on redeploy
// This ensures stale tokens don't persist across deployments
const DEPLOYMENT_VERSION = Date.now().toString();
let cachedDeploymentVersion: string | null = null;

/**
 * Check if deployment version has changed and clear cache if needed
 */
function checkDeploymentVersion(): void {
  if (cachedDeploymentVersion === null) {
    // First initialization
    cachedDeploymentVersion = DEPLOYMENT_VERSION;
  } else if (cachedDeploymentVersion !== DEPLOYMENT_VERSION) {
    // Deployment version changed - clear cache
    tokenCache.clear();
    googleAuthClient = null;
    cachedDeploymentVersion = DEPLOYMENT_VERSION;
  }
}

/**
 * Get cache key from scopes array
 */
function getCacheKey(scopes: string[]): string {
  return [...scopes].sort().join(',');
}

/**
 * Check if cached token is still valid
 */
function isTokenValid(cached: CachedToken): boolean {
  return cached.expiresAt > Date.now();
}

/**
 * 環境に応じたOAuth認証トークンを取得
 *
 * GAS環境: ScriptApp.getOAuthToken()を使用
 * Node.js環境: Service Account認証を使用
 *
 * Tokens are cached with 45-minute TTL to avoid repeated auth calls.
 * GoogleAuth client is reused as singleton in Node.js environment.
 *
 * Deployment Safety: Cache is automatically cleared on redeploy to prevent stale tokens.
 *
 * @param scopes - 必要なOAuthスコープ
 * @returns OAuth認証トークン
 *
 * @example
 * ```typescript
 * import { getOAuthToken } from './utils/auth.js';
 *
 * const token = await getOAuthToken(['https://www.googleapis.com/auth/spreadsheets']);
 * ```
 */
export const getOAuthToken = async (scopes: string[]): Promise<string> => {
  // Check deployment version and clear cache if changed
  checkDeploymentVersion();

  const cacheKey = getCacheKey(scopes);

  // Check cache first
  const cached = tokenCache.get(cacheKey);
  if (cached && isTokenValid(cached)) {
    return cached.token;
  }

  let token: string;

  if (isGasEnvironment()) {
    // GAS環境: ScriptApp.getOAuthToken()を使用
    token = ScriptApp.getOAuthToken();
  } else {
    // Node.js環境: Service Account認証
    // Reuse GoogleAuth client as singleton
    if (!googleAuthClient) {
      googleAuthClient = new googleApi.auth.GoogleAuth({
        keyFile:
          process.env.GOOGLE_APPLICATION_CREDENTIALS ||
          './secrets/service-account.json',
        scopes,
      });
    }

    const client = await googleAuthClient.getClient();
    const tokenResponse = await client.getAccessToken();
    token = tokenResponse.token!;
  }

  // Cache token with expiration
  tokenCache.set(cacheKey, {
    token,
    expiresAt: Date.now() + TOKEN_TTL_MS,
  });

  return token;
};

/**
 * Clear token cache (useful for testing or forced re-authentication)
 *
 * @param scopes - Optional: clear specific scope combination. If omitted, clears all.
 */
export const clearTokenCache = (scopes?: string[]): void => {
  if (scopes) {
    const cacheKey = getCacheKey(scopes);
    tokenCache.delete(cacheKey);
  } else {
    tokenCache.clear();
    googleAuthClient = null;
  }
};
