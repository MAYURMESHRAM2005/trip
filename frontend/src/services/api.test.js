import { describe, it, expect, vi, afterEach } from 'vitest';
import { resolveBaseUrl } from './api';

describe('resolveBaseUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('defaults to /api (dev proxy) when unset', () => {
    vi.stubEnv('VITE_API_URL', '');
    expect(resolveBaseUrl()).toBe('/api');
  });

  it('appends /api when the host is given without the prefix', () => {
    vi.stubEnv('VITE_API_URL', 'https://travelmindai.onrender.com');
    expect(resolveBaseUrl()).toBe('https://travelmindai.onrender.com/api');
  });

  it('does not duplicate an existing /api prefix', () => {
    vi.stubEnv('VITE_API_URL', 'https://travelmindai.onrender.com/api/');
    expect(resolveBaseUrl()).toBe('https://travelmindai.onrender.com/api');
  });
});
