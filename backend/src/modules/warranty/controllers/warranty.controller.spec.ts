import { WarrantyController, ServiceController } from './warranty.controller';

describe('WarrantyController', () => {
  it('delegates register / claim / plans', async () => {
    const warranty = {
      listPlans: jest.fn(async () => []),
      checkBySerial: jest.fn(async () => ({ serialNumber: 'SN' })),
      register: jest.fn(async () => ({ id: 'r1' })),
      createClaim: jest.fn(async () => ({ id: 'c1' })),
      getClaim: jest.fn(async () => ({ id: 'c1' })),
    };
    const rma = { create: jest.fn(async () => ({ id: 'rma1' })) };
    const ctrl = new WarrantyController(warranty as never, rma as never);
    await ctrl.listPlans();
    await ctrl.check('SN');
    await ctrl.register({ sub: 'u1' } as never, { planId: 'p1' } as never);
    await ctrl.createClaim({ sub: 'u1' } as never, {
      registrationId: 'r1',
      issueSummary: 'x',
    });
    await ctrl.getClaim({ sub: 'u1' } as never, 'c1');
    await ctrl.createRma({ sub: 'u1' } as never, {
      rmaType: 'doa',
    } as never);
    expect(warranty.register).toHaveBeenCalled();
    expect(rma.create).toHaveBeenCalled();
  });
});

describe('ServiceController', () => {
  it('delegates tickets and jobs', async () => {
    const ops = {
      listTickets: jest.fn(async () => []),
      createTicket: jest.fn(async () => ({ id: 't1' })),
      getRepairJob: jest.fn(async () => ({ id: 'j1' })),
      listAppointments: jest.fn(async () => []),
    };
    const ctrl = new ServiceController(ops as never);
    await ctrl.listTickets({ sub: 'u1' } as never);
    await ctrl.createTicket({ sub: 'u1' } as never, {
      serviceCenterId: 'sc',
      title: 't',
    });
    await ctrl.getJob('j1');
    await ctrl.appointments({ sub: 'u1' } as never);
    expect(ops.createTicket).toHaveBeenCalled();
  });
});
