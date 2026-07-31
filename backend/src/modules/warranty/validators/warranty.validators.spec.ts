import { isWarrantyActive } from '../validators/warranty.validators';
import { claimStatusLabel } from '../mappers/warranty.mapper';

describe('warranty validators/mappers', () => {
  it('detects active warranty', () => {
    expect(isWarrantyActive('active', new Date(Date.now() + 1000))).toBe(true);
    expect(isWarrantyActive('expired', new Date(Date.now() + 1000))).toBe(false);
    expect(isWarrantyActive('active', new Date(Date.now() - 1000))).toBe(false);
  });

  it('maps claim labels for docs', () => {
    expect(claimStatusLabel('in_service')).toBe('repair');
    expect(claimStatusLabel('closed')).toBe('completed');
    expect(claimStatusLabel('approved')).toBe('approved');
  });
});
