import { isNodeEnvironment } from '../config.js';

/**
 * Fetch Response Interface
 * Compatible with standard fetch API Response
 */
export interface FetchResponse {
  ok: boolean;
  status: number;
  json: () => Promise<any>;
}

/**
 * Fetch Options Interface
 */
export interface FetchOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

/**
 * Universal Fetch utility for GAS/Node.js environments
 *
 * Provides a unified HTTP request interface that works seamlessly
 * in both Google Apps Script and Node.js environments.
 *
 * @example
 * ```typescript
 * import { Fetch } from './utils/fetch.js';
 *
 * // Simple GET request
 * const response = await Fetch.request('https://api.example.com/data');
 * const data = await response.json();
 *
 * // POST request with options
 * const response = await Fetch.request('https://api.example.com/data', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({ key: 'value' })
 * });
 * ```
 */
export const Fetch = (() => {
  /**
   * Execute HTTP request with environment-specific implementation
   *
   * In Node.js: Uses standard fetch API
   * In GAS: Uses UrlFetchApp with compatibility wrapper
   *
   * @param url - The URL to fetch
   * @param options - Fetch options (method, headers, body)
   * @returns Promise resolving to a fetch-compatible response object
   */
  const request = async (
    url: string,
    options: FetchOptions = {}
  ): Promise<FetchResponse> => {
    if (isNodeEnvironment()) {
      // Node.js環境では標準fetchを使用
      return fetch(url, options);
    }

    // GAS環境: UrlFetchAppを使用
    const gasOptions: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
      method: (options.method ||
        'GET') as GoogleAppsScript.URL_Fetch.HttpMethod,
      headers: options.headers || {},
      muteHttpExceptions: true, // ステータスコードに関わらずレスポンスを取得
    };

    if (options.body) {
      gasOptions.payload = options.body;
    }

    const response = UrlFetchApp.fetch(url, gasOptions);
    const responseCode = response.getResponseCode();
    const contentText = response.getContentText();

    // fetch互換のResponseオブジェクトを返す
    return {
      ok: responseCode >= 200 && responseCode < 300,
      status: responseCode,
      json: async () => JSON.parse(contentText),
    };
  };

  return {
    request,
  } as const;
})();
