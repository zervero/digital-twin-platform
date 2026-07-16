import { describe, expect, it } from 'vitest';

import { isOfficialCatalogVendor } from '../useMarketplaceInstall.js';

describe('isOfficialCatalogVendor', () => {
  it('recognizes first-party vendor labels', () => {
    expect(isOfficialCatalogVendor('Digital Twin')).toBe(true);
    expect(isOfficialCatalogVendor('@dt')).toBe(true);
    expect(isOfficialCatalogVendor('DT')).toBe(true);
  });

  it('rejects third-party vendors', () => {
    expect(isOfficialCatalogVendor('Acme')).toBe(false);
    expect(isOfficialCatalogVendor('')).toBe(false);
  });
});
