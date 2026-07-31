import { WarrantyClaimStore } from './warranty-claim.store';

describe('WarrantyClaimStore', () => {
  it('loads claim snapshot', async () => {
    const prisma = {
      warrantyClaim: {
        findFirst: jest.fn(async () => ({
          id: 'c1',
          claim_number: 'WC-1',
          status: 'submitted',
          submitted_at: new Date('2026-01-01'),
          resolved_at: null,
        })),
      },
    };
    const store = new WarrantyClaimStore(prisma as never);
    const snap = await store.load({ kind: 'warranty_claim', id: 'c1' });
    expect(snap?.status).toBe('submitted');
    expect(snap?.number).toBe('WC-1');
  });

  it('saveStatus writes history', async () => {
    const prisma = {
      warrantyClaim: {
        findFirstOrThrow: jest.fn(async () => ({
          id: 'c1',
          status: 'submitted',
          resolved_at: null,
        })),
        update: jest.fn(async () => ({})),
        findFirst: jest.fn(async () => ({
          id: 'c1',
          claim_number: 'WC-1',
          status: 'under_review',
          submitted_at: new Date(),
          resolved_at: null,
        })),
      },
      warrantyStatusHistory: { create: jest.fn() },
    };
    const store = new WarrantyClaimStore(prisma as never);
    const snap = await store.saveStatus(
      { kind: 'warranty_claim', id: 'c1' },
      'under_review',
      'admin',
    );
    expect(snap.status).toBe('under_review');
    expect(prisma.warrantyStatusHistory.create).toHaveBeenCalled();
  });
});
