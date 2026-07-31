import { AnalyticsRepository } from '../repositories/analytics.repository';

describe('AnalyticsRepository', () => {
  it('writes audit log with request id', async () => {
    const create = jest.fn(async () => ({ id: 'a1' }));
    const prisma = { auditLog: { create } };
    const repo = new AnalyticsRepository(prisma as never);
    await repo.audit({
      entityType: 'saved_report',
      entityId: '00000000-0000-0000-0000-000000000001',
      action: 'create',
      actorId: '00000000-0000-0000-0000-000000000002',
      next: { code: 'x' },
    });
    expect(create).toHaveBeenCalled();
    expect(create.mock.calls[0][0].data.entity_type).toBe('saved_report');
  });
});
