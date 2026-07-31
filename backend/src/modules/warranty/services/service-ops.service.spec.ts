import { ServiceOpsService } from './service-ops.service';

describe('ServiceOpsService', () => {
  function build() {
    const ticket = {
      id: 't-1',
      ticket_number: 'ST-1',
      status: 'created',
      priority: 3,
      opened_at: new Date(),
      technician_id: null,
      customer_id: 'user-1',
      serial_number_id: null,
      service_center_id: 'sc-1',
    };

    const repo = {
      client: {
        serviceCenter: {
          findFirst: jest.fn(async () => ({ id: 'sc-1' })),
          findMany: jest.fn(async () => []),
        },
        technician: {
          findFirst: jest.fn(async () => ({
            id: 'tech-1',
            is_available: true,
            status: 'active',
          })),
          findMany: jest.fn(async () => []),
        },
        serviceTicket: {
          create: jest.fn(async () => ticket),
          findFirst: jest.fn(async () => ticket),
          findMany: jest.fn(async () => [ticket]),
          count: jest.fn(async () => 1),
        },
        repairJob: {
          create: jest.fn(async () => ({
            id: 'rj-1',
            repair_number: 'RJ-1',
            ticket_id: 't-1',
            technician_id: 'tech-1',
            created_at: new Date(),
            labor_cost: 0,
          })),
          findFirst: jest.fn(async () => ({
            id: 'rj-1',
            repair_number: 'RJ-1',
            ticket_id: 't-1',
            technician_id: 'tech-1',
            outcome: 'pending',
            labor_cost: 0,
            repair_minutes: null,
            repair_notes: null,
            started_at: null,
            part_usage: [],
          })),
          findFirstOrThrow: jest.fn(async () => ({
            id: 'rj-1',
            outcome: 'repaired',
            ticket_id: 't-1',
          })),
          update: jest.fn(),
          count: jest.fn(async () => 0),
        },
        serviceAuditLog: { create: jest.fn() },
        diagnosticReport: {
          create: jest.fn(async () => ({
            id: 'diag-1',
            ticket_id: 't-1',
            findings: 'ok',
          })),
        },
        deviceHealthReport: { create: jest.fn() },
        loanDevice: {
          findFirst: jest.fn(async () => ({
            id: 'loan-1',
            status: 'available',
          })),
          count: jest.fn(async () => 2),
        },
        loanAllocation: {
          create: jest.fn(async () => ({
            id: 'alloc-1',
            status: 'active',
          })),
        },
        $transaction: jest.fn(async (fn: (tx: unknown) => unknown) =>
          fn({
            loanDevice: { update: jest.fn() },
            loanAllocation: {
              create: jest.fn(async () => ({
                id: 'alloc-1',
                status: 'active',
              })),
            },
          }),
        ),
        repairPart: {
          findFirst: jest.fn(async () => ({
            id: 'part-1',
            variant_id: 'var-1',
            warehouse_id: 'wh-1',
            unit_cost: 10,
          })),
        },
        repairPartUsage: {
          create: jest.fn(async () => ({ id: 'usage-1', quantity: 1 })),
        },
        warrantyClaim: { count: jest.fn(async () => 0) },
        rmaRequest: { count: jest.fn(async () => 0) },
        replacementRequest: { create: jest.fn() },
      },
      audit: jest.fn(),
    };

    const cache = {
      getOrSet: jest.fn((_k: string, fn: () => Promise<unknown>) => fn()),
      invalidateCenters: jest.fn(),
      invalidateDevice: jest.fn(),
    };
    const locks = {
      withLock: jest.fn((_k: string, fn: () => Promise<unknown>) => fn()),
    };
    const cases = {
      registerStore: jest.fn(),
      recordOpened: jest.fn(),
      transition: jest.fn(async (_r: unknown, to: string) => ({ status: to })),
      assign: jest.fn(async () => ({ status: 'assigned' })),
      get: jest.fn(async () => ({ status: 'open' })),
      timeline: jest.fn(async () => []),
    };
    const events = {
      ticketCreated: jest.fn(),
      ticketClosed: jest.fn(),
      repairStarted: jest.fn(),
      repairCompleted: jest.fn(),
      loanAllocated: jest.fn(),
      deviceReplaced: jest.fn(),
    };
    const queues = { enqueue: jest.fn() };
    const inventory = {
      reserve: jest.fn(async () => ({ id: 'res-1' })),
    };

    const service = new ServiceOpsService(
      repo as never,
      cache as never,
      locks as never,
      cases as never,
      {} as never,
      {} as never,
      events as never,
      queues as never,
      inventory as never,
    );
    return { service, cases, events, inventory, locks };
  }

  it('creates ticket and opens case', async () => {
    const { service, cases, events } = build();
    const result = await service.createTicket('user-1', {
      serviceCenterId: 'sc-1',
      title: 'No power',
    });
    expect(result.id).toBe('t-1');
    expect(cases.recordOpened).toHaveBeenCalled();
    expect(events.ticketCreated).toHaveBeenCalled();
  });

  it('assigns technician under lock', async () => {
    const { service, cases } = build();
    const result = await service.assignTechnician('admin-1', {
      ticketId: 't-1',
      technicianId: 'tech-1',
    });
    expect(result.technicianId).toBe('tech-1');
    expect(cases.transition).toHaveBeenCalled();
    expect(cases.assign).toHaveBeenCalled();
  });

  it('creates repair job and emits repair.started', async () => {
    const { service, events } = build();
    const result = await service.createRepairJob('admin-1', {
      ticketId: 't-1',
      technicianId: 'tech-1',
    });
    expect(result.id).toBe('rj-1');
    expect(events.repairStarted).toHaveBeenCalled();
  });

  it('allocates loan device when available', async () => {
    const { service, events } = build();
    const result = await service.allocateLoanDevice('admin-1', {
      loanDeviceId: 'loan-1',
      ticketId: 't-1',
    });
    expect(result.id).toBe('alloc-1');
    expect(events.loanAllocated).toHaveBeenCalled();
  });

  it('reserves inventory when using spare parts', async () => {
    const { service, inventory } = build();
    const result = await service.useSparePart('admin-1', {
      repairJobId: 'rj-1',
      repairPartId: 'part-1',
      quantity: 1,
    });
    expect(result.reservationId).toBe('res-1');
    expect(inventory.reserve).toHaveBeenCalled();
  });

  it('returns dashboard counters', async () => {
    const { service } = build();
    const dash = await service.dashboard();
    expect(dash.openTickets).toBe(1);
    expect(dash.availableLoans).toBe(2);
  });
});
