import { WarrantyService } from './warranty.service';
import { AppException } from '../../../core/errors/app.exception';

describe('WarrantyService', () => {
  const plan = {
    id: 'plan-1',
    duration_months: 12,
    status: 'active',
    code: 'STD',
    name: 'Standard',
  };

  const serial = {
    id: 'serial-1',
    serial_number: 'SN-1',
    variant_id: 'var-1',
  };

  function build(overrides: Record<string, unknown> = {}) {
    const repo = {
      client: {
        warrantyRegistration: {
          create: jest.fn(async (args: { data: object }) => ({
            id: 'reg-1',
            registration_number: 'WR-1',
            status: 'active',
            start_date: new Date(),
            end_date: new Date(Date.now() + 86400000),
            ...args.data,
          })),
          update: jest.fn(),
          findMany: jest.fn(async () => []),
        },
        serialNumber: { update: jest.fn() },
        warrantyStatusHistory: { create: jest.fn() },
        warrantyClaim: {
          findFirst: jest.fn(async () => null),
          create: jest.fn(async () => ({
            id: 'claim-1',
            claim_number: 'WC-1',
            status: 'submitted',
            submitted_at: new Date(),
          })),
        },
        warrantyExtension: { create: jest.fn() },
        $transaction: jest.fn(async (fn: (tx: unknown) => unknown) =>
          fn({
            warrantyExtension: {
              create: jest.fn(async () => ({
                id: 'ext-1',
                start_date: new Date(),
                end_date: new Date(),
              })),
            },
            warrantyRegistration: { update: jest.fn() },
          }),
        ),
        order: {
          findFirst: jest.fn(async () => ({
            id: 'ord-1',
            customer_id: 'user-1',
          })),
        },
        deviceHealthReport: { findMany: jest.fn(async () => []) },
        serviceTicket: { findMany: jest.fn(async () => []) },
        rmaRequest: { findMany: jest.fn(async () => []) },
        warrantyPlan: { create: jest.fn() },
      },
      listPlans: jest.fn(async () => [plan]),
      findPlan: jest.fn(async () => plan),
      findSerial: jest.fn(async () => serial),
      findSerialByNumber: jest.fn(async () => serial),
      findActiveRegistrationBySerial: jest.fn(async () => null),
      findRegistration: jest.fn(async () => ({
        id: 'reg-1',
        customer_id: 'user-1',
        status: 'active',
        end_date: new Date(Date.now() + 86400000),
        serial_number_id: serial.id,
        serial_number: serial,
        plan,
      })),
      findClaim: jest.fn(),
      audit: jest.fn(),
    };

    const cache = {
      getOrSet: jest.fn((_k: string, fn: () => Promise<unknown>) => fn()),
      invalidatePlans: jest.fn(),
      invalidateSerial: jest.fn(),
      invalidateClaim: jest.fn(),
      invalidateDevice: jest.fn(),
    };

    const locks = {
      withLock: jest.fn((_k: string, fn: () => Promise<unknown>) => fn()),
    };

    const cases = {
      registerStore: jest.fn(),
      recordOpened: jest.fn(),
      transition: jest.fn(async () => ({ status: 'approved' })),
      timeline: jest.fn(async () => []),
    };

    const events = {
      registered: jest.fn(),
      claimCreated: jest.fn(),
      claimApproved: jest.fn(),
      claimRejected: jest.fn(),
    };

    const queues = { enqueue: jest.fn() };

    const service = new WarrantyService(
      repo as never,
      cache as never,
      locks as never,
      cases as never,
      {} as never,
      events as never,
      queues as never,
    );

    return { service, repo, cases, events, ...overrides };
  }

  it('registers warranty when serial and plan are valid', async () => {
    const { service, events } = build();
    const result = await service.register('user-1', {
      planId: 'plan-1',
      serialNumberId: 'serial-1',
    });
    expect(result.status).toBe('active');
    expect(events.registered).toHaveBeenCalled();
  });

  it('rejects duplicate active registration', async () => {
    const { service, repo } = build();
    repo.findActiveRegistrationBySerial = jest.fn(async () => ({ id: 'x' }));
    await expect(
      service.register('user-1', { planId: 'plan-1', serialNumberId: 'serial-1' }),
    ).rejects.toBeInstanceOf(AppException);
  });

  it('creates claim when warranty active', async () => {
    const { service, events, cases } = build();
    const result = await service.createClaim('user-1', {
      registrationId: 'reg-1',
      issueSummary: 'Screen cracked',
    });
    expect(result.id).toBe('claim-1');
    expect(cases.recordOpened).toHaveBeenCalled();
    expect(events.claimCreated).toHaveBeenCalled();
  });

  it('patches claim via CaseManager', async () => {
    const { service, cases, events } = build();
    const result = await service.patchClaim('admin-1', 'claim-1', {
      status: 'approved',
    });
    expect(result.status).toBe('approved');
    expect(cases.transition).toHaveBeenCalled();
    expect(events.claimApproved).toHaveBeenCalled();
  });
});
