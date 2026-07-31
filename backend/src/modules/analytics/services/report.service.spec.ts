import { ReportService } from './report.service';

describe('ReportService', () => {
  it('returns json synchronously without queue', async () => {
    const kpis = { list: jest.fn(async () => [{ id: 'k1' }]) };
    const service = new ReportService(
      { client: {}, audit: jest.fn() } as never,
      {} as never,
      {} as never,
      { enqueue: jest.fn() } as never,
      {} as never,
      { get: jest.fn() } as never,
      {} as never,
      {} as never,
      kpis as never,
    );
    const out = await service.enqueueGenerate('u1', { format: 'json' });
    expect(out.status).toBe('completed');
    expect(out.format).toBe('json');
  });

  it('queues csv export', async () => {
    const enqueue = jest.fn();
    const create = jest.fn(async () => ({ id: 'e1' }));
    const service = new ReportService(
      {
        client: { reportExport: { create } },
        audit: jest.fn(),
      } as never,
      {} as never,
      {} as never,
      { enqueue } as never,
      {} as never,
      { get: jest.fn() } as never,
      {} as never,
      {} as never,
      {} as never,
    );
    const out = await service.enqueueGenerate('u1', { format: 'csv' });
    expect(out.exportId).toBe('e1');
    expect(enqueue).toHaveBeenCalled();
  });
});
