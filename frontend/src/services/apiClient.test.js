import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { tripApi } from './apiClient';

describe('tripApi PDF download', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    URL.createObjectURL = vi.fn(() => 'blob:mock');
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('fetches the PDF blob and triggers a download without navigating', async () => {
    fetch.mockResolvedValue({
      ok: true,
      blob: async () => new Blob(['%PDF-1.3'], { type: 'application/pdf' }),
    });
    const clicks = [];
    const originalCreate = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      const el = originalCreate(tag);
      if (tag === 'a') el.click = () => clicks.push(el);
      return el;
    });
    const appendSpy = vi.spyOn(document.body, 'appendChild');

    await tripApi.downloadPdf('abc123', 'my.pdf');

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/trips/abc123/pdf'),
      expect.objectContaining({ credentials: 'include' })
    );
    expect(clicks.length).toBe(1);
    expect(clicks[0].download).toBe('my.pdf');
    expect(clicks[0].href).toBe('blob:mock');
    expect(appendSpy).toHaveBeenCalled();
  });

  it('throws a readable error when the backend rejects', async () => {
    fetch.mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ message: 'Trip not found' }),
    });
    await expect(tripApi.downloadPdf('missing', 'x.pdf')).rejects.toThrow('Trip not found');
  });
});