import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * SheetsClient tests to ensure GAS compatibility
 *
 * This test suite verifies that SheetsClient never uses the native `fetch` API directly,
 * which is not available in GAS environment. All HTTP requests must use Fetch.request
 * which provides a polyfill using UrlFetchApp in GAS.
 */
describe('SheetsClient GAS Compatibility', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('should not use native fetch API directly in batchUpdate', async () => {
    // Mock Fetch.request to track calls
    const mockFetchRequest = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ replies: [] }),
    });

    // Mock the Fetch module
    vi.doMock('@/utils/fetch.js', () => ({
      Fetch: {
        request: mockFetchRequest,
      },
    }));

    // Mock getOAuthToken
    vi.doMock('@/utils/auth.js', () => ({
      getOAuthToken: vi.fn().mockResolvedValue('mock-token'),
    }));

    // Import SheetsClient after mocking
    const { SheetsClient } = await import('@/core/client.js');

    // Call batchUpdate
    await SheetsClient.batchUpdate('test-spreadsheet-id', [
      {
        updateSheetProperties: {
          properties: { title: 'Test' },
          fields: 'title',
        },
      },
    ]);

    // Verify Fetch.request was called (not native fetch)
    expect(mockFetchRequest).toHaveBeenCalledTimes(1);
    expect(mockFetchRequest).toHaveBeenCalledWith(
      expect.stringContaining('batchUpdate'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer mock-token',
        }),
      })
    );
  });

  it('should not use native fetch API directly in batchGet', async () => {
    // Mock Fetch.request to track calls
    const mockFetchRequest = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ valueRanges: [{ values: [] }] }),
    });

    // Mock the Fetch module
    vi.doMock('@/utils/fetch.js', () => ({
      Fetch: {
        request: mockFetchRequest,
      },
    }));

    // Mock getOAuthToken
    vi.doMock('@/utils/auth.js', () => ({
      getOAuthToken: vi.fn().mockResolvedValue('mock-token'),
    }));

    // Import SheetsClient after mocking
    const { SheetsClient } = await import('@/core/client.js');

    // Call batchGet
    await SheetsClient.batchGet('test-spreadsheet-id', ['Sheet1!A1:B10']);

    // Verify Fetch.request was called (not native fetch)
    expect(mockFetchRequest).toHaveBeenCalledTimes(1);
    expect(mockFetchRequest).toHaveBeenCalledWith(
      expect.stringContaining('batchGet'),
      expect.objectContaining({
        method: 'GET',
      })
    );
  });

  it('should not use native fetch API directly in appendValues', async () => {
    // Mock Fetch.request to track calls
    const mockFetchRequest = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ updates: { updatedRows: 1 } }),
    });

    // Mock the Fetch module
    vi.doMock('@/utils/fetch.js', () => ({
      Fetch: {
        request: mockFetchRequest,
      },
    }));

    // Mock getOAuthToken
    vi.doMock('@/utils/auth.js', () => ({
      getOAuthToken: vi.fn().mockResolvedValue('mock-token'),
    }));

    // Import SheetsClient after mocking
    const { SheetsClient } = await import('@/core/client.js');

    // Call appendValues
    await SheetsClient.appendValues('test-spreadsheet-id', 'Sheet1!A1', [
      ['value1', 'value2'],
    ]);

    // Verify Fetch.request was called (not native fetch)
    expect(mockFetchRequest).toHaveBeenCalledTimes(1);
    expect(mockFetchRequest).toHaveBeenCalledWith(
      expect.stringContaining('append'),
      expect.objectContaining({
        method: 'POST',
      })
    );
  });

  it('should not use native fetch API directly in updateValues', async () => {
    // Mock Fetch.request to track calls
    const mockFetchRequest = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ updatedRows: 1 }),
    });

    // Mock the Fetch module
    vi.doMock('@/utils/fetch.js', () => ({
      Fetch: {
        request: mockFetchRequest,
      },
    }));

    // Mock getOAuthToken
    vi.doMock('@/utils/auth.js', () => ({
      getOAuthToken: vi.fn().mockResolvedValue('mock-token'),
    }));

    // Import SheetsClient after mocking
    const { SheetsClient } = await import('@/core/client.js');

    // Call updateValues
    await SheetsClient.updateValues('test-spreadsheet-id', 'Sheet1!A1', [
      ['updated-value'],
    ]);

    // Verify Fetch.request was called (not native fetch)
    expect(mockFetchRequest).toHaveBeenCalledTimes(1);
    expect(mockFetchRequest).toHaveBeenCalledWith(
      expect.stringContaining('Sheet1'),
      expect.objectContaining({
        method: 'PUT',
      })
    );
  });

  it('should throw error if Fetch.request is not available (simulating GAS without polyfill)', async () => {
    // Mock Fetch module with undefined request
    vi.doMock('@/utils/fetch.js', () => ({
      Fetch: {
        request: undefined,
      },
    }));

    // Mock getOAuthToken
    vi.doMock('@/utils/auth.js', () => ({
      getOAuthToken: vi.fn().mockResolvedValue('mock-token'),
    }));

    // Import SheetsClient after mocking
    const { SheetsClient } = await import('@/core/client.js');

    // Expect error when calling any method
    await expect(
      SheetsClient.batchUpdate('test-spreadsheet-id', [])
    ).rejects.toThrow();
  });
});
